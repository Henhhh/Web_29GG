import json
import sqlite3
import pytest
from app import create_app
from db import get_db, init_db
from seed import seed_products, SOURCE

@pytest.fixture
def app(tmp_path):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key-" * 8, "DB_FILE": str(tmp_path / "seed.db")})
    with app.app_context():
        init_db()
        yield app

def test_seed_matches_source_and_preserves_auth(app):
    db = get_db()
    db.execute("INSERT INTO users(username,email,password_hash) VALUES ('test','test@example.com','hash')")
    db.commit()
    assert seed_products() == {"inserted": 60, "skipped": 0}
    assert db.execute("SELECT count(*) FROM categories").fetchone()[0] == 6
    assert db.execute("SELECT count(*) FROM users").fetchone()[0] == 1
    assert db.execute("PRAGMA foreign_key_check").fetchall() == []
    for item in json.loads(SOURCE.read_text(encoding="utf-8")):
        row = db.execute("SELECT p.*,b.name AS brand,c.slug AS category FROM products p JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id WHERE p.id=?", (item["id"],)).fetchone()
        for field in ("name", "price", "stock", "image", "brand", "category"):
            assert row[field] == item[field]
        assert json.loads(row["specs_json"]) == item["specs"]
        connections = {r[0] for r in db.execute("SELECT connection FROM product_connections WHERE product_id=?", (item["id"],))}
        assert connections == set(item["connections"])
        if "size" in item:
            assert row["screen_size"] == float(item["size"].removesuffix('"'))
            assert row["refresh_rate"] == int(item["refreshRate"].removesuffix("Hz"))

def test_reseed_does_not_reset_stock_or_metadata(app):
    seed_products()
    db = get_db()
    db.execute("UPDATE products SET stock=0,name='Edited' WHERE id=101")
    db.commit()
    init_db()
    assert seed_products() == {"inserted": 0, "skipped": 60}
    row = db.execute("SELECT stock,name FROM products WHERE id=101").fetchone()
    assert tuple(row) == (0, "Edited")

@pytest.mark.parametrize("field,value", [("stock", None), ("price", True), ("category", "unknown"), ("connections", ["invalid"])])
def test_bad_source_writes_nothing(app, tmp_path, field, value):
    items = json.loads(SOURCE.read_text(encoding="utf-8"))
    items[-1][field] = value
    path = tmp_path / "bad.json"
    path.write_text(json.dumps(items), encoding="utf-8")
    with pytest.raises(ValueError):
        seed_products(path)
    assert get_db().execute("SELECT count(*) FROM categories").fetchone()[0] == 0

def test_write_failure_rolls_back_whole_seed(app):
    db = get_db()
    db.execute("CREATE TRIGGER fail_seed BEFORE INSERT ON products WHEN NEW.id=102 BEGIN SELECT RAISE(ABORT,'test failure'); END")
    db.commit()
    with pytest.raises(sqlite3.IntegrityError):
        seed_products()
    for table in ("products", "categories", "brands", "product_connections"):
        assert db.execute(f"SELECT count(*) FROM {table}").fetchone()[0] == 0

def test_constraints(app):
    seed_products()
    db = get_db()
    for sql in ("UPDATE products SET stock=-1 WHERE id=101",
                "UPDATE products SET price=1.5 WHERE id=101",
                "UPDATE products SET category_id=9999 WHERE id=101",
                "UPDATE products SET specs_json='{}' WHERE id=101",
                "DELETE FROM categories WHERE slug='mouse'"):
        with pytest.raises(sqlite3.IntegrityError):
            with db:
                db.execute(sql)
