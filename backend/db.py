import sqlite3
from pathlib import Path
import click
from flask import current_app, g

def get_db():
    if "db" not in g:
        path = Path(current_app.config["DB_FILE"])
        path.parent.mkdir(parents=True, exist_ok=True)
        g.db = sqlite3.connect(path, timeout=10)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

def close_db(_error=None):
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()

def init_db():
    get_db().executescript(Path(__file__).with_name("schema.sql").read_text(encoding="utf-8"))

def init_app(app):
    app.teardown_appcontext(close_db)
    @app.cli.command("init-db")
    def command():
        init_db()
        click.echo("Auth tables initialized; existing rows preserved.")
