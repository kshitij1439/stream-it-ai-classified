import os
import secrets
import httpx
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from getstream import Stream
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# Setup Logging so you can see errors in Cloud Run logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Environment Variables
STREAM_API_KEY    = os.environ.get("STREAM_API_KEY")
STREAM_API_SECRET = os.environ.get("STREAM_API_SECRET")
# This MUST be your GCE VM External IP
AGENT_RUNNER_URL  = os.environ.get("AGENT_RUNNER_URL", "http://34.14.203.223:8000")

app = FastAPI(title="VisionStudio AI - Production Token Server")

# ── CORS FIX: Allows Vercel and Localhost to talk to this API ────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Built-in Mode Definitions ────────────────────────────────────────────────
BUILTIN_MODES = [
    {
        "id": "interview",
        "name": "Interview Coach",
        "description": "Strict but kind AI coach for behavioral & technical practice.",
        "icon": "briefcase",
        "stats_schema": [
            {"key": "confidence", "label": "Confidence", "type": "score", "icon": "TrendingUp"},
            {"key": "eyeContact", "label": "Eye Contact", "type": "status", "icon": "Eye"},
            {"key": "fillerWords", "label": "Filler Words", "type": "count", "icon": "Mic"},
        ],
    },
    {
        "id": "gym",
        "name": "Gym Trainer",
        "description": "AI trainer to track form and count reps.",
        "icon": "dumbbell",
        "stats_schema": [
            {"key": "repCount", "label": "Reps", "type": "count", "icon": "Repeat"},
            {"key": "formScore", "label": "Form Score", "type": "score", "icon": "TrendingUp"},
        ],
    },
    {
        "id": "ergonomics",
        "name": "Ergonomics Coach",
        "description": "Monitor desk posture and neck angle.",
        "icon": "monitor",
        "stats_schema": [
            {"key": "postureScore", "label": "Posture Score", "type": "score", "icon": "User"},
            {"key": "neckAngle", "label": "Neck Angle", "type": "value", "unit": "°", "icon": "Activity"},
        ],
    }
]

class JoinRequest(BaseModel):
    mode: str = "interview"
    custom_mode: Optional[Dict[str, Any]] = None

@app.post("/join")
async def join(req: JoinRequest):
    try:
        client  = Stream(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)
        user_id = "candidate_" + secrets.token_hex(4)
        call_id = "call_" + secrets.token_hex(6)
        token   = client.create_token(user_id)

        # Match the schema to the selected mode
        mode_config = next((m for m in BUILTIN_MODES if m["id"] == req.mode), BUILTIN_MODES[0])
        stats_schema = mode_config.get("stats_schema", [])

        return {
            "user_id": user_id,
            "token": token,
            "api_key": STREAM_API_KEY,
            "call_id": call_id,
            "call_type": "default",
            "mode": req.mode,
            "stats_schema": stats_schema,
        }
    except Exception as e:
        logger.error(f"Join Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions")
async def sessions(request: Request):
    """The Proxy: Forwards the frontend 'Start' signal to the GCE VM"""
    try:
        body = await request.json()
        async with httpx.AsyncClient() as client:
            logger.info(f"Forwarding to VM: {AGENT_RUNNER_URL}/sessions")
            resp = await client.post(
                f"{AGENT_RUNNER_URL}/sessions",
                json=body,
                timeout=30.0 # High timeout for YOLO cold start
            )
            return resp.json()
    except Exception as e:
        logger.error(f"VM Forwarding Error: {e}")
        return {"error": "AGENT_RUNNER_OFFLINE", "details": str(e)}

@app.get("/modes")
async def get_modes():
    return {"modes": BUILTIN_MODES}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    # Cloud Run injects the PORT env var
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)