from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import os

router = APIRouter()

# In a real production app, pull this from a .env file or GCP Secret Manager
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY environment variable not set")
    
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"

class ChatRequest(BaseModel):
    message: str
    locationContext: str | None = None

class TagRequest(BaseModel):
    memory_text: str

SYSTEM_INSTRUCTION = """
You are the Easwari Campus AI Assistant. Your job is to help students navigate the campus, find stalls, buildings, and answer questions about the campus layout.
Keep your answers very brief and conversational.
"""

def generate_content(prompt: str) -> str:
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    response = requests.post(GEMINI_URL, json=payload)
    response.raise_for_status()
    data = response.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        return "Sorry, I couldn't understand that."

@router.post("/chat")
async def chat_with_assistant(request: ChatRequest):
    try:
        context = f"User is currently near: {request.locationContext}." if request.locationContext else ""
        prompt = f"{SYSTEM_INSTRUCTION}\n{context}\nUser: {request.message}"
        text = generate_content(prompt)
        return {"reply": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tag-memory")
async def tag_memory(request: TagRequest):
    try:
        prompt = f"Analyze the following student's spatial journal memory left on a campus map. Reply with exactly one word that best categorizes it (e.g., 'Food', 'Study', 'Alert', 'Social', 'Info'):\n\nMemory: {request.memory_text}"
        text = generate_content(prompt)
        tag = text.strip().split("\n")[0][:20]
        return {"tag": tag}
    except Exception as e:
        return {"tag": "General"}
