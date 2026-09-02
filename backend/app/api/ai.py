import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import base64

router = APIRouter()

# Configure the SDK
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY or GEMINI_API_KEY == "your_api_key_here":
    print("Warning: GEMINI_API_KEY is missing or invalid in .env")
else:
    genai.configure(api_key=GEMINI_API_KEY)

class ChatRequest(BaseModel):
    message: str
    locationContext: str | None = None
    image_base64: str | None = None

class TagRequest(BaseModel):
    memory_text: str

SYSTEM_INSTRUCTION = """
You are the Easwari Campus AI Assistant. Your job is to help students navigate the campus, find stalls, buildings, and answer questions about the campus layout.
If the user uploads a photo, analyze it to determine where they are standing or what they are looking at on campus to assist them better.
Keep your answers very brief and conversational.
"""

def generate_content(prompt: str, image_base64: str | None = None) -> str:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_api_key_here":
        raise Exception("Google Gemini API key is missing. Please add it to backend/.env")
        
    model = genai.GenerativeModel(
        model_name='gemini-3.1-flash-lite',
        system_instruction=SYSTEM_INSTRUCTION
    )
    
    contents = [prompt]
    if image_base64:
        # Check if the string has the data URI prefix and strip it
        if "," in image_base64:
            header, image_base64 = image_base64.split(",", 1)
            
        try:
            image_bytes = base64.b64decode(image_base64)
            contents.append({
                "mime_type": "image/jpeg",
                "data": image_bytes
            })
        except Exception as e:
            print("Failed to decode image:", e)
    
    response = model.generate_content(contents)
    return response.text

@router.post("/chat")
async def chat_with_assistant(request: ChatRequest):
    try:
        context = f"User is currently near: {request.locationContext}." if request.locationContext else ""
        prompt = f"{context}\nUser: {request.message}"
        text = generate_content(prompt, request.image_base64)
        return {"reply": text}
    except Exception as e:
        error_msg = str(e)
        print(f"AI Chat Error: {error_msg}")
        
        # Gracefully handle rate limits
        if "429" in error_msg or "Quota exceeded" in error_msg:
            return {"reply": "I'm currently receiving too many requests. Please wait a minute and try again!"}
            
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/tag-memory")
async def tag_memory(request: TagRequest):
    try:
        prompt = f"Analyze the following student's spatial journal memory left on a campus map. Reply with exactly one word that best categorizes it (e.g., 'Food', 'Study', 'Alert', 'Social', 'Info'):\n\nMemory: {request.memory_text}"
        text = generate_content(prompt)
        tag = text.strip().split("\n")[0][:20]
        return {"tag": tag}
    except Exception as e:
        print(f"AI Tag Error: {str(e)}")
        return {"tag": "General"}
