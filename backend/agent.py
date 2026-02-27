from dotenv import load_dotenv
import logging
import asyncio
import traceback

from vision_agents.core import Agent, AgentLauncher, User, Runner
from vision_agents.core.agents.agents import RealtimeAgentSpeechTranscriptionEvent
from vision_agents.plugins import getstream, gemini, ultralytics

# ── Logging setup ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)

# Suppress noisy debug spam from these libraries
for noisy in [
    "aiortc", "aioice", "aiortc.rtcrtpsender",
    "aiortc.rtcrtpreceiver", "aiortc.rtcdtlstransport",
    "aiortc.rtcicetransport", "aiortc.rtcpeerconnection",
    "aiortc.contrib.media", "aioice.ice", "aioice.turn",
    "websockets", "websockets.client",
]:
    logging.getLogger(noisy).setLevel(logging.WARNING)

# Keep these at INFO so we see important events
for important in [
    "getstream", "vision_agents", "__main__",
    "getstream.video.rtc.coordinator.ws",
    "getstream.video.rtc.connection_manager",
    "getstream.video.rtc.pc",
]:
    logging.getLogger(important).setLevel(logging.INFO)

log = logging.getLogger(__name__)

load_dotenv()

# ── Mode configs ───────────────────────────────────────────────────────────────
MODES = {
    "interview": {
        "yolo": "yolo11n-pose.pt",
        "fps": 1,
        "instructions": (
            "You are a strict but kind AI interview coach. Watch the user's video feed and listen to their answers. "
            "Ask them specific technical and behavioral questions. "
            "Provide real-time feedback. VERY IMPORTANT: To update the UI metrics, you MUST use these key phrases in your feedback when relevant: "
            "'Filler words: X' (where X is count of um/uhs), 'Posture issue' (if slouching), 'Great eye contact' or 'Needs eye contact', 'Good pace' or 'Too fast'. "
            "Be concise."
        ),
        "greeting": "Hello! I am your AI interview coach. Please introduce yourself when you are ready."
    },
    "gym": {
        "yolo": "yolo11n-pose.pt",
        "fps": 2,
        "instructions": (
            "You are a strict, safety-focused gym trainer. Watch the user's video feed, tracking their body posture and form. "
            "Count reps verbally if they are doing an exercise like squats or bicep curls. "
            "Correct their form in real-time. VERY IMPORTANT: Use phrases like 'Go deeper', 'Keep your chest up', 'Slow the descent', "
            "'Great form', or 'Watch your back' based on their biomechanics. Be highly observant and concise."
        ),
        "greeting": "Let's get to work! I'm your AI gym trainer. Stand back so I can see your full body, and tell me what exercise we are doing today."
    },
    "speaking": {
        "yolo": "yolo11n-pose.pt",
        "fps": 1,
        "instructions": (
            "You are an encouraging public speaking coach. Watch the user's video feed and listen to their speech. "
            "Focus on their confidence, body language, and communication clarity. "
            "VERY IMPORTANT: To update the UI metrics, you MUST use these key phrases in your feedback when relevant: "
            "'Great confidence', 'Try planting your feet' (if swaying), 'Open your arms' (if closed body language), "
            "'Filler words: X' (where X is count of um/uhs), 'Good pace' or 'Too fast'. Be concise."
        ),
        "greeting": "Hello! I am your public speaking coach. Let's practice. Whenever you are ready, start your presentation or speech."
    }
}


# ── Agent factory ──────────────────────────────────────────────────────────────
async def create_agent(**kwargs) -> Agent:
    mode_name = kwargs.get("mode", "interview")
    mode = MODES.get(mode_name, MODES["interview"])
    log.info(f"🛠  Creating agent in mode: '{mode_name}'")

    try:
        agent = Agent(
            edge=getstream.Edge(),
            agent_user=User(name="Assistant", id="agent"),
            instructions=mode["instructions"],
            llm=gemini.Realtime(fps=mode["fps"]),
            processors=[
                ultralytics.YOLOPoseProcessor(model_path=mode["yolo"], fps=mode["fps"])
            ],
        )
        log.info("✅ Agent created successfully")
        return agent
    except Exception:
        log.error("❌ Failed to create agent:\n" + traceback.format_exc())
        raise


# ── Call handler ───────────────────────────────────────────────────────────────
async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    mode_name = kwargs.get("mode", "interview")
    mode = MODES.get(mode_name, MODES["interview"])
    log.info(f"📞 join_call() called | call_type={call_type} | call_id={call_id} | mode={mode_name}")

    try:
        await agent.create_user()
        log.info("👤 Agent user created")
    except Exception:
        log.error("❌ Failed to create agent user:\n" + traceback.format_exc())
        raise

    try:
        call = await agent.create_call(call_type, call_id)
        log.info(f"📲 Call object created: {call_id}")
    except Exception:
        log.error("❌ Failed to create call:\n" + traceback.format_exc())
        raise

    # ── Event listener: forward agent speech → UI ──────────────────────────
    speech_count = 0

    @agent.events.subscribe
    async def on_agent_speech(event: RealtimeAgentSpeechTranscriptionEvent):
        nonlocal speech_count
        try:
            if type(event).__name__ == "RealtimeAgentSpeechTranscriptionEvent":
                text = getattr(event, "text", None)
                if text:
                    speech_count += 1
                    log.info(f"🗣  Agent speech [{speech_count}]: {text[:120]}{'...' if len(text) > 120 else ''}")
                    await call.send_custom_event({
                        "type": "coaching_feedback",
                        "message": text,
                        "feedback_type": "info"
                    })
                    log.debug(f"📤 Custom event sent for speech [{speech_count}]")
        except Exception:
            log.error("❌ Error in on_agent_speech handler:\n" + traceback.format_exc())

    # ── Join the call ──────────────────────────────────────────────────────
    try:
        log.info(f"🚀 Joining call '{call_id}' ...")
        async with agent.join(call):
            log.info("✅ Agent joined call successfully")

            # Send greeting
            try:
                log.info(f"👋 Sending greeting: '{mode['greeting']}'")
                await agent.simple_response(mode["greeting"])
                log.info("✅ Greeting sent")
            except Exception:
                log.error("❌ Failed to send greeting:\n" + traceback.format_exc())

            # Wait indefinitely until the call ends
            log.info("⏳ Agent waiting in call (press Ctrl+C or end call to stop)...")
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                log.info("🛑 Agent wait cancelled — call ending")

        log.info("👋 Agent exited call context cleanly")

    except asyncio.CancelledError:
        log.info("🛑 join_call cancelled")
    except Exception:
        log.error("❌ Error during call session:\n" + traceback.format_exc())
        raise


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    log.info("🎬 Starting vision-agents runner...")
    Runner(AgentLauncher(create_agent=create_agent, join_call=join_call)).cli()