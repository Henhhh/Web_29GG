"""Cart/checkout integration against isolated SQLite databases."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import json
import sqlite3
from pathlib import Path
import pytest
from flask import g
from app import create_app
from auth import issue_token
from db import get_db, init_db
from seed import seed_products, seed_pickup
from routes import orders

@pytest.fixture
def shop(tmp_path):
    app = create_app({'TESTING': True, 'SECRET_KEY': 'checkout-test-' * 5, 'DB_FILE': str(tmp_path / 'shop.db')})
    with app.app_context():
        init_db(); seed_products(); seed_pickup()
        db = get_db()
        for uid in (1, 2):
            db.execute("INSERT INTO users(id,username,email,password_hash) VALUES (?,?,?,'hash')", (uid, f'user{uid}', f'u{uid}@example.com'))
        db.execute('UPDATE products SET stock=10,price=100000,original_price=NULL WHERE id IN (101,102)')
        db.commit()
        headers = {uid: {'Authorization': 'Bearer ' + issue_token(uid)} for uid in (1, 2)}
    return app, headers

def body(**changes):
    return dict(full_name='Buyer', email='buyer@example.com', phone='0901234567', delivery_method='pickup', pickup_store_id='yen-lang', payment_method='cash', **changes)

def add(app, headers, pid=101, qty=1):
    r = app.test_client().post('/api/cart/items', headers=headers, json={'product_id': pid, 'quantity': qty})
    assert r.status_code in (200,201), r.json

def snapshot(app):
    with app.app_context():
        return {table: [tuple(r) for r in get_db().execute(f'SELECT * FROM {table} ORDER BY rowid')] for table in ('products','cart_items','orders','order_items','payments')}

@pytest.mark.parametrize('method,path', [('get','/api/cart'),('post','/api/cart/items'),('patch','/api/cart/items/101'),('delete','/api/cart/items/101'),('post','/api/orders'),('get','/api/orders'),('get','/api/orders/1')])
def test_requires_auth(shop,method,path):
    app,_=shop
    assert getattr(app.test_client(),method)(path).status_code==401

@pytest.mark.parametrize('value', [None, [], 'text', 5, True])
@pytest.mark.parametrize('path', ['/api/cart/items','/api/orders'])
def test_body_must_be_object(shop,path,value):
    app,h=shop
    before=snapshot(app)
    assert app.test_client().post(path,headers=h[1],json=value).status_code==400
    assert snapshot(app)==before

@pytest.mark.parametrize('quantity', [0,-1,1.5,True,'2',None])
def test_cart_invalid_quantity(shop,quantity):
    app,h=shop
    add(app,h[1])
    before=snapshot(app)
    c=app.test_client()
    for method,path in [('post','/api/cart/items'),('patch','/api/cart/items/101')]:
        r=getattr(c,method)(path,headers=h[1],json={'product_id':101,'quantity':quantity})
        assert r.status_code==422
    assert snapshot(app)==before

@pytest.mark.parametrize('pid', [0,-1,True,1.5,'101',None])
def test_cart_invalid_product(shop,pid):
    app,h=shop
    assert app.test_client().post('/api/cart/items',headers=h[1],json={'product_id':pid,'quantity':1}).status_code==422

def test_cart_ownership_and_stock(shop):
    app,h=shop
    add(app,h[1],qty=2)
    c=app.test_client()
    assert c.get('/api/cart',headers=h[2]).json['data']['items']==[]
    for method in ('patch','delete'):
        assert getattr(c,method)('/api/cart/items/101',headers=h[2],json={'quantity':3}).status_code==404
    before=snapshot(app)
    for method,path in [('post','/api/cart/items'),('patch','/api/cart/items/101')]:
        assert getattr(c,method)(path,headers=h[1],json={'product_id':101,'quantity':11}).status_code==409
    assert snapshot(app)==before
    assert c.patch('/api/cart/items/101',headers=h[1],json={'quantity':3}).json['data']['subtotal']==300000
    assert c.delete('/api/cart/items/101',headers=h[1]).status_code==204
    assert c.delete('/api/cart/items/101',headers=h[1]).status_code==404

@pytest.mark.parametrize('field,value', [('full_name',''),('full_name','x'*101),('email','bad'),('phone','abc'),('delivery_method','invalid'),('payment_method','paypal'),('payment_method',[]),('pickup_store_id','missing')])
def test_order_validation_has_no_side_effects(shop,field,value):
    app,h=shop
    add(app,h[1]); before=snapshot(app)
    payload=body();payload[field]=value
    r=app.test_client().post('/api/orders',headers=h[1],json=payload)
    assert r.status_code==422
    assert field in r.json['error']['details']
    assert snapshot(app)==before

def test_inactive_pickup(shop):
    app,h=shop
    with app.app_context():
        db=get_db();db.execute("UPDATE pickup_stores SET active=0 WHERE id='yen-lang'");db.commit()
    c=app.test_client()
    assert 'yen-lang' not in [s['id'] for s in c.get('/api/pickup-stores').json['data']]
    assert c.post('/api/orders',headers=h[1],json=body()).status_code==422

@pytest.mark.parametrize('method', ['cash','card','banking'])
def test_checkout_totals_ownership_and_snapshots(shop,method):
    app,h=shop
    add(app,h[1],qty=2);add(app,h[2])
    payload=body();payload.update(payment_method=method,user_id=2,total=1,shipping_fee=999,payment_status='paid')
    c=app.test_client();r=c.post('/api/orders',headers=h[1],json=payload)
    assert r.status_code==201
    data=r.json['data'];oid=data['id']
    assert (data['subtotal'],data['shipping_fee'],data['total'])==(200000,0,200000)
    assert data['payment_status']=='pending' and data['status']=='pending'
    assert c.get(f'/api/orders/{oid}',headers=h[2]).status_code==404
    assert c.get('/api/orders',headers=h[2]).json['data']['total']==0
    assert c.get('/api/orders?page_size=1',headers=h[1]).json['data']['items'][0]['id']==oid
    assert c.get('/api/cart',headers=h[1]).json['data']['items']==[]
    assert len(c.get('/api/cart',headers=h[2]).json['data']['items'])==1
    with app.app_context():
        db=get_db()
        assert db.execute('SELECT stock FROM products WHERE id=101').fetchone()[0]==8
        assert db.execute('SELECT amount FROM payments').fetchone()[0]==200000
        db.execute("UPDATE products SET name='Edited',price=200000 WHERE id=101");db.commit()
    assert c.get(f'/api/orders/{oid}',headers=h[1]).json['data']['items']==data['items']
    before=snapshot(app)
    assert c.post('/api/orders',headers=h[1],json=body()).status_code==422
    assert snapshot(app)==before

@pytest.mark.parametrize('shipping,fee', [('standard',0),('express',249750),('overnight',624750)])
def test_shipping_and_ward_validation(shop,shipping,fee):
    app,h=shop;add(app,h[1])
    divisions=json.loads((Path(__file__).parents[1]/'data/vietnam_divisions.json').read_text(encoding='utf-8'))
    p=divisions[0];w=p['wards'][0]
    payload=body();payload.update(delivery_method='ship',province_code=p['code'],ward_code=w['code'],street_address='123 Street',shipping_method=shipping,province_name='Fake')
    c=app.test_client();before=snapshot(app)
    invalid={**payload,'ward_code':divisions[1]['wards'][0]['code']}
    assert c.post('/api/orders',headers=h[1],json=invalid).status_code==422
    assert snapshot(app)==before
    r=c.post('/api/orders',headers=h[1],json=payload)
    assert r.status_code==201
    data=r.json['data']
    assert data['total']==100000+fee and data['shipping_fee']==fee
    assert data['province_name']==p['name'] and data['ward_name']==w['name']
    assert data['pickup_store_id'] is None

def test_stock_shortage_rolls_back(shop):
    app,h=shop;add(app,h[1]);add(app,h[1],102,2)
    with app.app_context():
        db=get_db();db.execute('UPDATE products SET stock=1 WHERE id=102');db.commit()
    before=snapshot(app)
    r=app.test_client().post('/api/orders',headers=h[1],json=body())
    assert r.status_code==409
    assert snapshot(app)==before

@pytest.mark.parametrize('table,event', [('order_items','INSERT'),('payments','INSERT'),('cart_items','DELETE')])
def test_failure_mid_checkout_rolls_back_everything(shop,table,event):
    app,h=shop;add(app,h[1]);add(app,h[1],102)
    with app.app_context():
        db=get_db()
        db.execute(f"CREATE TRIGGER injected_failure BEFORE {event} ON {table} BEGIN SELECT RAISE(ABORT,'injected failure'); END")
        db.commit()
    before=snapshot(app)
    with pytest.raises(sqlite3.IntegrityError,match='injected failure'):
        app.test_client().post('/api/orders',headers=h[1],json=body())
    assert snapshot(app)==before
    with app.app_context():
        db=get_db();db.execute('DROP TRIGGER injected_failure');db.commit()
    assert app.test_client().post('/api/orders',headers=h[1],json=body()).status_code==201

@pytest.mark.parametrize('same_user', [False,True])
def test_concurrent_checkout_never_oversells_or_duplicates(shop,monkeypatch,same_user):
    app,h=shop;add(app,h[1])
    if not same_user: add(app,h[2])
    with app.app_context():
        db=get_db();db.execute('UPDATE products SET stock=1 WHERE id=101');db.commit()
    ready=Barrier(2)
    def synchronized_db():
        db=get_db()
        if not g.get('checkout_ready'):
            g.checkout_ready=True;ready.wait(timeout=10)
        return db
    monkeypatch.setattr(orders,'get_db',synchronized_db)
    def checkout(uid):
        return app.test_client().post('/api/orders',headers=h[uid],json=body())
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses=list(pool.map(checkout,[1,1 if same_user else 2]))
    assert sorted(r.status_code for r in responses)==[201,422 if same_user else 409]
    with app.app_context():
        db=get_db()
        assert db.execute('SELECT stock FROM products WHERE id=101').fetchone()[0]==0
        for table in ('orders','order_items','payments'):
            assert db.execute(f'SELECT count(*) FROM {table}').fetchone()[0]==1
        assert db.execute('SELECT count(*) FROM cart_items').fetchone()[0]==(0 if same_user else 1)
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]


@pytest.mark.parametrize('query', ['page=0','page=-1','page=abc','page=1.5','page=%C2%B2','page='+'9'*30,'page_size=0','page_size=101','page_size=abc'])
def test_history_invalid_pagination(shop, query):
    app,h=shop
    response=app.test_client().get('/api/orders?'+query,headers=h[1])
    assert response.status_code==422
    assert response.json['error']['code']=='validation_failed'


def test_history_pages_and_detail_match_saved_order(shop):
    app,h=shop
    client=app.test_client()
    ids=[]
    for _ in range(3):
        add(app,h[1])
        response=client.post('/api/orders',headers=h[1],json=body())
        assert response.status_code==201
        ids.append(response.json['data']['id'])
    first=client.get('/api/orders?page=1&page_size=2',headers=h[1]).json['data']
    second=client.get('/api/orders?page=2&page_size=2',headers=h[1]).json['data']
    assert first['total']==second['total']==3
    assert [item['id'] for item in first['items']+second['items']]==list(reversed(ids))
    assert all(item['item_count']==1 for item in first['items'])
    assert client.get('/api/orders?page=3&page_size=2',headers=h[1]).json['data']['items']==[]
    assert client.get('/api/orders',headers=h[2]).json['data']['items']==[]
    assert client.get('/api/orders/999999',headers=h[1]).status_code==404
    for oid in ids:
        detail=client.get(f'/api/orders/{oid}',headers=h[1]).json['data']
        assert detail['total']==sum(item['line_total'] for item in detail['items'])+detail['shipping_fee']
        assert client.get(f'/api/orders/{oid}',headers=h[2]).status_code==404
