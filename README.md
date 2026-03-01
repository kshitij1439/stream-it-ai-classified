# Real-Time Interview Coach

An AI-powered interview coach built with Stream's Vision Agents SDK. It watches you, listens to your answers, and gives you real-time feedback on posture, filler words, and answer quality.

## Features
- **Gemini Realtime**: Core LLM for video and voice processing.
- **YOLO**: Posture and expression analysis.
- **Deepgram**: Fast STT for filler word detection.
- **ElevenLabs**: Warm TTS coaching voice feedback.

## Requirements
- Node.js >= 18
- Python 3.12
- `uv` Python package manager

## Quick Start Configuration

### 1. Install Dependencies
```bash
make setup
```

### 2. Configure Environment
```bash
make env
```
Open `backend/.env` and add your API keys. You will need:
- Stream API key (Free tier at getstream.io)
- Gemini API key
- Deepgram API key
- ElevenLabs API key

### 3. Run Application
You will need three separate terminal windows:
```bash
# Terminal 1: FastAPI Token Server
make dev-server ------------removed

# Terminal 2: Vision Agents Coaching backend
make dev-agent ------------removed

# Terminal 3: React Frontend UI
make dev-frontend ------------removed
```

Then visit `http://localhost:5173`.
