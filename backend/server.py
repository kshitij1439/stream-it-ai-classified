import os
import secrets
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from getstream import Stream
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

load_dotenv()

STREAM_API_KEY    = os.environ.get("STREAM_API_KEY")
STREAM_API_SECRET = os.environ.get("STREAM_API_SECRET")
ALLOWED_ORIGINS   = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
AGENT_RUNNER_URL  = os.environ.get("AGENT_RUNNER_URL", "http://34.14.203.223:8000")

app = FastAPI(title="VisionStudio AI Token Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Built-in modes with stats schemas ─────────────────────────────────────────
BUILTIN_MODES = [
    {
        "id": "interview",
        "name": "Interview Coach",
        "description": "Strict but kind AI coach for behavioral & technical interview practice.",
        "icon": "briefcase",
        "stats_schema": [
            {"key": "confidence", "label": "Confidence", "type": "score", "icon": "TrendingUp"},
            {"key": "eyeContact", "label": "Eye Contact", "type": "status", "icon": "Eye"},
            {"key": "pace", "label": "Pace", "type": "status", "icon": "Activity"},
            {"key": "fillerWords", "label": "Filler Words", "type": "count", "icon": "Mic"},
            {"key": "postureAlerts", "label": "Posture Alerts", "type": "count", "icon": "User"},
        ],
    },
    {
        "id": "gym",
        "name": "Gym Trainer",
        "description": "Safety-focused AI trainer to track form, count reps, and prevent injury.",
        "icon": "dumbbell",
        "stats_schema": [
            {"key": "repCount", "label": "Reps", "type": "count", "icon": "Repeat"},
            {"key": "formScore", "label": "Form Score", "type": "score", "icon": "TrendingUp"},
            {"key": "formAlerts", "label": "Form Issues", "type": "count", "icon": "AlertTriangle"},
            {"key": "postureAlerts", "label": "Posture Alerts", "type": "count", "icon": "User"},
        ],
    },
    {
        "id": "speaking",
        "name": "Public Speaking Coach",
        "description": "Encouraging AI coach to analyze body language, pacing, and filler words.",
        "icon": "mic",
        "stats_schema": [
            {"key": "confidence", "label": "Confidence", "type": "score", "icon": "TrendingUp"},
            {"key": "pace", "label": "Pace", "type": "status", "icon": "Activity"},
            {"key": "fillerWords", "label": "Filler Words", "type": "count", "icon": "Mic"},
            {"key": "bodyLanguage", "label": "Body Language", "type": "status", "icon": "User"},
        ],
    },
    {
        "id": "chef",
        "name": "Chef Coach",
        "description": "Michelin-star AI coach for knife technique and kitchen safety.",
        "icon": "chef-hat",
        "stats_schema": [
            {"key": "safetyScore", "label": "Safety Score", "type": "score", "icon": "Shield"},
            {"key": "techniqueAlerts", "label": "Technique Issues", "type": "count", "icon": "AlertTriangle"},
            {"key": "gripStatus", "label": "Knife Grip", "type": "status", "icon": "Tool"},
        ],
    },
    {
        "id": "ergonomics",
        "name": "Ergonomics Coach",
        "description": "Silent background monitor for desk posture and workspace wellness.",
        "icon": "monitor",
        "stats_schema": [
            {"key": "postureScore", "label": "Posture Score", "type": "score", "icon": "TrendingUp"},
            {"key": "neckAngle", "label": "Neck Angle", "type": "value", "unit": "°", "icon": "Activity"},
            {"key": "postureAlerts", "label": "Posture Alerts", "type": "count", "icon": "AlertTriangle"},
        ],
    },
]


class JoinRequest(BaseModel):
    mode: str = "interview"
    custom_mode: Optional[Dict[str, Any]] = None  # full custom mode config if mode="custom"


class StatField(BaseModel):
    key: str
    label: str
    type: str  # "score" | "count" | "status" | "value"
    icon: str
    unit: Optional[str] = None


class CustomModeRequest(BaseModel):
    id: str
    name: str
    description: str
    instructions: str
    greeting: str
    yolo: str = "yolo11n-pose.pt"
    fps: int = 1
    stats_schema: List[StatField]


@app.post("/join")
async def join(req: JoinRequest):
    client  = Stream(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)
    user_id = "candidate_" + secrets.token_hex(4)
    call_id = "call_" + secrets.token_hex(6)
    token   = client.create_token(user_id)

    # Get stats_schema for this mode to send back to frontend
    mode_config = next((m for m in BUILTIN_MODES if m["id"] == req.mode), BUILTIN_MODES[0])
    stats_schema = mode_config.get("stats_schema", [])
    if req.custom_mode and req.custom_mode.get("stats_schema"):
        stats_schema = req.custom_mode["stats_schema"]

    return {
        "user_id":      user_id,
        "token":        token,
        "api_key":      STREAM_API_KEY,
        "call_id":      call_id,
        "call_type":    "default",
        "mode":         req.mode,
        "stats_schema": stats_schema,
        "custom_mode":  req.custom_mode,
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
    return {"modes": BUILTIN_MODES}


@app.get("/modes/{mode_id}")
async def get_mode(mode_id: str):
    mode = next((m for m in BUILTIN_MODES if m["id"] == mode_id), None)
    if not mode:
        return {"error": "Mode not found"}
    return mode


@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)