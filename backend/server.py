import os
import secrets
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from getstream import Stream

load_dotenv()

STREAM_API_KEY    = os.getenv("STREAM_API_KEY")
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET")

app = FastAPI(title="Interview Coach Token Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from pydantic import BaseModel

class JoinRequest(BaseModel):
    mode: str = "interview"

@app.post("/join")
async def join(req: JoinRequest):
    if not STREAM_API_KEY or not STREAM_API_SECRET:
        return {"error": "Missing STREAM_API_KEY or STREAM_API_SECRET in .env"}
    client  = Stream(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)
    user_id = "candidate_" + secrets.token_hex(4)
    call_id = "call_" + secrets.token_hex(6)
    token   = client.create_token(user_id)
    return {
        "user_id":   user_id,
        "token":     token,
        "api_key":   STREAM_API_KEY,
        "call_id":   call_id,
        "call_type": "default",
        "mode":      req.mode
    }

@app.get("/modes")
async def get_modes():
    return {
        "modes": [
            {
                "id": "interview",
                "name": "Interview Coach",
                "description": "Strict but kind AI interview coach to practice behavioral & technical Qs."
            },
            {
                "id": "gym",
                "name": "Gym Trainer",
                "description": "Safety-focused AI trainer to track form and count reps."
            },
            {
                "id": "speaking",
                "name": "Public Speaking Coach",
                "description": "Encouraging AI coach to analyze your body language, pacing and filler words."
            }
        ]
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 