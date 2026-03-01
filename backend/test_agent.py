import asyncio
import logging
import traceback
from agent import create_agent, join_call

logging.basicConfig(level=logging.INFO)

async def test():
    try:
        print("Creating agent...")
        # create mock agent
        agent = await create_agent(mode="interview", mode_config={})
        print("Agent created. Joining call...")
        # this will just try to join a dummy call and we'll see if it crashes.
        # Note: the call needs to be valid or we'll get an error creating call.
        # But let's see what happens.
        await join_call(agent, "default", "call_test_1234")
    except Exception as e:
        print("Exception caught:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
