import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai

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

class TagRequest(BaseModel):
    memory_text: str

SYSTEM_INSTRUCTION = """
You are the Easwari Campus AI Assistant. Your job is to help students navigate the campus, find stalls, buildings, and answer questions about the campus layout.
Keep your answers very brief and conversational.
"""

def generate_content(prompt: str) -> str:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_api_key_here":
        raise Exception("Google Gemini API key is missing. Please add it to backend/.env")
        
    model = genai.GenerativeModel(
        model_name='gemini-flash-latest',
        system_instruction=SYSTEM_INSTRUCTION
    )
    
    response = model.generate_content(prompt)
    return response.text

@router.post("/chat")
async def chat_with_assistant(request: ChatRequest):
    try:
        context = f"User is currently near: {request.locationContext}." if request.locationContext else ""
        prompt = f"{context}\nUser: {request.message}"
        text = generate_content(prompt)
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
