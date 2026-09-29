import hashlib
import hmac
import sqlite3
import time
from flask import Blueprint, current_app, g, request
from werkzeug.security import generate_password_hash, check_password_hash
from auth import issue_token, require_user
from db import get_db
from validation import credentials, error, json_body, profile

bp = Blueprint("accounts", __name__, url_prefix="/api")

def user_payload(row):
    return {key: row[key] for key in ("id", "username", "email", "full_name", "phone")}

def limited(email):
    now = int(time.time())
    key = current_app.config["SECRET_KEY"].encode()
    buckets = [hmac.new(key, value.encode(), hashlib.sha256).hexdigest()
               for value in ("email:" + email, "ip:" + (request.remote_addr or "unknown"))]
    db = get_db()
    with db:
        db.execute("DELETE FROM login_limits WHERE expires_at <= ?", (now,))
        for bucket in buckets:
            db.execute("INSERT INTO login_limits(bucket, attempts, expires_at) VALUES (?, 1, ?) "
                       "ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1",
                       (bucket, now + current_app.config["LOGIN_WINDOW_SECONDS"]))
        return any(db.execute("SELECT attempts FROM login_limits WHERE bucket = ?", (bucket,)).fetchone()["attempts"]
                   > current_app.config["LOGIN_LIMIT"] for bucket in buckets)

@bp.post("/auth/register")
def register():
    body, failure = json_body()
    if failure is not None:
        return failure
    problems = credentials(body, register=True)
    if problems:
        return error("validation_failed", "Please check your information.", 422, problems)
    email, username = body["email"].strip().lower(), body["username"].strip().lower()
    db = get_db()
    for field, value, code, message in (
        ("email", email, "email_already_registered", "An account with this email already exists."),
        ("username", username, "username_taken", "This username is already taken."),
    ):
        if db.execute(f"SELECT id FROM users WHERE {field} = ?", (value,)).fetchone():
            return error(code, message, 409, {field: message})
    try:
        with db:
            cursor = db.execute("INSERT INTO users(username, email, password_hash) VALUES (?, ?, ?)",
                                (username, email, generate_password_hash(body["password"])))
    except sqlite3.IntegrityError:
        if db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone():
            return error("email_already_registered", "An account with this email already exists.", 409)
        return error("username_taken", "This username is already taken.", 409)
    row = db.execute("SELECT id, username, email, full_name, phone FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"data": user_payload(row)}, 201, {"Location": "/api/me"}

@bp.post("/auth/login")
def login():
    body, failure = json_body()
    if failure is not None:
        return failure
    problems = credentials(body)
    if problems:
        return error("validation_failed", "Please check your information.", 422, problems)
    email = body["email"].strip().lower()
    if limited(email):
        return error("too_many_requests", "Please try again later.", 429)
    row = get_db().execute("SELECT id, username, email, password_hash, full_name, phone FROM users WHERE email = ?", (email,)).fetchone()
    valid = check_password_hash(row["password_hash"] if row else current_app.config["DUMMY_PASSWORD_HASH"], body["password"])
    if row is None or not valid:
        return error("invalid_credentials", "Email or password is incorrect.", 401)
    return {"data": {"token": issue_token(row["id"]), "user": user_payload(row)}}

@bp.get("/me")
@require_user
def me():
    return {"data": g.user}

@bp.patch("/me")
@require_user
def update_me():
    body, failure = json_body()
    if failure is not None:
        return failure
    problems = profile(body)
    if problems:
        return error("validation_failed", "Please check your information.", 422, problems)
    db = get_db()
    with db:
        for field in ("full_name", "phone"):
            if field in body:
                db.execute(f"UPDATE users SET {field} = ? WHERE id = ?", (body[field].strip(), g.user["id"]))
    row = db.execute("SELECT id, username, email, full_name, phone FROM users WHERE id = ?", (g.user["id"],)).fetchone()
    return {"data": user_payload(row)}
