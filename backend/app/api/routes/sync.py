"""Bi-directional sync endpoints for Option B (browser IndexedDB ↔ MySQL)."""
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.db.models import User
from app.db.registry import RESOURCE_MODELS, SYNCABLE_TABLES, ONLINE_ONLY_TABLES
from app.schemas import SyncPushRequest, SyncPushResponse, SyncPushResultItem, SyncPullResponse
from app.services import resource_service as svc

router = APIRouter()


def _parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00").replace("+00:00", ""))
    except ValueError:
        return None


@router.post("/push", response_model=SyncPushResponse)
def sync_push(
    body: SyncPushRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    results: list[SyncPushResultItem] = []

    for item in body.items:
        table = (item.table or "").strip()
        if table in ONLINE_ONLY_TABLES:
            results.append(
                SyncPushResultItem(
                    queue_id=item.queue_id,
                    success=False,
                    error=f"Table '{table}' is online-only; offline writes rejected",
                    skipped=True,
                )
            )
            continue

        if table not in SYNCABLE_TABLES or table not in RESOURCE_MODELS:
            results.append(
                SyncPushResultItem(
                    queue_id=item.queue_id,
                    success=False,
                    error=f"Table '{table}' is not syncable yet",
                    skipped=True,
                )
            )
            continue

        try:
            if item.operation == "delete":
                model = RESOURCE_MODELS[table]
                row = db.get(model, item.record_id)
                if row and getattr(row, "deleted_at", None) is None:
                    if hasattr(row, "deleted_at"):
                        row.deleted_at = datetime.utcnow()
                    if hasattr(row, "status"):
                        row.status = "deleted"
                    if hasattr(row, "updated_at"):
                        row.updated_at = datetime.utcnow()
                    if hasattr(row, "synced_from"):
                        row.synced_from = "client"
                    db.commit()
                results.append(SyncPushResultItem(queue_id=item.queue_id, success=True))
                continue

            client_updated = _parse_dt(item.updated_at or (item.data or {}).get("updated_at"))
            outcome = svc.upsert_row(
                db,
                table,
                item.record_id,
                dict(item.data or {}),
                client_updated,
            )
            results.append(
                SyncPushResultItem(
                    queue_id=item.queue_id,
                    success=True,
                    skipped=(outcome == "skipped"),
                    error="Server wins (newer updated_at)" if outcome == "skipped" else None,
                )
            )
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            results.append(
                SyncPushResultItem(queue_id=item.queue_id, success=False, error=str(exc))
            )

    return SyncPushResponse(success=all(r.success for r in results), results=results)


@router.get("/pull", response_model=SyncPullResponse)
def sync_pull(
    table: str = Query(...),
    since: str | None = Query(None),
    limit: int = Query(500, le=2000),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if table not in RESOURCE_MODELS:
        raise HTTPException(status_code=400, detail=f"Table '{table}' not syncable yet")

    model = RESOURCE_MODELS[table]
    since_dt = _parse_dt(since)
    query = db.query(model)
    if since_dt and hasattr(model, "updated_at"):
        query = query.filter(model.updated_at > since_dt)

    order_col = getattr(model, "updated_at", model.id)
    rows = query.order_by(order_col.asc()).limit(limit).all()
    records = []
    deleted_ids = []
    for row in rows:
        if getattr(row, "deleted_at", None) is not None or (
            getattr(row, "status", None) or ""
        ).lower() == "deleted":
            deleted_ids.append(row.id)
        else:
            records.append(svc.row_to_dict(row))

    return SyncPullResponse(
        success=True,
        table=table,
        records=records,
        deleted_ids=deleted_ids,
        pulled_at=datetime.utcnow(),
    )
