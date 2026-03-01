from dotenv import load_dotenv
import logging
import asyncio
import traceback

from vision_agents.core import Agent, AgentLauncher, User, Runner
from vision_agents.plugins import getstream, gemini, ultralytics

try:
    from vision_agents.core.agents.agents import RealtimeAgentSpeechTranscriptionEvent
except ImportError:
    RealtimeAgentSpeechTranscriptionEvent = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
for noisy in ["aiortc","aioice","aiortc.rtcrtpsender","aiortc.rtcrtpreceiver",
              "aiortc.rtcdtlstransport","aiortc.rtcicetransport","aiortc.rtcpeerconnection",
              "aiortc.contrib.media","aioice.ice","aioice.turn","websockets","websockets.client"]:
    logging.getLogger(noisy).setLevel(logging.WARNING)

log = logging.getLogger(__name__)
load_dotenv()

# ── Fallback defaults (used only if frontend sends nothing) ───────────────────
DEFAULT_MODE = {
    "yolo": "yolo11n-pose.pt",
    "fps": 1,
    "instructions": "You are a helpful AI coach. Analyze the user's video and provide feedback.",
    "greeting": "Hello! I am your AI coach. Let's begin.",
    "stats_schema": [
        {"key": "confidence", "label": "Confidence", "type": "score", "icon": "TrendingUp"},
    ],
}


def extract_text_from_event(event) -> str | None:
    for attr in ("text", "transcript", "content", "message", "data", "output", "response", "speech"):
        val = getattr(event, attr, None)
        if isinstance(val, str) and len(val.strip()) > 3:
            return val.strip()
        if hasattr(val, "text") and isinstance(val.text, str) and len(val.text.strip()) > 3:
            return val.text.strip()
    return None


def is_speech_event(event) -> bool:
    name = type(event).__name__.lower()
    return any(k in name for k in ("speech", "transcript", "utterance", "response", "output", "agent"))


# ── Agent factory ─────────────────────────────────────────────────────────────
async def create_agent(**kwargs) -> Agent:
    # mode_config is the full object sent from the frontend POST body
    mode_config = kwargs.get("mode_config") or {}
    mode_name   = kwargs.get("mode", "interview")
    cfg = { **DEFAULT_MODE, **mode_config }  # frontend wins, fallback fills gaps

    log.info(f"🛠  Creating agent | mode='{mode_name}' | fps={cfg['fps']} | yolo={cfg['yolo']}")

    try:
        agent = Agent(
            edge=getstream.Edge(),
            agent_user=User(name="Assistant", id="agent"),
            instructions=cfg["instructions"],
            llm=gemini.Realtime(fps=cfg["fps"]),
            processors=[
                ultralytics.YOLOPoseProcessor(model_path=cfg["yolo"], fps=cfg["fps"])
            ],
        )
        log.info("✅ Agent created successfully")
        return agent
    except Exception:
        log.error("❌ Failed to create agent:\n" + traceback.format_exc())
        raise


# ── Call handler ──────────────────────────────────────────────────────────────
async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    mode_config = kwargs.get("mode_config") or {}
    mode_name   = kwargs.get("mode", "interview")
    cfg = { **DEFAULT_MODE, **mode_config }

    log.info(f"📞 join_call() | call_type={call_type} | call_id={call_id} | mode={mode_name}")

    try:
        await agent.create_user()
    except Exception:
        log.error("❌ Failed to create agent user:\n" + traceback.format_exc())
        raise

    try:
        call = await agent.create_call(call_type, call_id)
        log.info(f"📲 Call object created: {call_id}")
    except Exception:
        log.error("❌ Failed to create call:\n" + traceback.format_exc())
        raise

    speech_count = 0
    seen_event_types: set[str] = set()

    @agent.events.subscribe
    async def on_any_event(event):
        nonlocal speech_count
        event_type = type(event).__name__
        if event_type not in seen_event_types:
            seen_event_types.add(event_type)
            attrs = [a for a in dir(event) if not a.startswith("_") and not callable(getattr(event, a, None))]
            log.info(f"🔔 NEW event type: '{event_type}' | attrs: {attrs}")
        try:
            is_known = (RealtimeAgentSpeechTranscriptionEvent is not None
                        and isinstance(event, RealtimeAgentSpeechTranscriptionEvent))
            if not (is_known or is_speech_event(event)):
                return
            text = extract_text_from_event(event)
            if not text:
                return
            speech_count += 1
            log.info(f"🗣  Agent speech [{speech_count}]: {text[:120]}")
            await call.send_custom_event({
                "type": "coaching_feedback",
                "message": text,
                "feedback_type": "info",
                "mode": mode_name,
                "stats_schema": cfg["stats_schema"],
            })
            log.info(f"📤 Custom event sent [{speech_count}]")
        except Exception:
            log.error(f"❌ Error processing event '{event_type}':\n" + traceback.format_exc())

    try:
        log.info(f"🚀 Joining call '{call_id}' ...")
        async with agent.join(call):
            log.info("✅ Agent joined call successfully")
            try:
                await agent.simple_response(cfg["greeting"])
                log.info("✅ Greeting sent")
            except Exception:
                log.error("❌ Failed to send greeting:\n" + traceback.format_exc())
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                log.info("🛑 Agent wait cancelled")
        log.info("👋 Agent exited call context cleanly")
    except asyncio.CancelledError:
        log.info("🛑 join_call cancelled")
    except Exception:
        log.error("❌ Error during call session:\n" + traceback.format_exc())
        raise


if __name__ == "__main__":
    log.info("🎬 Starting vision-agents runner...")
    Runner(AgentLauncher(create_agent=create_agent, join_call=join_call)).cli()