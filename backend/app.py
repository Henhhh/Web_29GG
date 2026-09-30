import os
from pathlib import Path
from flask import Flask
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException
from werkzeug.security import generate_password_hash
from db import init_app
from validation import error

def create_app(test_config=None):
    load_dotenv(Path(__file__).with_name(".env"))
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY"),
        DB_FILE=os.environ.get("DB_FILE", "instance/29gg.db"),
        JWT_TTL_SECONDS=7200,
        LOGIN_LIMIT=10,
        LOGIN_WINDOW_SECONDS=900,
        MAX_CONTENT_LENGTH=16384,
    )
    if test_config:
        app.config.update(test_config)
    secret = app.config["SECRET_KEY"]
    if not isinstance(secret, str) or len(secret) < 32:
        raise RuntimeError("Set SECRET_KEY to a random value of at least 32 characters.")
    path = Path(app.config["DB_FILE"])
    if not path.is_absolute():
        path = Path(__file__).parent / path
    app.config["DB_FILE"] = str(path)
    app.config["DUMMY_PASSWORD_HASH"] = generate_password_hash("not-a-real-account-password")
    init_app(app)
    from routes.auth import bp as auth_bp
    from routes.products import bp as products_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)

    @app.get("/api/health")
    def health():
        return {"data": {"status": "ok"}}

    @app.errorhandler(HTTPException)
    def http_error(exc):
        return error("not_found" if exc.code == 404 else "http_error", exc.description, exc.code)

    @app.after_request
    def no_cache(response):
        if response.is_json:
            response.headers["Cache-Control"] = "no-store"
        return response
    return app
