from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from flask import current_app, g, request
from db import get_db
from validation import error

def issue_token(user_id):
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": now + timedelta(seconds=current_app.config["JWT_TTL_SECONDS"])},
        current_app.config["SECRET_KEY"], algorithm="HS256",
    )

def require_user(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        try:
            scheme, token = header.split()
            if scheme.lower() != "bearer":
                raise ValueError()
            claims = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"],
                                options={"require": ["sub", "iat", "exp"]})
            subject = claims["sub"]
            if not isinstance(subject, str) or not subject.isascii() or not subject.isdigit() or not 0 < int(subject) < 2**63:
                raise ValueError()
            user = get_db().execute("SELECT id, username, email, full_name, phone FROM users WHERE id = ?", (int(subject),)).fetchone()
            if user is None:
                raise ValueError()
        except (ValueError, jwt.PyJWTError):
            return error("unauthenticated", "Please log in again.", 401)
        g.user = dict(user)
        return view(*args, **kwargs)
    return wrapped
