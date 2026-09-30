"""Public product catalog, category, and brand endpoints."""
import json
import math
import re

from flask import Blueprint, request

from db import get_db
from validation import error

bp = Blueprint("products", __name__, url_prefix="/api")


def _positive_int(value):
    return bool(re.fullmatch(r"[0-9]+", value or "")) and int(value) > 0


def _number(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _product(row):
    item = dict(row)
    item["specs"] = json.loads(item.pop("specs_json"))
    item["connections"] = [
        connection["connection"]
        for connection in get_db().execute(
            "SELECT connection FROM product_connections WHERE product_id = ? ORDER BY rowid",
            (item["id"],),
        )
    ]
    return item


@bp.get("/products")
def list_products():
    args = request.args
    problems = {}
    page_text, size_text = args.get("page", "1"), args.get("page_size", "12")
    if not _positive_int(page_text):
        problems["page"] = "Must be a positive integer."
    if not _positive_int(size_text) or (size_text.isdigit() and int(size_text) > 100):
        problems["page_size"] = "Must be a positive integer no greater than 100."

    ints = {}
    for key in ("min_price", "max_price", "max_price_exclusive"):
        if key in args:
            value = args.get(key, "")
            if not re.fullmatch(r"[0-9]+", value):
                problems[key] = "Must be a non-negative integer."
            else:
                ints[key] = int(value)
    refresh_rates = []
    if "refresh_rate" in args:
        for value in args.getlist("refresh_rate"):
            if not re.fullmatch(r"[0-9]+", value) or int(value) <= 0:
                problems["refresh_rate"] = "Must contain positive integers."
            else:
                refresh_rates.append(int(value))
    if "screen_size" in args:
        raw = args.getlist("screen_size")
        sizes = [_number(value) for value in raw]
        if any(value is None or value <= 0 for value in sizes):
            problems["screen_size"] = "Must contain positive numbers."
    if "max_price" in args and "max_price_exclusive" in args:
        problems["max_price_exclusive"] = "Cannot be combined with max_price."
    upper = ints.get("max_price", ints.get("max_price_exclusive"))
    if "min_price" in ints and upper is not None and ints["min_price"] > upper:
        problems["min_price"] = "Must not exceed the maximum price."
    if problems:
        return error("validation_failed", "Please check the query parameters.", 422, problems)

    page, page_size = int(page_text), int(size_text)
    clauses, params = [], []
    query = args.get("q", "").strip()
    if query:
        pattern = "%" + query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        clauses.append("(p.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR c.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR b.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR EXISTS (SELECT 1 FROM json_each(p.specs_json) s WHERE s.value LIKE ? ESCAPE '\\' COLLATE NOCASE))")
        params.extend([pattern] * 4)

    for key, column in (("category", "c.slug"), ("brand", "b.name"), ("connection", "pc.connection")):
        values = list(dict.fromkeys(value.strip() for value in args.getlist(key) if value.strip()))
        if values:
            placeholders = ",".join("?" for _ in values)
            if key == "connection":
                clauses.append(f"EXISTS (SELECT 1 FROM product_connections pc WHERE pc.product_id = p.id AND pc.connection IN ({placeholders}))")
            else:
                clauses.append(f"{column} COLLATE NOCASE IN ({placeholders})")
            params.extend(values)

    if "screen_size" in args:
        values = list(dict.fromkeys(float(value) for value in args.getlist("screen_size")))
        clauses.append("p.screen_size IN (" + ",".join("?" for _ in values) + ")")
        params.extend(values)
    if refresh_rates:
        refresh_rates = list(dict.fromkeys(refresh_rates))
        clauses.append("p.refresh_rate IN (" + ",".join("?" for _ in refresh_rates) + ")")
        params.extend(refresh_rates)
    if "min_price" in ints:
        clauses.append("p.price >= ?")
        params.append(ints["min_price"])
    if "max_price" in ints:
        clauses.append("p.price <= ?")
        params.append(ints["max_price"])
    if "max_price_exclusive" in ints:
        clauses.append("p.price < ?")
        params.append(ints["max_price_exclusive"])

    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    joins = " FROM products p JOIN categories c ON c.id=p.category_id JOIN brands b ON b.id=p.brand_id"
    db = get_db()
    total = db.execute("SELECT COUNT(*)" + joins + where, params).fetchone()[0]
    rows = db.execute(
        "SELECT p.*, c.slug AS category, b.name AS brand" + joins + where + " ORDER BY p.id LIMIT ? OFFSET ?",
        [*params, page_size, (page - 1) * page_size],
    ).fetchall()
    return {"data": {"items": [_product(row) for row in rows], "total": total, "page": page, "page_size": page_size}}


@bp.get("/products/<int:product_id>")
def get_product(product_id):
    row = get_db().execute(
        "SELECT p.*, c.slug AS category, b.name AS brand FROM products p "
        "JOIN categories c ON c.id=p.category_id JOIN brands b ON b.id=p.brand_id WHERE p.id=?",
        (product_id,),
    ).fetchone()
    if row is None:
        return error("not_found", "Product not found.", 404)
    return {"data": _product(row)}


@bp.get("/categories")
def list_categories():
    rows = get_db().execute("SELECT id, name, slug FROM categories ORDER BY id").fetchall()
    return {"data": [dict(row) for row in rows]}


@bp.get("/brands")
def list_brands():
    rows = get_db().execute("SELECT id, name FROM brands ORDER BY id").fetchall()
    return {"data": [dict(row) for row in rows]}
