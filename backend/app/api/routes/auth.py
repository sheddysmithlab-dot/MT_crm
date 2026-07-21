from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_profile
from app.core.security import verify_password, create_access_token
from app.db.session import get_db
from app.db.models import User, Profile
from app.schemas import LoginRequest, AuthResponse, UserOut, ProfileOut

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    identifier = body.email.strip()

    user = (
        db.query(User)
        .filter(User.deleted_at.is_(None))
        .filter((User.email == identifier) | (User.username == identifier))
        .first()
    )

    if not user:
        # try profile email → user id
        profile = (
            db.query(Profile)
            .filter(Profile.deleted_at.is_(None))
            .filter((Profile.email == identifier) | (Profile.username == identifier))
            .first()
        )
        if profile:
            user = db.get(User, profile.user_id or profile.id)

    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if (user.status or "").lower() not in ("active", "Active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User inactive")

    user.last_login = datetime.utcnow()
    user.updated_at = datetime.utcnow()
    db.commit()

    profile = db.get(Profile, user.id)
    if not profile:
        profile = (
            db.query(Profile)
            .filter(Profile.user_id == user.id, Profile.deleted_at.is_(None))
            .first()
        )

    token = create_access_token(user.id, extra={"role": user.role, "email": user.email})

    return AuthResponse(
        access_token=token,
        user=UserOut.model_validate(user),
        profile=ProfileOut.model_validate(profile) if profile else None,
    )


@router.get("/me")
def me(
    user: User = Depends(get_current_user),
    profile: Profile | None = Depends(get_current_profile),
):
    return {
        "success": True,
        "user": UserOut.model_validate(user),
        "profile": ProfileOut.model_validate(profile) if profile else None,
    }


@router.post("/logout")
def logout(user: User = Depends(get_current_user)):
    # JWT is stateless; client discards token. Hook for audit later.
    return {"success": True, "message": "Logged out", "user_id": user.id}
