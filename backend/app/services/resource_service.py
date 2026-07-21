"""Generic CRUD helpers for CRM resources."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.registry import RESOURCE_MODELS, SEARCH_FIELDS


def get_model(resource: str):
    model = RESOURCE_MODELS.get(resource)
    if not model:
        raise HTTPException(status_code=404, detail=f"Unknown resource '{resource}'")
    return model


def row_to_dict(row: Any) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, datetime):
            data[col.name] = val.isoformat()
        elif hasattr(val, "__float__") and not isinstance(val, bool):
            try:
                data[col.name] = float(val)
            except Exception:  # noqa: BLE001
                data[col.name] = val
        else:
            data[col.name] = val
    # Prefer merged view: data_json overlay with columns winning on conflicts for ids/timestamps
    extra = data.pop("data_json", None) or {}
    if isinstance(extra, dict):
        merged = {**extra, **{k: v for k, v in data.items() if v is not None}}
        return merged
    return data


def _parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00").replace("+00:00", ""))
    except ValueError:
        return None


def apply_payload(model_cls, row, payload: dict[str, Any], *, is_create: bool = False) -> None:
    allowed = {c.name for c in model_cls.__table__.columns}
    data = dict(payload or {})
    now = datetime.utcnow()

    # Keep a full copy for forward-compat fields
    if "data_json" in allowed:
        row.data_json = data

    for key, value in data.items():
        if key not in allowed or key in ("data_json",):
            continue
        if key in ("created_at",) and not is_create:
            continue
        col = model_cls.__table__.columns.get(key)
        if col is not None and str(col.type).startswith("DATETIME"):
            setattr(row, key, _parse_dt(value))
        else:
            setattr(row, key, value)

    if is_create and "created_at" in allowed:
        row.created_at = _parse_dt(data.get("created_at")) or now
    if "updated_at" in allowed:
        row.updated_at = _parse_dt(data.get("updated_at")) or now
    if "synced_from" in allowed and not getattr(row, "synced_from", None):
        row.synced_from = data.get("synced_from") or "server"


def list_rows(
    db: Session,
    resource: str,
    *,
    q: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[dict[str, Any]]:
    model = get_model(resource)
    query = db.query(model)
    if hasattr(model, "deleted_at"):
        query = query.filter(model.deleted_at.is_(None))
    if status and hasattr(model, "status"):
        query = query.filter(model.status == status)
    if q:
        like = f"%{q}%"
        fields = SEARCH_FIELDS.get(resource, [])
        clauses = []
        for field in fields:
            col = getattr(model, field, None)
            if col is not None:
                clauses.append(col.like(like))
        if clauses:
            from sqlalchemy import or_

            query = query.filter(or_(*clauses))
    order_col = getattr(model, "updated_at", None) or getattr(model, "created_at", None)
    if order_col is not None:
        query = query.order_by(order_col.desc())
    rows = query.offset(skip).limit(limit).all()
    return [row_to_dict(r) for r in rows]


def get_row(db: Session, resource: str, record_id: str) -> dict[str, Any]:
    model = get_model(resource)
    row = db.get(model, record_id)
    if not row or (hasattr(row, "deleted_at") and row.deleted_at is not None):
        raise HTTPException(status_code=404, detail="Not found")
    return row_to_dict(row)


def create_row(db: Session, resource: str, payload: dict[str, Any]) -> dict[str, Any]:
    model = get_model(resource)
    record_id = payload.get("id") or str(uuid.uuid4())
    if db.get(model, record_id):
        raise HTTPException(status_code=409, detail="Id already exists")
    row = model(id=record_id)
    apply_payload(model, row, {**payload, "id": record_id}, is_create=True)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row_to_dict(row)


def update_row(db: Session, resource: str, record_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    model = get_model(resource)
    row = db.get(model, record_id)
    if not row or (hasattr(row, "deleted_at") and row.deleted_at is not None):
        raise HTTPException(status_code=404, detail="Not found")

    client_updated = _parse_dt(payload.get("updated_at"))
    if client_updated and getattr(row, "updated_at", None) and client_updated < row.updated_at:
        raise HTTPException(status_code=409, detail="Conflict: server has a newer version")

    apply_payload(model, row, {**payload, "id": record_id}, is_create=False)
    db.commit()
    db.refresh(row)
    return row_to_dict(row)


def delete_row(db: Session, resource: str, record_id: str) -> dict[str, Any]:
    model = get_model(resource)
    row = db.get(model, record_id)
    if not row or (hasattr(row, "deleted_at") and row.deleted_at is not None):
        raise HTTPException(status_code=404, detail="Not found")
    if hasattr(row, "deleted_at"):
        row.deleted_at = datetime.utcnow()
        if hasattr(row, "status"):
            row.status = "deleted"
        if hasattr(row, "updated_at"):
            row.updated_at = datetime.utcnow()
        db.commit()
    else:
        db.delete(row)
        db.commit()
    return {"success": True, "id": record_id}


def upsert_row(db: Session, resource: str, record_id: str, payload: dict[str, Any], client_updated: datetime | None):
    """Used by sync push — last-write-wins."""
    model = get_model(resource)
    row = db.get(model, record_id)
    now = client_updated or datetime.utcnow()
    if row is None:
        row = model(id=record_id)
        apply_payload(model, row, {**payload, "id": record_id}, is_create=True)
        row.updated_at = now
        row.synced_from = "client"
        db.add(row)
        db.commit()
        return "created"
    if row.updated_at and now < row.updated_at:
        return "skipped"
    apply_payload(model, row, {**payload, "id": record_id}, is_create=False)
    row.updated_at = now
    row.synced_from = "client"
    row.deleted_at = None
    db.commit()
    return "updated"
