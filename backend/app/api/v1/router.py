from fastapi import APIRouter

from app.api.v1 import calendar, companies, dashboard, events, statuses, user_settings

api_router = APIRouter(prefix="/api")

api_router.include_router(statuses.router)
api_router.include_router(companies.router)
api_router.include_router(events.router)
api_router.include_router(calendar.router)
api_router.include_router(dashboard.router)
api_router.include_router(user_settings.router)
