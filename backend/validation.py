import re
from flask import jsonify, request

def error(code, message, status, details=None):
    return jsonify(error={"code": code, "message": message, "details": details or {}}), status

def json_body():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return None, error("bad_json", "Invalid JSON body.", 400)
    return body, None

def credentials(body, register=False):
    problems = {}
    email = body.get("email")
    password = body.get("password")
    if not isinstance(email, str) or len(email.strip()) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email.strip()):
        problems["email"] = "Please enter a valid email address."
    if not isinstance(password, str) or not 6 <= len(password) <= 128:
        problems["password"] = "Password must contain between 6 and 128 characters."
    if register:
        username = body.get("username")
        if not isinstance(username, str) or not 1 <= len(username.strip()) <= 80:
            problems["username"] = "Username must contain between 1 and 80 characters."
    return problems

def profile(body):
    problems = {}
    if "full_name" in body and (not isinstance(body["full_name"], str) or not 1 <= len(body["full_name"].strip()) <= 100):
        problems["full_name"] = "Please enter your full name (1-100 characters)."
    if "phone" in body and (not isinstance(body["phone"], str) or not re.fullmatch(r"[+\d\s()-]{7,20}", body["phone"].strip())):
        problems["phone"] = "Please enter a valid phone number (7-20 characters)."
    return problems
