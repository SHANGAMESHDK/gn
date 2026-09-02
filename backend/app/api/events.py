from fastapi import APIRouter, HTTPException
from app.models.event import CampusEvent
from typing import List
import json
from pathlib import Path
import uuid

router = APIRouter(
    prefix="/events",
    tags=["Events"]
)

EVENTS_FILE = Path(__file__).resolve().parents[2] / "app" / "data" / "events.json"

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
    }
]

def load_events():
    if not EVENTS_FILE.exists():
        EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(EVENTS_FILE, "w") as f:
            json.dump(MOCK_EVENTS, f, indent=4)
        return MOCK_EVENTS
        
    try:
        with open(EVENTS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return MOCK_EVENTS

def save_events(events):
    EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(EVENTS_FILE, "w") as f:
        json.dump(events, f, indent=4)

@router.get("/live", response_model=List[CampusEvent])
def get_live_events():
    """Returns events currently happening on campus."""
    events = load_events()
    return [CampusEvent(**evt) for evt in events if evt.get("is_live")]

@router.get("/all", response_model=List[CampusEvent])
def get_all_events():
    """Returns all scheduled campus events."""
    events = load_events()
    return [CampusEvent(**evt) for evt in events]

@router.get("/building/{building_name}", response_model=List[CampusEvent])
def get_events_by_building(building_name: str):
    """Returns events for a specific building (case-insensitive match)."""
    events = load_events()
    return [
        CampusEvent(**evt)
        for evt in events
        if evt.get("building_id", "").lower() == building_name.lower()
    ]

# Admin Endpoints
@router.post("/", response_model=CampusEvent)
def create_event(event: CampusEvent):
    events = load_events()
    evt_dict = event.dict()
    if not evt_dict.get("id"):
        evt_dict["id"] = f"evt_{uuid.uuid4().hex[:8]}"
        
    events.append(evt_dict)
    save_events(events)
    return CampusEvent(**evt_dict)

@router.put("/{event_id}", response_model=CampusEvent)
def update_event(event_id: str, event: CampusEvent):
    events = load_events()
    for i, e in enumerate(events):
        if e["id"] == event_id:
            evt_dict = event.dict()
            evt_dict["id"] = event_id # Ensure ID doesn't change
            events[i] = evt_dict
            save_events(events)
            return CampusEvent(**evt_dict)
            
    raise HTTPException(status_code=404, detail="Event not found")

@router.delete("/{event_id}")
def delete_event(event_id: str):
    events = load_events()
    initial_len = len(events)
    events = [e for e in events if e["id"] != event_id]
    
    if len(events) == initial_len:
        raise HTTPException(status_code=404, detail="Event not found")
        
    save_events(events)
    return {"message": "Event deleted successfully"}
