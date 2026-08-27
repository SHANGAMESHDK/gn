from pydantic import BaseModel
from typing import List


class CampusEvent(BaseModel):
    id: str
    title: str
    description: str
    building_id: str
    time: str
    organizer: str
    tags: List[str]
    is_live: bool = False
