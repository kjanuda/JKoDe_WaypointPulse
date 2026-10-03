from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
import app.models

from app.routers.outlets import router as outlets_router
from app.routers.vehicles import router as vehicles_router
from app.routers.calendar import router as calendar_router
from app.routers.dashboard import router as dashboard_router
from app.routers.planner import router as planner_router
from app.routers import plans
from app.routers import loader
from app.routers import driver
from app.routers import store


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Waypoint Pulse API",
    description="Delivery planning and orchestration API for Waypoint Group",
    version="1.0.0",
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routers
app.include_router(outlets_router)
app.include_router(vehicles_router)
app.include_router(calendar_router)
app.include_router(dashboard_router)
app.include_router(planner_router)
app.include_router(plans.router)
app.include_router(loader.router)
app.include_router(driver.router)
app.include_router(store.router)


@app.get("/")
def root():
    return {
        "name": "Waypoint Pulse API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": "connected",
    }