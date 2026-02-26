from dotenv import load_dotenv

from vision_agents.core import Agent, AgentLauncher, User, Runner
from vision_agents.plugins import getstream, gemini, ultralytics

load_dotenv() # Automatically loads your keys from .env


async def create_agent(**kwargs) -> Agent:
    return Agent(
        edge=getstream.Edge(),
        agent_user=User(name="Assistant", id="agent"),
        instructions="You are a strict but kind AI interview coach. Watch the user's video feed and listen to their answers. Provide real-time feedback on their posture, eye contact, use of filler words, and the quality of their answers. Be concise.",
        llm=gemini.Realtime(fps=3),
        processors=[
            ultralytics.YOLOPoseProcessor(model_path="yolo11n-pose.pt")
        ],
    )

async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    await agent.create_user()
    call = await agent.create_call(call_type, call_id)
    import asyncio
    async with agent.join(call):
        await agent.simple_response("Hello! I am your AI interview coach. Please introduce yourself when you are ready.")
        await asyncio.Event().wait()

if __name__ == "__main__":
    Runner(AgentLauncher(create_agent=create_agent, join_call=join_call)).cli()