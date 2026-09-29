import sqlite3
import time
import jwt
import pytest
from werkzeug.security import check_password_hash
from app import create_app
from db import get_db, init_db

@pytest.fixture
def app(tmp_path):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-" * 4, "DB_FILE": str(tmp_path / "test.db")})
    with app.app_context():
        init_db()
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def register(client, username="player", email="player@example.com"):
    return client.post("/api/auth/register", json={"username": username, "email": email, "password": "secret123"})

def login(client, email="player@example.com", password="secret123"):
    return client.post("/api/auth/login", json={"email": email, "password": password})

def headers(client):
    return {"Authorization": "Bearer " + login(client).json["data"]["token"]}

def test_register_login_and_hash(client, app):
    response = register(client, " Player ", " PLAYER@example.com ")
    assert response.status_code == 201
    assert response.json["data"]["username"] == "player"
    assert "password_hash" not in response.json["data"]
    with app.app_context():
        row = get_db().execute("SELECT * FROM users").fetchone()
        assert row["password_hash"] != "secret123"
        assert check_password_hash(row["password_hash"], "secret123")
    response = login(client)
    assert response.status_code == 200
    claims = jwt.decode(response.json["data"]["token"], app.config["SECRET_KEY"], algorithms=["HS256"])
    assert claims["exp"] - claims["iat"] == 7200
    assert set(claims) == {"sub", "iat", "exp"}
    assert client.get("/api/me", headers=headers(client)).json["data"]["email"] == "player@example.com"

@pytest.mark.parametrize("body", [None, [], ["x"], "text", 12, True])
def test_non_object(client, body):
    response = client.post("/api/auth/register", json=body)
    assert response.status_code == 400
    assert response.json["error"]["code"] == "bad_json"

@pytest.mark.parametrize("path", ["/api/auth/register", "/api/auth/login"])
def test_validation_collects_fields(client, path):
    response = client.post(path, json={"username": 9, "email": "wrong", "password": 123})
    assert response.status_code == 422
    assert {"email", "password"} <= response.json["error"]["details"].keys()

def test_duplicates(client):
    register(client)
    response = client.post("/api/auth/register", json={"username": "other", "email": "PLAYER@example.com", "password": "different"})
    assert response.status_code == 409
    assert response.json["error"]["code"] == "email_already_registered"
    response = register(client, "PLAYER", "other@example.com")
    assert response.status_code == 409
    assert response.json["error"]["code"] == "username_taken"

def test_common_login_error(client):
    register(client)
    wrong_password = login(client, password="wrongpassword")
    unknown_email = login(client, email="unknown@example.com")
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json == unknown_email.json

@pytest.mark.parametrize("kind", ["missing", "junk", "expired", "wrong_key", "no_exp", "missing_user", "huge_sub"])
def test_bad_tokens(client, app, kind):
    claims = {"sub": "1", "iat": int(time.time()), "exp": int(time.time()) + 60}
    key = app.config["SECRET_KEY"]
    register(client)
    if kind == "expired": claims["exp"] = int(time.time()) - 10
    if kind == "wrong_key": key = "different-key-" * 4
    if kind == "no_exp": del claims["exp"]
    if kind == "missing_user": claims["sub"] = "99"
    if kind == "huge_sub": claims["sub"] = "9" * 100
    token = jwt.encode(claims, key, algorithm="HS256")
    auth = {} if kind == "missing" else {"Authorization": "Bearer " + ("garbage" if kind == "junk" else token)}
    response = client.get("/api/me", headers=auth)
    assert response.status_code == 401
    assert response.json["error"]["code"] == "unauthenticated"

def test_profile_is_owned_and_persisted(client, app):
    register(client)
    register(client, "second", "second@example.com")
    response = client.patch("/api/me", headers=headers(client), json={"full_name": " Player One ", "phone": "0977205458", "id": 2, "email": "changed@example.com", "password_hash": "bad"})
    assert response.status_code == 200
    assert response.json["data"]["full_name"] == "Player One"
    assert response.json["data"]["email"] == "player@example.com"
    with app.app_context():
        assert get_db().execute("SELECT full_name FROM users WHERE id=2").fetchone()[0] == ""
    assert client.get("/api/me", headers=headers(client)).json["data"]["phone"] == "0977205458"

def test_profile_validation(client):
    register(client)
    response = client.patch("/api/me", headers=headers(client), json={"full_name": "", "phone": "abc"})
    assert response.status_code == 422
    assert set(response.json["error"]["details"]) == {"full_name", "phone"}

def test_rate_limit(client, app):
    app.config["LOGIN_LIMIT"] = 2
    assert login(client).status_code == 401
    assert login(client).status_code == 401
    assert login(client).status_code == 429

def test_schema_idempotent_and_unique(client, app):
    register(client)
    with app.app_context():
        init_db()
        assert get_db().execute("SELECT count(*) FROM users").fetchone()[0] == 1
        assert get_db().execute("PRAGMA foreign_keys").fetchone()[0] == 1
        with pytest.raises(sqlite3.IntegrityError):
            get_db().execute("INSERT INTO users(username,email,password_hash) VALUES(?,?,?)", ("PLAYER", "other@example.com", "hash"))

def test_secret_required():
    with pytest.raises(RuntimeError):
        create_app({"SECRET_KEY": ""})
