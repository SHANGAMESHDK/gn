from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.graph_loader import graph_manager

from app.api.navigation import router_api
from app.api.gps import gps_router
from app.api.buildings import router as buildings_router
from app.api.stalls import stall_router
from app.api.admin import router as admin_router
from app.api.ar import router as ar_router


# ==========================================================
# Application Lifespan
# ==========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    print("\n" + "=" * 60)
    print("Starting Campus Navigator Backend...")
    print("=" * 60)

    graph_manager.load()

    print("Backend Started Successfully")
    print("=" * 60 + "\n")

    yield

    print("\n" + "=" * 60)
    print("Campus Navigator Backend Stopped")
    print("=" * 60)


# ==========================================================
# FastAPI App
# ==========================================================

app = FastAPI(
    title="Campus Navigator API",
    description="Smart Indoor & Outdoor Campus Navigation System",
    version="1.0.0",
    lifespan=lifespan
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Change this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# Register Routers
# ==========================================================

app.include_router(router_api)
app.include_router(gps_router)
app.include_router(buildings_router)
app.include_router(stall_router)
app.include_router(admin_router)
app.include_router(ar_router)


# ==========================================================
# Root Endpoint
# ==========================================================

@app.get("/", tags=["Root"])
def root():

    return {
        "application": "Campus Navigator API",
        "version": "1.0.0",
        "status": "Running"
    }


# ==========================================================
# API Information
# ==========================================================

@app.get("/info", tags=["Root"])
def info():

    return {
        "application": "Campus Navigator API",
        "version": "1.0.0",
        "graph": graph_manager.statistics(),
        "endpoints": {
            "navigation": "/navigation",
            "gps": "/gps",
            "buildings": "/buildings",
            "stalls": "/stalls",
            "admin": "/admin",
            "ar": "/ar",
            "swagger": "/docs"
        }
    }