import os
from typing import Optional
from dotenv import load_dotenv
from agents import Agent, Runner, WebSearchTool, function_tool
from pydantic import BaseModel, Field
import asyncio

load_dotenv()

OPENAI_API_KEY = os.getenv("API_KEY")
if OPENAI_API_KEY and not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY



class Source(BaseModel):
    """A source used to support an itinerary recommendation."""
    title: str = Field(description="The name or title of the source.")
    url: str = Field(description="A URL for the source.")

class DaySection(BaseModel):
    """A planned part of a travel day."""
    title: str = Field(description="A short title for this part of the day.")
    description: str = Field(description="What the traveler should do during this section.")
    location: Optional[str] = Field(
        default=None,
        description="The main place, attraction, or neighborhood for this section.",
    )
    estimated_duration: Optional[str] = Field(
        default=None,
        description="Rough time needed, such as '2 hours' or 'Half day'.",
    )

class ItineraryDay(BaseModel):
    """One day in the generated itinerary."""
    day_number: int = Field(description="The day number, starting at 1.")
    theme: str = Field(description="The main theme or focus for the day.")
    morning: DaySection
    afternoon: DaySection
    evening: DaySection
    notes: list[str] = Field(
        default_factory=list,
        description="Useful tips, warnings, booking notes, or pacing suggestions for the day.",
    )

class Itinerary(BaseModel):
    """A complete structured vacation itinerary."""
    destination: str = Field(description="The destination for the trip.")
    trip_length_days: int = Field(description="The total length of the trip in days.")
    overview: str = Field(description="A short summary of the overall trip style and pacing.")
    days: list[ItineraryDay] = Field(description="The day-by-day itinerary.")
    sources: list[Source] = Field(
        default_factory=list,
        description="Sources used to support current recommendations.",
    )

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
        "Return the itinerary using the required structured output schema. "
        "Use web search when you need current information about attractions, "
        "places to visit, neighborhoods, opening details, or source-backed travel "
        "recommendations. Use the other available tools when you need information "
        "about restaurants, events, weather, travel times, or general travel facts. "
        "Create exactly one itinerary day for each requested trip day."
    ),
    tools=[
        WebSearchTool(),
        search_restaurants,
        search_events,
        get_weather,
        estimate_travel_time,
    ],
    model="gpt-5.5",
    output_type=Itinerary,
)

def build_itinerary_prompt(destination: str, trip_length: int) -> str:
    """Create the prompt sent to the trip planning agent."""
    return (
        f"Create a {trip_length}  itinerary for {destination}. "
        "Each day must include a theme, morning plan, afternoon plan, evening plan, "
        "and practical notes. Use web search for current attraction and travel "
        "information. Include source URLs when available."
    )

def format_day_section(label: str, section: DaySection) -> str:
    """Format one part of the day for human-readable output."""
    details = [f"{label}: {section.title}", f"  {section.description}"]

    if section.location:
        details.append(f"  Location: {section.location}")

    if section.estimated_duration:
        details.append(f"  Estimated time: {section.estimated_duration}")

    return "\n".join(details)

def format_itinerary(itinerary: Itinerary) -> str:
    """Turn the structured itinerary object into a plain-English itinerary."""
    lines = [
        f"{itinerary.trip_length_days} Day Itinerary for {itinerary.destination}",
        "=" * (len(itinerary.destination) + 24),
        "",
        "Overview",
        itinerary.overview,
        "",
    ]

    for day in itinerary.days:
        lines.extend(
            [
                f"Day {day.day_number}: {day.theme}",
                "-" * (len(day.theme) + len(f"Day {day.day_number}: ")),
                format_day_section("Morning", day.morning),
                "",
                format_day_section("Afternoon", day.afternoon),
                "",
                format_day_section("Evening", day.evening),
            ]
        )

        if day.notes:
            lines.extend(["", "Notes:"])
            lines.extend(f"- {note}" for note in day.notes)

        lines.append("")

    if itinerary.sources:
        lines.append("Sources")
        lines.extend(f"- {source.title}: {source.url}" for source in itinerary.sources)

    return "\n".join(lines).strip()

async def create_itinerary(destination: str, tripLength: int, tripUnit: str):
    prompt = build_itinerary_prompt(destination, str(tripLength) + " " + tripUnit)
    print(f"\nCreating a {str(tripLength) + " " + tripUnit} itinerary for {destination}...\n")
    result = await Runner.run(agent, prompt)
    itinerary = result.final_output
    return format_itinerary(itinerary)


