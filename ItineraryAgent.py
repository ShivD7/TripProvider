import os
from typing import Optional
from dotenv import load_dotenv
from agents import Agent, Runner, function_tool
import asyncio

load_dotenv()

OPENAI_API_KEY = os.getenv("API_KEY")

@function_tool
def trip_fun_fact() -> str:
    """Return a short fact about the tourism sector."""
    return "The world's most visited country is France!"

@function_tool
def search_attractions(destination: str) -> str:
    """Find notable attractions and points of interest for a destination."""
    return f"Placeholder attractions for {destination}."

@function_tool
def search_restaurants(destination: str, area: Optional[str] = None) -> str:
    """Find restaurant ideas for a destination, optionally focused on a specific area."""
    if area:
        return f"Placeholder restaurants in {area}, {destination}."
    return f"Placeholder restaurants for {destination}."

@function_tool
def search_events(destination: str, dates: Optional[str] = None) -> str:
    """Find events happening in a destination, optionally within a date range."""
    if dates:
        return f"Placeholder events for {destination} during {dates}."
    return f"Placeholder events for {destination}."

@function_tool
def get_weather(destination: str, dates: Optional[str] = None) -> str:
    """Get weather information for a destination, optionally within a date range."""
    if dates:
        return f"Placeholder weather for {destination} during {dates}."
    return f"Placeholder weather for {destination}."

@function_tool
def estimate_travel_time(
    start_location: str,
    end_location: str,
    transport_mode: str = "walking",
) -> str:
    """Estimate travel time between two locations using a given transport mode."""
    return (
        f"Placeholder travel time from {start_location} to {end_location} "
        f"by {transport_mode}."
    )

agent = Agent(
    name="Trip Planner",
    instructions=(
        "You plan someone's trip given the destination and length of the vacation. "
        "Use the available tools when you need information about attractions, "
        "restaurants, events, weather, travel times, or general travel facts."
    ),
    tools=[
        trip_fun_fact,
        search_attractions,
        search_restaurants,
        search_events,
        get_weather,
        estimate_travel_time,
    ],
    model="gpt-5.5",
)

async def main():
    result = await Runner.run(agent, "Create a 3 day itinerary for Paris.")
    print(result.final_output)

asyncio.run(main())

