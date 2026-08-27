from fastapi import APIRouter
from app.models.event import CampusEvent
from typing import List

router = APIRouter(
    prefix="/events",
    tags=["Events"]
)

# =====================================================
# Simulated campus events for demonstration
# =====================================================

MOCK_EVENTS = [
    {
        "id": "evt_1",
        "title": "Hackathon 2026 Finals",
        "description": "The final round of the annual 24-hour hackathon. Teams are presenting their projects to industry judges.",
        "building_id": "Main Block",
        "time": "10:00 AM - 4:00 PM",
        "organizer": "Computer Science Dept",
        "tags": ["Tech", "Competition"],
        "is_live": True
    },
    {
        "id": "evt_2",
        "title": "Robotics Workshop",
        "description": "Hands-on workshop on autonomous drones and rovers with live demonstrations.",
        "building_id": "PG Block",
        "time": "2:00 PM - 5:00 PM",
        "organizer": "Robotics Club",
        "tags": ["Workshop", "Engineering"],
        "is_live": True
    },
    {
        "id": "evt_3",
        "title": "Alumni Meet 2026",
        "description": "Annual gathering of SRM Easwari alumni sharing industry insights and career guidance.",
        "building_id": "TRP Auditorium",
        "time": "9:00 AM - 1:00 PM",
        "organizer": "Alumni Association",
        "tags": ["Networking", "Seminar"],
        "is_live": False
    },
    {
        "id": "evt_4",
        "title": "IoT Symposium",
        "description": "Exploring the future of Internet of Things and Smart Campus technologies.",
        "building_id": "Block 5",
        "time": "11:00 AM - 1:00 PM",
        "organizer": "ECE Dept",
        "tags": ["Seminar", "Tech"],
        "is_live": True
    },
    {
        "id": "evt_5",
        "title": "Cultural Fest Rehearsal",
        "description": "Dance and music rehearsal for the upcoming inter-college cultural fest.",
        "building_id": "TRP Auditorium",
        "time": "3:00 PM - 6:00 PM",
        "organizer": "Cultural Committee",
        "tags": ["Cultural", "Event"],
        "is_live": True
    },
]


@router.get("/live", response_model=List[CampusEvent])
def get_live_events():
    """Returns events currently happening on campus."""
    return [CampusEvent(**evt) for evt in MOCK_EVENTS if evt["is_live"]]


@router.get("/all", response_model=List[CampusEvent])
def get_all_events():
    """Returns all scheduled campus events."""
    return [CampusEvent(**evt) for evt in MOCK_EVENTS]


@router.get("/building/{building_name}", response_model=List[CampusEvent])
def get_events_by_building(building_name: str):
    """Returns events for a specific building (case-insensitive match)."""
    return [
        CampusEvent(**evt)
        for evt in MOCK_EVENTS
        if evt["building_id"].lower() == building_name.lower()
    ]
