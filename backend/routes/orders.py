"""Checkout and order history. Stock, order, payment, and cart changes are atomic."""
import json
import re
import sqlite3
import uuid
from pathlib import Path
from flask import Blueprint, g, request
from auth import require_user
from db import get_db
from validation import error, json_body

bp = Blueprint("orders", __name__, url_prefix="/api")
SHIPPING_FEES = {"standard": 0, "express": 249750, "overnight": 624750}
PAYMENTS = {"card", "banking", "cash"}


def _division_names(province_code, ward_code):
    path = Path(__file__).resolve().parents[1] / "data" / "vietnam_divisions.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    province = next((item for item in data if item["code"] == province_code), None)
    if province is None:
        return None
    ward = next((item for item in province["wards"] if item["code"] == ward_code), None)
    return (province["name"], ward["name"]) if ward else None


def _order_payload(order_id, user_id):
    db = get_db()
    row = db.execute("SELECT o.*,p.method AS payment_method,p.status AS payment_status "
                     "FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id=? AND o.user_id=?",
                     (order_id, user_id)).fetchone()
    if row is None:
        return None
    result = dict(row)
    result.pop("user_id", None)
    result["items"] = [dict(item) for item in db.execute(
        "SELECT product_id,product_name,product_image,unit_price,quantity,unit_price*quantity AS line_total "
        "FROM order_items WHERE order_id=? ORDER BY id", (order_id,)).fetchall()]
    return result


def _contact_errors(body):
    details = {}
    name = body.get("full_name")
    email = body.get("email")
    phone = body.get("phone")
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100:
        details["full_name"] = "Enter a name up to 100 characters."
    if not isinstance(email, str) or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email.strip()) or len(email.strip()) > 254:
        details["email"] = "Enter a valid email address."
    if not isinstance(phone, str) or not re.fullmatch(r"[+\d\s()-]{7,20}", phone.strip()):
        details["phone"] = "Enter a valid phone number."
    return details


@bp.post("/orders")
@require_user
def create_order():
    body, failure = json_body()
    if failure is not None:
        return failure
    details = _contact_errors(body)
    delivery, payment = body.get("delivery_method"), body.get("payment_method")
    if delivery not in ("ship", "pickup"):
        details["delivery_method"] = "Choose ship or pickup."
    if not isinstance(payment, str) or payment not in PAYMENTS:
        details["payment_method"] = "Choose a supported payment method."
    delivery_data = {}
    if delivery == "ship":
        province_code, ward_code = body.get("province_code"), body.get("ward_code")
        street, shipping = body.get("street_address"), body.get("shipping_method")
        names = _division_names(province_code, ward_code) if isinstance(province_code, str) and isinstance(ward_code, str) else None
        if not names:
            details["ward_code"] = "Choose a ward belonging to the selected province or city."
        if not isinstance(street, str) or not street.strip() or len(street.strip()) > 300:
            details["street_address"] = "Enter a street address up to 300 characters."
        if not isinstance(shipping, str) or shipping not in SHIPPING_FEES:
            details["shipping_method"] = "Choose a supported shipping method."
        if names:
            delivery_data.update(province_code=province_code, province_name=names[0], ward_code=ward_code,
                                 ward_name=names[1], street_address=street.strip() if isinstance(street, str) else "",
                                 shipping_method=shipping, pickup_store_id=None, pickup_name=None, pickup_address=None)
        shipping_fee = SHIPPING_FEES.get(shipping, 0) if isinstance(shipping, str) else 0
    elif delivery == "pickup":
        store_id = body.get("pickup_store_id")
        store = get_db().execute("SELECT id,name,address FROM pickup_stores WHERE id=? AND active=1", (store_id,)).fetchone() if isinstance(store_id, str) else None
        if store is None:
            details["pickup_store_id"] = "Choose an active pickup store."
        else:
            delivery_data.update(province_code=None, province_name=None, ward_code=None, ward_name=None,
                                 street_address=None, shipping_method=None, pickup_store_id=store["id"],
                                 pickup_name=store["name"], pickup_address=store["address"])
        shipping_fee = 0
    else:
        shipping_fee = 0
    if details:
        return error("validation_failed", "Please check your order information.", 422, details)

    db, user_id = get_db(), g.user["id"]
    try:
        db.execute("BEGIN IMMEDIATE")
        cart = db.execute("SELECT p.id,p.name,p.image,p.price,p.stock,c.quantity FROM cart_items c "
                          "JOIN products p ON p.id=c.product_id WHERE c.user_id=? ORDER BY p.id", (user_id,)).fetchall()
        if not cart:
            db.rollback()
            return error("empty_cart", "Your cart is empty.", 422)
        shortages = {f"product_{row['id']}": f"Only {row['stock']} item(s) are available."
                     for row in cart if row["quantity"] > row["stock"]}
        if shortages:
            db.rollback()
            return error("out_of_stock", "Some cart items are no longer available in the requested quantity.", 409, shortages)
        subtotal = sum(row["price"] * row["quantity"] for row in cart)
        reference = "29GG-" + uuid.uuid4().hex[:10].upper()
        cursor = db.execute(
            "INSERT INTO orders(reference,user_id,full_name,email,phone,delivery_method,province_code,province_name,ward_code,ward_name,street_address,pickup_store_id,pickup_name,pickup_address,shipping_method,subtotal,shipping_fee,total,status) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')",
            (reference,user_id,body["full_name"].strip(),body["email"].strip().lower(),body["phone"].strip(),delivery,
             delivery_data["province_code"],delivery_data["province_name"],delivery_data["ward_code"],delivery_data["ward_name"],
             delivery_data["street_address"],delivery_data["pickup_store_id"],delivery_data["pickup_name"],delivery_data["pickup_address"],
             delivery_data["shipping_method"],subtotal,shipping_fee,subtotal+shipping_fee))
        order_id = cursor.lastrowid
        for item in cart:
            changed = db.execute("UPDATE products SET stock=stock-? WHERE id=? AND stock>=?",
                                 (item["quantity"], item["id"], item["quantity"])).rowcount
            if not changed:
                db.rollback()
                return error("out_of_stock", "Some cart items are no longer available.", 409,
                             {f"product_{item['id']}": "Please update the cart quantity."})
            db.execute("INSERT INTO order_items(order_id,product_id,product_name,product_image,unit_price,quantity) VALUES (?,?,?,?,?,?)",
                       (order_id,item["id"],item["name"],item["image"],item["price"],item["quantity"]))
        db.execute("INSERT INTO payments(order_id,method,amount,status) VALUES (?,?,?,'pending')",
                   (order_id,payment,subtotal+shipping_fee))
        db.execute("DELETE FROM cart_items WHERE user_id=?", (user_id,))
        db.commit()
    except sqlite3.OperationalError as exc:
        db.rollback()
        if "locked" in str(exc).lower() or "busy" in str(exc).lower():
            return error("service_unavailable", "The order service is busy. Please try again.", 503)
        raise
    except Exception:
        db.rollback()
        raise
    return {"data": _order_payload(order_id, user_id)}, 201, {"Location": f"/api/orders/{order_id}"}


@bp.get("/orders")
@require_user
def list_orders():
    page_text, size_text = request.args.get("page", "1"), request.args.get("page_size", "12")
    if not re.fullmatch(r"[0-9]{1,9}", page_text) or int(page_text) < 1:
        return error("validation_failed", "Please check the query parameters.", 422, {"page": "Must be a positive integer."})
    if not re.fullmatch(r"[0-9]{1,3}", size_text) or int(size_text) < 1 or int(size_text) > 100:
        return error("validation_failed", "Please check the query parameters.", 422, {"page_size": "Must be between 1 and 100."})
    page, size, db = int(page_text), int(size_text), get_db()
    total = db.execute("SELECT COUNT(*) AS n FROM orders WHERE user_id=?", (g.user["id"],)).fetchone()["n"]
    rows = db.execute("SELECT o.id,o.reference,o.created_at,o.total,o.status,o.delivery_method,p.method AS payment_method,p.status AS payment_status,COALESCE(SUM(oi.quantity),0) AS item_count "
                      "FROM orders o JOIN payments p ON p.order_id=o.id LEFT JOIN order_items oi ON oi.order_id=o.id "
                      "WHERE o.user_id=? GROUP BY o.id ORDER BY o.id DESC LIMIT ? OFFSET ?",
                      (g.user["id"], size, (page-1)*size)).fetchall()
    return {"data": {"items": [dict(row) for row in rows], "total": total, "page": page, "page_size": size}}


@bp.get("/orders/<int:order_id>")
@require_user
def get_order(order_id):
    result = _order_payload(order_id, g.user["id"])
    if result is None:
        return error("not_found", "Order not found.", 404)
    return {"data": result}
