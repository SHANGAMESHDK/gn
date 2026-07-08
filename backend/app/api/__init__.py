"""
Campus Navigator API Package
"""

from .navigation import router_api
from .gps import gps_router
from .buildings import router as buildings_router
from .stalls import stall_router
from .admin import router as admin_router

__all__ = [
    "router_api",
    "gps_router",
    "buildings_router",
    "stall_router",
    "admin_router",
]