from fastapi import APIRouter

from app.api.routes import health, auth, customers, sync, resources

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(resources.router, prefix="/resources", tags=["resources"])
