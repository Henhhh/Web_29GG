"""Seed products and pickup stores without modifying existing rows."""
import json
import math
from collections import Counter
from pathlib import Path
from db import get_db

PICKUP_SOURCE = Path(__file__).parent / "data" / "pickup_stores.json"


def seed_pickup(path=PICKUP_SOURCE):
    items = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(items, list) or len(items) != 4:
        raise ValueError("Pickup source must contain four stores.")
    ids = set()
    for item in items:
        if not isinstance(item, dict) or any(
            not isinstance(item.get(key), str) or not item[key].strip()
            for key in ("id", "name", "address")
        ):
            raise ValueError("Pickup id, name and address must be nonempty strings.")
        if item["id"] != item["id"].strip() or item["id"] in ids:
            raise ValueError("Pickup IDs must be unique and trimmed.")
        if type(item.get("active")) is not int or item["active"] not in (0, 1):
            raise ValueError("Pickup active must be integer 0 or 1.")
        ids.add(item["id"])
    db = get_db()
    inserted = 0
    with db:
        db.execute("BEGIN IMMEDIATE")
        for item in items:
            result = db.execute(
                "INSERT INTO pickup_stores(id,name,address,active) VALUES (?,?,?,?) "
                "ON CONFLICT(id) DO NOTHING",
                (item["id"], item["name"], item["address"], item["active"]),
            )
            inserted += result.rowcount
    return {"inserted": inserted, "skipped": len(items) - inserted}

CATEGORIES = {
    "mouse": "Mouse", "keyboard": "Keyboards", "monitor": "Monitors",
    "headphone": "Headphones", "mic": "Microphones", "mousepad": "Pads",
}
CONNECTIONS = {"USB", "USB-C", "2.4GHz", "Bluetooth", "XLR", "Có dây"}
SOURCE = Path(__file__).parent / "data" / "products.json"

def positive_integer(value):
    return type(value) is int and value > 0

def load_products(path=SOURCE):
    items = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(items, list) or len(items) != 60:
        raise ValueError("Seed must contain exactly 60 products.")
    ids, counts = set(), Counter()
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Each product must be an object.")
        pid = item.get("id")
        if not positive_integer(pid) or pid in ids:
            raise ValueError("Product IDs must be unique positive integers.")
        ids.add(pid)
        category = item.get("category")
        if not isinstance(category, str) or category not in CATEGORIES:
            raise ValueError(f"Product {pid}: invalid category.")
        counts[category] += 1
        for field in ("name", "brand", "image"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                raise ValueError(f"Product {pid}: invalid {field}.")
        if not positive_integer(item.get("price")):
            raise ValueError(f"Product {pid}: invalid VND price.")
        stock = item.get("stock")
        if type(stock) is not int or stock < 0:
            raise ValueError(f"Product {pid}: stock must be a non-negative integer.")
        original = item.get("originalPrice")
        if original is not None and (not positive_integer(original) or original < item["price"]):
            raise ValueError(f"Product {pid}: invalid original price.")
        for field in ("specs", "connections"):
            if not isinstance(item.get(field), list) or any(not isinstance(v, str) for v in item[field]):
                raise ValueError(f"Product {pid}: {field} must contain strings.")
        if set(item["connections"]) - CONNECTIONS:
            raise ValueError(f"Product {pid}: unknown connection.")
        if item.get("badge") is not None and not isinstance(item["badge"], str):
            raise ValueError(f"Product {pid}: invalid badge.")
        size, rate = item.get("size"), item.get("refreshRate")
        if category != "monitor" and (size is not None or rate is not None):
            raise ValueError(f"Product {pid}: monitor fields on another category.")
        try:
            size = None if size is None else float(size.removesuffix('"'))
            rate = None if rate is None else int(rate.removesuffix("Hz"))
            if size is not None and (not math.isfinite(size) or size <= 0):
                raise ValueError()
            if rate is not None and rate <= 0:
                raise ValueError()
        except (ValueError, TypeError, AttributeError):
            raise ValueError(f"Product {pid}: invalid screen size or refresh rate.") from None
        item["_screen_size"], item["_refresh_rate"] = size, rate
    if counts != Counter({slug: 10 for slug in CATEGORIES}):
        raise ValueError("Each of the six categories must contain 10 products.")
    return items

def seed_products(path=SOURCE):
    items = load_products(path)  # Validate everything before writing.
    db = get_db()
    inserted = 0
    with db:
        # Acquire the write lock before checking IDs to serialize concurrent seeds.
        db.execute("BEGIN IMMEDIATE")
        for slug, name in CATEGORIES.items():
            db.execute("INSERT INTO categories(name, slug) VALUES (?, ?) ON CONFLICT(slug) DO NOTHING", (name, slug))
        for item in items:
            if db.execute("SELECT id FROM products WHERE id = ?", (item["id"],)).fetchone():
                continue  # Never reset stock, prices, metadata or connections.
            brand = item["brand"].strip()
            db.execute("INSERT INTO brands(name) VALUES (?) ON CONFLICT(name) DO NOTHING", (brand,))
            brand_id = db.execute("SELECT id FROM brands WHERE name = ? COLLATE NOCASE", (brand,)).fetchone()["id"]
            category_id = db.execute("SELECT id FROM categories WHERE slug = ?", (item["category"],)).fetchone()["id"]
            db.execute(
                "INSERT INTO products(id,name,category_id,brand_id,price,original_price,image,stock,specs_json,screen_size,refresh_rate,badge) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (item["id"], item["name"].strip(), category_id, brand_id, item["price"], item.get("originalPrice"),
                 item["image"], item["stock"], json.dumps(item["specs"], ensure_ascii=False),
                 item["_screen_size"], item["_refresh_rate"], item.get("badge")),
            )
            db.executemany("INSERT INTO product_connections(product_id,connection) VALUES (?,?)",
                           [(item["id"], connection) for connection in dict.fromkeys(item["connections"])])
            inserted += 1
    return {"inserted": inserted, "skipped": len(items) - inserted}
