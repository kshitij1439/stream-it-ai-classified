import asyncio
import os
import sys
from dotenv import load_dotenv

import logging
from vision_agents.core import Agent, Runner, User
from vision_agents.core.agents import AgentLauncher
from vision_agents.plugins import gemini, getstream, ultralytics

logger = logging.getLogger(__name__)

async def create_agent(**kwargs) -> Agent:
    agent = Agent(
        edge=getstream.Edge(),
        agent_user=User(name="AI Interview Coach"),
        instructions="You are a strict but kind AI interview coach. Watch the user's video feed and listen to their answers. Provide real-time feedback on their posture, eye contact, use of filler words, and the quality of their answers. Be concise.",
        llm=gemini.Realtime(fps=3),
        processors=[
            ultralytics.YOLOPoseProcessor(model_path="yolo11n-pose.pt")
        ],
    )
    return agent

async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    call = await agent.create_call(call_type, call_id)
    async with agent.join(call):
        await agent.llm.simple_response(
            text="Hello! I am your AI interview coach. Whenever you are ready, please introduce yourself."
        )
        await agent.finish()

if __name__ == "__main__":
    load_dotenv()
    if not os.getenv("STREAM_API_KEY") or not os.getenv("STREAM_API_SECRET"):
        print("ERROR: Please set STREAM_API_KEY and STREAM_API_SECRET in backend/.env!")
        sys.exit(1)
        
    if len(sys.argv) == 1:
        sys.argv.extend(["--call-type", "default", "--call-id", "interview_room_1"])
        
    Runner(AgentLauncher(create_agent=create_agent, join_call=join_call)).cli()
