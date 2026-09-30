import json
import sqlite3
import pytest
from app import create_app
from db import get_db, init_db
from seed import seed_products, seed_pickup, PICKUP_SOURCE


@pytest.fixture
def db(tmp_path):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key-" * 8, "DB_FILE": str(tmp_path / "checkout.db")})
    with app.app_context():
        init_db()
        seed_products()
        seed_pickup()
        connection = get_db()
        connection.execute("INSERT INTO users(id,username,email,password_hash) VALUES (1,'tester','test@example.com','hash')")
        connection.commit()
        yield connection


def order(db, **changes):
    fields = dict(reference="TEST-1", user_id=1, full_name="Test User", email="test@example.com",
                  phone="0901234567", delivery_method="pickup", pickup_store_id="yen-lang",
                  pickup_name="Store snapshot", pickup_address="Address snapshot",
                  subtotal=100000, shipping_fee=0, total=100000)
    fields.update(changes)
    return db.execute(f"INSERT INTO orders({','.join(fields)}) VALUES ({','.join('?' for _ in fields)})",
                      tuple(fields.values())).lastrowid


def test_seed_preserves_existing_data(db):
    expected = json.loads(PICKUP_SOURCE.read_text(encoding="utf-8"))
    assert [dict(r) for r in db.execute("SELECT * FROM pickup_stores ORDER BY id")] == sorted(expected, key=lambda x: x['id'])
    db.execute("UPDATE pickup_stores SET active=0,address='Edited' WHERE id='yen-lang'")
    db.commit()
    init_db()
    assert seed_pickup() == {"inserted": 0, "skipped": 4}
    assert tuple(db.execute("SELECT active,address FROM pickup_stores WHERE id='yen-lang'").fetchone()) == (0, 'Edited')
    assert db.execute("SELECT count(*) FROM users").fetchone()[0] == 1
    assert db.execute("SELECT count(*) FROM products").fetchone()[0] == 60
    assert db.execute("PRAGMA foreign_key_check").fetchall() == []


def test_bad_seed_and_rollback(db, tmp_path):
    db.execute("DELETE FROM pickup_stores")
    db.commit()
    items = json.loads(PICKUP_SOURCE.read_text(encoding="utf-8"))
    items[-1]['id'] = items[0]['id']
    source = tmp_path / 'bad.json'
    source.write_text(json.dumps(items), encoding='utf-8')
    with pytest.raises(ValueError):
        seed_pickup(source)
    assert db.execute("SELECT count(*) FROM pickup_stores").fetchone()[0] == 0
    db.execute("CREATE TRIGGER fail_seed BEFORE INSERT ON pickup_stores WHEN NEW.id='kim-ma' BEGIN SELECT RAISE(ABORT,'test'); END")
    db.commit()
    with pytest.raises(sqlite3.IntegrityError):
        seed_pickup()
    assert db.execute("SELECT count(*) FROM pickup_stores").fetchone()[0] == 0


@pytest.mark.parametrize('quantity', [0, -1, 1.5])
def test_cart_quantity(db, quantity):
    with pytest.raises(sqlite3.IntegrityError):
        db.execute("INSERT INTO cart_items VALUES (1,101,?)", (quantity,))


def test_cart_keys(db):
    db.execute("INSERT INTO cart_items VALUES (1,101,1)")
    for statement in ["INSERT INTO cart_items VALUES (1,101,2)", "INSERT INTO cart_items VALUES (999,101,1)", "INSERT INTO cart_items VALUES (1,99999,1)"]:
        with pytest.raises(sqlite3.IntegrityError):
            db.execute(statement)


@pytest.mark.parametrize('changes', [dict(total=1), dict(subtotal=-1), dict(subtotal=1.5,total=1.5),
    dict(pickup_store_id=None), dict(pickup_store_id='missing'), dict(pickup_name=''),
    dict(street_address='mixed'), dict(shipping_fee=1,total=100001), dict(status='shipped'),
    dict(delivery_method='ship',pickup_store_id=None,pickup_name=None,pickup_address=None)])
def test_invalid_order(db, changes):
    with pytest.raises(sqlite3.IntegrityError):
        order(db, **changes)


def test_ship_address_and_required_fields(db):
    fields = dict(delivery_method='ship', pickup_store_id=None, pickup_name=None, pickup_address=None,
                  province_code='01', province_name='Province', ward_code='00001', ward_name='Ward',
                  street_address='123 Street', shipping_method='standard')
    for field in ['province_code', 'province_name', 'ward_code', 'ward_name', 'street_address', 'shipping_method']:
        with pytest.raises(sqlite3.IntegrityError):
            order(db, **{**fields, field: None})
    order(db, **fields)
    assert db.execute("SELECT created_at FROM orders").fetchone()[0].endswith('Z')


def test_snapshots_and_history(db):
    oid = order(db)
    statement = "INSERT INTO order_items(order_id,product_id,product_name,product_image,unit_price,quantity) VALUES (?,101,'Original','/image.jpg',100000,1)"
    db.execute(statement, (oid,))
    db.execute("UPDATE products SET name='Changed',price=200000,original_price=NULL WHERE id=101")
    assert tuple(db.execute("SELECT product_name,unit_price FROM order_items").fetchone()) == ('Original',100000)
    for sql, args in [(statement,(oid,)), ('DELETE FROM products WHERE id=101',()), ('DELETE FROM users WHERE id=1',()), ('DELETE FROM orders WHERE id=?',(oid,)), ("DELETE FROM pickup_stores WHERE id='yen-lang'",())]:
        with pytest.raises(sqlite3.IntegrityError):
            db.execute(sql,args)


def test_payment_constraints(db):
    oid = order(db)
    for method,status,paid_at in [('paypal','pending',None),('cash','paid',None),('cash','pending','2026-09-30T00:00:00Z')]:
        with pytest.raises(sqlite3.IntegrityError):
            db.execute("INSERT INTO payments(order_id,method,amount,status,paid_at) VALUES (?,?,100000,?,?)",(oid,method,status,paid_at))
    db.execute("INSERT INTO payments(order_id,method,amount) VALUES (?,'banking',100000)",(oid,))
    with pytest.raises(sqlite3.IntegrityError):
        db.execute("INSERT INTO payments(order_id,method,amount) VALUES (?,'cash',100000)",(oid,))
    db.execute("UPDATE payments SET status='paid',paid_at='2026-09-30T00:00:00Z',transaction_reference='TX-1'")
    second = order(db,reference='TEST-2')
    with pytest.raises(sqlite3.IntegrityError):
        db.execute("INSERT INTO payments(order_id,method,amount,transaction_reference) VALUES (?,'banking',100000,'TX-1')",(second,))
