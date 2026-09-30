from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import sqlite3

import pytest
from app import create_app
from auth import issue_token
from db import get_db, init_db
from seed import seed_products
from routes import cart


@pytest.fixture
def shop(tmp_path):
    app = create_app({'TESTING': True, 'SECRET_KEY': 'cart-test-' * 8,
                      'DB_FILE': str(tmp_path / 'cart.db')})
    with app.app_context():
        init_db()
        seed_products()
        db = get_db()
        db.execute("INSERT INTO users(id,username,email,password_hash) VALUES (1,'test','test@example.com','test-hash')")
        db.commit()
        headers = {'Authorization': 'Bearer ' + issue_token(1)}
    return app, headers


@pytest.mark.parametrize('initial,stock,successes', [(0, 20, 8), (3, 20, 8), (3, 5, 2)])
def test_concurrent_adds_preserve_each_increment(shop, monkeypatch, initial, stock, successes):
    app, headers = shop
    with app.app_context():
        db = get_db()
        db.execute('UPDATE products SET stock=? WHERE id=101', (stock,))
        if initial:
            db.execute('INSERT INTO cart_items VALUES (1,101,?)', (initial,))
        db.commit()

    # Separate request connections meet just before their first cart DB operation.
    ready = Barrier(8)
    from flask import g

    def synchronized_db():
        db = get_db()
        if not g.get('cart_test_ready'):
            g.cart_test_ready = True
            ready.wait(timeout=10)
        return db

    monkeypatch.setattr(cart, 'get_db', synchronized_db)

    def add(_):
        with app.test_client() as client:
            return client.post('/api/cart/items', headers=headers,
                               json={'product_id': 101, 'quantity': 1})

    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(pool.map(add, range(8)))
    assert sum(r.status_code in (200, 201) for r in responses) == successes
    assert sum(r.status_code == 409 for r in responses) == 8 - successes
    quantities = sorted(r.json['data']['items'][0]['quantity'] for r in responses if r.status_code in (200, 201))
    assert quantities == list(range(initial + 1, initial + successes + 1))
    with app.app_context():
        assert get_db().execute('SELECT quantity FROM cart_items WHERE user_id=1 AND product_id=101').fetchone()[0] == initial + successes
        assert get_db().execute('SELECT stock FROM products WHERE id=101').fetchone()[0] == stock


def test_busy_cart_returns_503_without_changes(shop, monkeypatch):
    app, headers = shop
    def short_timeout_db():
        db = get_db()
        db.execute('PRAGMA busy_timeout=25')
        return db
    monkeypatch.setattr(cart, 'get_db', short_timeout_db)
    lock = sqlite3.connect(app.config['DB_FILE'])
    try:
        lock.execute('BEGIN IMMEDIATE')
        response = app.test_client().post('/api/cart/items', headers=headers,
                                          json={'product_id': 101, 'quantity': 1})
        assert response.status_code == 503
        assert response.json['error']['code'] == 'service_unavailable'
    finally:
        lock.rollback()
        lock.close()
    with app.app_context():
        assert get_db().execute('SELECT count(*) FROM cart_items').fetchone()[0] == 0


def test_rejected_add_releases_transaction(shop):
    app, headers = shop
    client = app.test_client()
    for product_id, quantity, status in [(999999, 1, 404), (101, 999999, 409), (101, 1, 201)]:
        assert client.post('/api/cart/items', headers=headers,
                           json={'product_id': product_id, 'quantity': quantity}).status_code == status
