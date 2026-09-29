# 29GG Auth backend

Implemented: Flask + sqlite3, registration, JWT login, GET/PATCH /api/me.
Products/cart/orders routes and seed.py remain placeholders. This step creates only users and login_limits, not the complete commerce schema.

## Run on Windows PowerShell

From the repository root:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
backend/.venv/Scripts/python.exe -c "import secrets; print(secrets.token_hex(32))"
```

Paste that generated value into SECRET_KEY in backend/.env. Do not publish it.
DB_FILE is relative to backend/ unless absolute. python-dotenv loads backend/.env.
Do not overwrite an existing .env on subsequent runs.

```powershell
backend/.venv/Scripts/python.exe -m flask --app backend/app.py init-db
backend/.venv/Scripts/python.exe -m flask --app backend/app.py run --port 5000
```

In another terminal: cd frontend, then npm run dev. Restart Vite after proxy changes.
Vite proxies /api to 127.0.0.1:5000; no wildcard CORS is needed.
Production must forward /api to Flask on the same origin and use HTTPS and a production WSGI server.

## Test

```powershell
backend/.venv/Scripts/python.exe -m pytest -q backend/tests
```

Tests create fresh temporary databases; no real accounts are used.
init-db is additive and preserves existing users; it is not a migration tool.
Do not point it at the archive's SQLAlchemy users.db: migrate that database separately if its accounts must be retained.

## API and flow

- POST /api/auth/register: username, email, password -> 201 data user. Does not sign in.
- POST /api/auth/login: email, password -> 200 data {token, user}.
- GET /api/me: Bearer token -> current user.
- PATCH /api/me: Bearer token, full_name and/or phone -> updated user.
- GET /api/health: basic process health (not a database readiness check).

JWT uses HS256, sub=user ID, iat and exp; expiry is 2 hours.
Secret is required (minimum 32 characters; generate randomly).
Frontend stores token in memory only: refresh requires login; logout clears it.
Logout does not revoke a copied token before expiry.
Profile is persisted in SQLite and returned at the next login; checkout autofill uses it.
Cart and checkout remain frontend demos, not protected order APIs yet.

Validation: JSON object required; email format; password 6-128 characters (not trimmed);
username 1-80 characters, normalized lowercase; full_name 1-100; phone 7-20 allowed characters.
Unknown profile fields are ignored; user ID and email cannot be changed via PATCH /me.
Errors use {error:{code,message,details}}; incorrect email/password share the same 401.
Login is limited to 10 valid-format attempts per 15 minutes per email and direct client IP,
including successful attempts. Buckets are stored in SQLite and identifiers are HMACed.
Behind a reverse proxy, configure trusted proxy handling before deployment; forwarded headers
are not trusted automatically. Rate limiting currently covers login, not registration.

## Ownership

- app.py: application factory/config and route registration.
- db.py/schema.sql: shared SQLite connection and Auth tables.
- auth.py: shared JWT helper/decorator; routes use g.user after @require_user.
- validation.py: shared errors and Auth/profile input checks.
- routes/auth.py: register, login, profile endpoints.
- tests/test_auth.py: API, persistence, validation, ownership, JWT and rate-limit tests.

Do not copy the archive's .venv, templates, session login, models.py or users.db.
No SQLAlchemy or Flask-Login dependency is used. Keep .env, .venv and database files out of Git.

## References

- Flask application factory: https://flask.palletsprojects.com/en/stable/tutorial/factory/
- Flask test client: https://flask.palletsprojects.com/en/stable/testing/
- PyJWT verification: https://pyjwt.readthedocs.io/en/latest/api.html
