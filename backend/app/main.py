"""Malwa CRM — FastAPI application entrypoint."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.router import api_router
from app.db.session import engine, Base
from app.db import models  # noqa: F401
from app.db import models_extra  # noqa: F401
from app.db import models_jobflow  # noqa: F401
from app.db import registry  # noqa: F401 — all architecture stores

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_PREFIX)


@app.on_event("startup")
def on_startup():
    """Best-effort table ensure — never block API boot if MySQL is down/misconfigured."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:  # noqa: BLE001 — startup must not crash the container
        print(f"[mt-crm] startup create_all skipped: {exc}")


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "status": "ok",
        "docs": "/api/docs",
        "mode": "option-b-online-with-browser-offline-sync",
    }
