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

@app.post("/join")
async def join():
    if not STREAM_API_KEY or not STREAM_API_SECRET:
        return {"error": "Missing STREAM_API_KEY or STREAM_API_SECRET in .env"}
    client  = Stream(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)
    user_id = "candidate_" + secrets.token_hex(4)
    token   = client.create_token(user_id)
    return {
        "user_id":   user_id,
        "token":     token,
        "api_key":   STREAM_API_KEY,
        "call_id":   "interview_room_1",
        "call_type": "default",
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)  # <-- port 8001, not 8000