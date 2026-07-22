"""Seed the first Super Admin user into MySQL.

Usage (from backend/):
  python -m scripts.seed_admin
"""
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Allow running as module from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal, engine, Base
from app.db import models  # noqa: F401
from app.db.models import User, Profile


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        email = settings.SEED_ADMIN_EMAIL.strip()
        existing = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
        if existing:
            # Keep password in sync with SEED_ADMIN_PASSWORD when re-deploying
            existing.password = hash_password(settings.SEED_ADMIN_PASSWORD)
            existing.name = settings.SEED_ADMIN_NAME
            existing.role = "Super Admin"
            existing.status = "active"
            existing.updated_at = datetime.utcnow()
            profile = db.get(Profile, existing.id) or (
                db.query(Profile).filter(Profile.user_id == existing.id).first()
            )
            if profile:
                profile.role = "Super Admin"
                profile.status = "active"
                profile.permissions = ["*"]
                profile.updated_at = datetime.utcnow()
            db.commit()
            print(f"Admin already exists — password refreshed: {email} (id={existing.id})")
            return

        user_id = str(uuid.uuid4())
        now = datetime.utcnow()
        user = User(
            id=user_id,
            email=email,
            username=email,
            name=settings.SEED_ADMIN_NAME,
            password=hash_password(settings.SEED_ADMIN_PASSWORD),
            role="Super Admin",
            status="active",
            created_at=now,
            updated_at=now,
            synced_from="seed",
        )
        profile = Profile(
            id=user_id,
            user_id=user_id,
            name=settings.SEED_ADMIN_NAME,
            email=email,
            username=email,
            role="Super Admin",
            permissions=["*"],
            status="active",
            created_at=now,
            updated_at=now,
            synced_from="seed",
        )
        db.add(user)
        db.add(profile)
        db.commit()
        print("Seeded Super Admin:")
        print(f"  email:    {email}")
        print(f"  password: (from SEED_ADMIN_PASSWORD in .env)")
        print(f"  id:       {user_id}")
        print("Change the password after first login.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
