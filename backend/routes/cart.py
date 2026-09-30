"""Authenticated cart endpoints and public pickup store listing."""
import sqlite3
from flask import Blueprint, g
from auth import require_user
from db import get_db
from validation import error, json_body

bp = Blueprint("cart", __name__, url_prefix="/api")


def _cart_payload():
    rows = get_db().execute(
        "SELECT p.id AS product_id,p.name,p.image,p.price AS unit_price,c.quantity,p.stock "
        "FROM cart_items c JOIN products p ON p.id=c.product_id "
        "WHERE c.user_id=? ORDER BY p.id", (g.user["id"],)
    ).fetchall()
    items = [{**dict(row), "line_total": row["unit_price"] * row["quantity"]} for row in rows]
    return {"items": items, "subtotal": sum(item["line_total"] for item in items)}


def _positive_int(value):
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


@bp.get("/pickup-stores")
def list_pickup_stores():
    rows = get_db().execute(
        "SELECT id,name,address FROM pickup_stores WHERE active=1 ORDER BY rowid"
    ).fetchall()
    return {"data": [dict(row) for row in rows]}


@bp.get("/cart")
@require_user
def get_cart():
    return {"data": _cart_payload()}


@bp.post("/cart/items")
@require_user
def add_cart_item():
    body, failure = json_body()
    if failure is not None:
        return failure
    details = {}
    if not _positive_int(body.get("product_id")):
        details["product_id"] = "Must be a positive integer."
    if not _positive_int(body.get("quantity")):
        details["quantity"] = "Must be a positive integer."
    if details:
        return error("validation_failed", "Please check the cart item.", 422, details)
    db, uid, pid, quantity = get_db(), g.user["id"], body["product_id"], body["quantity"]
    try:
        with db:
            # Serialize writers before reading quantity/stock, including checkout.
            db.execute("BEGIN IMMEDIATE")
            product = db.execute("SELECT stock FROM products WHERE id=?", (pid,)).fetchone()
            if product is None:
                return error("not_found", "Product not found.", 404)
            existing = db.execute("SELECT quantity FROM cart_items WHERE user_id=? AND product_id=?", (uid, pid)).fetchone()
            next_quantity = quantity + (existing["quantity"] if existing else 0)
            if next_quantity > product["stock"]:
                return error("out_of_stock", "Not enough stock.", 409, {f"product_{pid}": f"Only {product['stock']} item(s) are available."})
            db.execute("INSERT INTO cart_items(user_id,product_id,quantity) VALUES (?,?,?) "
                       "ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=excluded.quantity",
                       (uid, pid, next_quantity))
            payload = _cart_payload()
    except sqlite3.OperationalError as exc:
        if "locked" in str(exc).lower() or "busy" in str(exc).lower():
            return error("service_unavailable", "The cart service is busy. Please try again.", 503)
        raise
    except sqlite3.IntegrityError:
        return error("not_found", "Product not found.", 404)
    status = 200 if existing else 201
    headers = {"Location": f"/api/cart/items/{pid}"} if status == 201 else {}
    return {"data": payload}, status, headers


@bp.patch("/cart/items/<int:product_id>")
@require_user
def update_cart_item(product_id):
    body, failure = json_body()
    if failure is not None:
        return failure
    quantity = body.get("quantity")
    if not _positive_int(quantity):
        return error("validation_failed", "Please check the cart item.", 422, {"quantity": "Must be a positive integer."})
    db = get_db()
    row = db.execute("SELECT c.quantity,p.stock FROM cart_items c JOIN products p ON p.id=c.product_id "
                     "WHERE c.user_id=? AND c.product_id=?", (g.user["id"], product_id)).fetchone()
    if row is None:
        return error("not_found", "Cart item not found.", 404)
    if quantity > row["stock"]:
        return error("out_of_stock", "Not enough stock.", 409, {f"product_{product_id}": f"Only {row['stock']} item(s) are available."})
    with db:
        db.execute("UPDATE cart_items SET quantity=? WHERE user_id=? AND product_id=?", (quantity, g.user["id"], product_id))
    return {"data": _cart_payload()}


@bp.delete("/cart/items/<int:product_id>")
@require_user
def delete_cart_item(product_id):
    db = get_db()
    with db:
        cursor = db.execute("DELETE FROM cart_items WHERE user_id=? AND product_id=?", (g.user["id"], product_id))
    if cursor.rowcount == 0:
        return error("not_found", "Cart item not found.", 404)
    return "", 204
