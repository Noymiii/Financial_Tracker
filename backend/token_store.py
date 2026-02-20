"""
CEIS Token Store — Simple in-memory storage for link tokens.
In a production app, use Redis or a database table.
"""

from datetime import datetime, timedelta
import random
import string

_tokens = {}  # token -> {user_id, expires_at}


def generate_token(user_id: str) -> str:
    """Generate a 6-digit token for the user."""
    # Cleanup expired tokens first
    cleanup_tokens()
    
    token = ''.join(random.choices(string.digits, k=6))
    _tokens[token] = {
        "user_id": user_id,
        "expires_at": datetime.now() + timedelta(minutes=10)
    }
    return token


def verify_and_consume_token(token: str) -> str | None:
    """Check if token is valid, return user_id, and delete token."""
    if token not in _tokens:
        return None
    
    data = _tokens[token]
    if datetime.now() > data["expires_at"]:
        del _tokens[token]
        return None
        
    user_id = data["user_id"]
    del _tokens[token]
    return user_id


def cleanup_tokens():
    """Remove expired tokens."""
    now = datetime.now()
    expired = [t for t, d in _tokens.items() if now > d["expires_at"]]
    for t in expired:
        del _tokens[t]
