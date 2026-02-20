"""
CEIS Auth Service — JWT verification for Supabase tokens.
Single responsibility: decode and validate JWTs.
"""

import base64
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from backend.config import get_settings, Settings

security = HTTPBearer()

# All algorithms Supabase may use
_ALLOWED_ALGS = ["HS256", "HS384", "HS512"]


def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    FastAPI dependency that verifies a Supabase JWT.
    
    Uses the Supabase client to call getUser(), which verifies 
    the token against the Supabase Auth API. This supports both 
    HS256 and ES256 tokens and handles key rotation automatically.

    Returns:
        str: The authenticated user's UUID.

    Raises:
        HTTPException: 401 if token is invalid or expired.
    """
    token = credentials.credentials
    
    # lazy import to avoid circular dep if verify_jwt imported at module level
    from backend.database import get_supabase_client

    client = get_supabase_client()
    
    try:
        # verify against Supabase Auth API
        response = client.auth.get_user(token)
        user = response.user
        
        if not user or not user.id:
             raise Exception("User not found in response")
             
        return user.id

    except Exception as e:
        # Log the error for debugging
        print(f"DEBUG: Auth failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )
