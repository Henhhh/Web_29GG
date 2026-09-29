-- Auth module only. Other feature tables will be added by their owners.
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(username) BETWEEN 1 AND 80),
    email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(email) BETWEEN 3 AND 254),
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Shared across workers; no plaintext emails/passwords stored here.
CREATE TABLE IF NOT EXISTS login_limits (
    bucket TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
