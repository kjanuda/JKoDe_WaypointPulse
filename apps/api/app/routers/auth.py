from datetime import datetime, timezone

import jwt
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.auth_session import AuthSession
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MessageResponse,
    RefreshResponse,
    UserResponse,
)
from app.services.auth_service import (
    create_access_token,
    decode_access_token,
    generate_family_id,
    generate_refresh_token,
    hash_refresh_token,
    refresh_expiry,
    verify_password,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

bearer_scheme = HTTPBearer(auto_error=False)


def credentials_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")

    if forwarded:
        return forwarded.split(",")[0].strip()

    if request.client:
        return request.client.host

    return None


def set_refresh_cookie(
    response: Response,
    refresh_token: str,
) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path="/api/auth",
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise credentials_error()

    token = credentials.credentials

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (
        jwt.ExpiredSignatureError,
        jwt.InvalidTokenError,
        KeyError,
        ValueError,
    ):
        raise credentials_error()

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None or not user.is_active:
        raise credentials_error()

    return user


def require_role(*allowed_roles: str):
    def dependency(
        user: User = Depends(get_current_user),
    ) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )

        return user

    return dependency


@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    email = payload.email.lower().strip()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if (
        user is None
        or not user.is_active
        or not verify_password(
            payload.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    refresh_token = generate_refresh_token()
    refresh_hash = hash_refresh_token(refresh_token)
    family_id = generate_family_id()

    session = AuthSession(
        user_id=user.id,
        token_hash=refresh_hash,
        family_id=family_id,
        user_agent=request.headers.get("user-agent"),
        ip_address=client_ip(request),
        expires_at=refresh_expiry(),
    )

    db.add(session)
    db.commit()

    access_token = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role,
    )

    set_refresh_cookie(
        response,
        refresh_token,
    )

    return LoginResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user,
    )


@router.post(
    "/refresh",
    response_model=RefreshResponse,
)
def refresh(
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(
        default=None,
        alias=settings.REFRESH_COOKIE_NAME,
    ),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise credentials_error()

    now = datetime.now(timezone.utc)
    token_hash = hash_refresh_token(refresh_token)

    session = (
        db.query(AuthSession)
        .filter(AuthSession.token_hash == token_hash)
        .first()
    )

    if session is None:
        clear_refresh_cookie(response)
        raise credentials_error()

    if session.revoked_at is not None:
        (
            db.query(AuthSession)
            .filter(
                AuthSession.family_id == session.family_id,
                AuthSession.revoked_at.is_(None),
            )
            .update(
                {
                    AuthSession.revoked_at: now,
                },
                synchronize_session=False,
            )
        )

        db.commit()
        clear_refresh_cookie(response)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token reuse detected. Session revoked.",
        )

    if session.expires_at <= now:
        session.revoked_at = now
        db.commit()

        clear_refresh_cookie(response)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session expired",
        )

    user = (
        db.query(User)
        .filter(User.id == session.user_id)
        .first()
    )

    if user is None or not user.is_active:
        session.revoked_at = now
        db.commit()

        clear_refresh_cookie(response)
        raise credentials_error()

    session.revoked_at = now
    session.last_used_at = now

    new_refresh_token = generate_refresh_token()

    new_session = AuthSession(
        user_id=user.id,
        token_hash=hash_refresh_token(
            new_refresh_token
        ),
        family_id=session.family_id,
        user_agent=request.headers.get("user-agent"),
        ip_address=client_ip(request),
        expires_at=refresh_expiry(),
    )

    db.add(new_session)
    db.commit()

    new_access_token = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role,
    )

    set_refresh_cookie(
        response,
        new_refresh_token,
    )

    return RefreshResponse(
        access_token=new_access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
)
def logout(
    response: Response,
    refresh_token: str | None = Cookie(
        default=None,
        alias=settings.REFRESH_COOKIE_NAME,
    ),
    db: Session = Depends(get_db),
):
    if refresh_token:
        token_hash = hash_refresh_token(refresh_token)

        session = (
            db.query(AuthSession)
            .filter(AuthSession.token_hash == token_hash)
            .first()
        )

        if session and session.revoked_at is None:
            session.revoked_at = datetime.now(
                timezone.utc
            )
            db.commit()

    clear_refresh_cookie(response)

    return {
        "message": "Logged out successfully",
    }


@router.post(
    "/logout-all",
    response_model=MessageResponse,
)
def logout_all(
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    (
        db.query(AuthSession)
        .filter(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
        )
        .update(
            {
                AuthSession.revoked_at: now,
            },
            synchronize_session=False,
        )
    )

    db.commit()

    clear_refresh_cookie(response)

    return {
        "message": "Logged out from all sessions",
    }


@router.get(
    "/me",
    response_model=UserResponse,
)
def me(
    user: User = Depends(get_current_user),
):
    return user