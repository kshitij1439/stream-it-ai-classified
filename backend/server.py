import os
import secrets
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from getstream import Stream
from pydantic import BaseModel

load_dotenv()

STREAM_API_KEY    = os.environ.get("STREAM_API_KEY")
STREAM_API_SECRET = os.environ.get("STREAM_API_SECRET")
ALLOWED_ORIGINS   = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
AGENT_RUNNER_URL  = os.environ.get("AGENT_RUNNER_URL", "http://34.14.203.223:8000")

app = FastAPI(title="Vision Coach Token Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

class JoinRequest(BaseModel):
    mode: str = "interview"

@app.post("/join")
async def join(req: JoinRequest):
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
        "mode":      req.mode,
    }

@app.post("/sessions")
async def sessions(request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AGENT_RUNNER_URL}/sessions",
            json=body,
            timeout=15
        )
        return resp.json()

@app.get("/modes")
async def get_modes():
    return {
        "modes": [
            {"id": "interview", "name": "Interview Coach", "description": "Strict but kind AI interview coach."},
            {"id": "gym", "name": "Gym Trainer", "description": "Safety-focused AI trainer."},
            {"id": "speaking", "name": "Public Speaking Coach", "description": "Encouraging AI coach."},
        ]
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)