from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import Depends
import os

from app.db.session import get_db
from app.core.config import settings

router = APIRouter()


@router.get("/health/live")
def health_live():
    """Liveness for Docker — does not require MySQL."""
    return {
        "success": True,
        "status": "alive",
        "app": settings.APP_NAME,
        "build_id": os.getenv("BUILD_ID", "unknown"),
    }


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db_ok = False
    db_error = None
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:  # noqa: BLE001
        db_error = str(exc)

    return {
        "success": True,
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "build_id": os.getenv("BUILD_ID", "unknown"),
        "database": "ok" if db_ok else "error",
        "database_error": db_error,
    }
