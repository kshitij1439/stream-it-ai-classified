from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from getstream import Stream
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STREAM_API_KEY = os.getenv("STREAM_API_KEY")
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET")

@app.post("/join")
async def get_token():
    if not STREAM_API_KEY or not STREAM_API_SECRET:
        return {"error": "Missing STREAM_API_KEY or STREAM_API_SECRET in backend/.env"}
    
    client = Stream(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)
    user_id = "user_" + os.urandom(4).hex()
    token = client.create_token(user_id)
    return {
        "user_id": user_id, 
        "token": token, 
        "api_key": STREAM_API_KEY,
        "call_id": "interview_room_1"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
