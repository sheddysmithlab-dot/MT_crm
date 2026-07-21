"""Generic REST CRUD for all registered CRM resources."""
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.db.models import User
from app.db.registry import RESOURCE_MODELS, ONLINE_ONLY_TABLES, MODULE_STORES
from app.services import resource_service as svc

router = APIRouter()


@router.get("")
def list_resources(_: User = Depends(get_current_user)):
    return {
        "success": True,
        "resources": sorted(RESOURCE_MODELS.keys()),
        "modules": MODULE_STORES,
        "online_only": sorted(ONLINE_ONLY_TABLES),
        "architecture": "BACKEND_COMPLETE_ARCHITECTURE Option B",
    }


@router.get("/{resource}")
def list_items(
    resource: str,
    q: str | None = Query(None),
    status: str | None = Query(None),
    skip: int = 0,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return svc.list_rows(db, resource, q=q, status=status, skip=skip, limit=limit)


@router.get("/{resource}/{record_id}")
def get_item(
    resource: str,
    record_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return svc.get_row(db, resource, record_id)


@router.post("/{resource}", status_code=201)
def create_item(
    resource: str,
    body: dict[str, Any],
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if resource in ONLINE_ONLY_TABLES:
        # Still allow online create via API — only sync/offline is blocked
        pass
    return svc.create_row(db, resource, body)


@router.put("/{resource}/{record_id}")
def update_item(
    resource: str,
    record_id: str,
    body: dict[str, Any],
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return svc.update_row(db, resource, record_id, body)


@router.delete("/{resource}/{record_id}")
def delete_item(
    resource: str,
    record_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return svc.delete_row(db, resource, record_id)
