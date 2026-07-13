import os
from datetime import date, datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
from agents import Agent, Runner, WebSearchTool, function_tool
from pydantic import BaseModel, Field
import asyncio
import httpx

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY and not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
OPENWEATHER_GEOCODING_URL = "https://api.openweathermap.org/geo/1.0/direct"
OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"



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

class WeatherDay(BaseModel):
    """Weather forecast information for one trip day."""
    date: str = Field(description="The trip date in YYYY-MM-DD format.")
    summary: str = Field(description="A short weather summary for the day.")
    condition: Optional[str] = Field(default=None, description="The main weather condition.")
    low_temperature_c: Optional[int] = Field(default=None, description="The daily low temperature in Celsius.")
    high_temperature_c: Optional[int] = Field(default=None, description="The daily high temperature in Celsius.")
    forecast_available: bool = Field(description="Whether forecast data was available for this date.")

class Itinerary(BaseModel):
    """A complete structured vacation itinerary."""
    destination: str = Field(description="The destination for the trip.")
    trip_length_days: int = Field(description="The total length of the trip in days.")
    overview: str = Field(description="A short summary of the overall trip style and pacing.")
    days: list[ItineraryDay] = Field(description="The day-by-day itinerary.")
    weather: list[WeatherDay] = Field(
        default_factory=list,
        description="Weather forecast details for the trip dates, when available.",
    )
    sources: list[Source] = Field(
        default_factory=list,
        description="Sources used to support current recommendations.",
    )

def parse_date(value: Optional[str]) -> Optional[date]:
    """Safely parse a YYYY-MM-DD date string."""
    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None

def build_date_range(start_date: Optional[str], end_date: Optional[str]) -> list[date]:
    """Build a list of dates from start to end, inclusive."""
    parsed_start_date = parse_date(start_date)
    parsed_end_date = parse_date(end_date)

    if not parsed_start_date or not parsed_end_date or parsed_start_date > parsed_end_date:
        return []

    total_days = (parsed_end_date - parsed_start_date).days + 1
    return [parsed_start_date + timedelta(days=day_offset) for day_offset in range(total_days)]

async def get_coordinates(destination: str) -> dict:
    """Use OpenWeather geocoding to convert a destination into latitude and longitude."""
    if not OPENWEATHER_API_KEY:
        return {"error": "Weather data is unavailable because OPENWEATHER_API_KEY is missing."}

    params = {
        "q": destination,
        "limit": 1,
        "appid": OPENWEATHER_API_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(OPENWEATHER_GEOCODING_URL, params=params)
            response.raise_for_status()
            locations = response.json()
    except httpx.HTTPStatusError as error:
        return {"error": f"OpenWeather geocoding returned an error: {error.response.status_code}."}
    except httpx.RequestError:
        return {"error": "Could not connect to OpenWeather geocoding right now."}

    if not locations:
        return {"error": f"Could not find coordinates for {destination}."}

    location = locations[0]
    return {
        "name": location.get("name", destination),
        "state": location.get("state"),
        "country": location.get("country"),
        "lat": location["lat"],
        "lon": location["lon"],
    }

async def get_forecast_by_coordinates(lat: float, lon: float) -> dict:
    """Get OpenWeather's 5-day / 3-hour forecast for a latitude and longitude."""
    if not OPENWEATHER_API_KEY:
        return {"error": "Weather data is unavailable because OPENWEATHER_API_KEY is missing."}

    params = {
        "lat": lat,
        "lon": lon,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
    }

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(OPENWEATHER_FORECAST_URL, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as error:
        return {"error": f"OpenWeather forecast returned an error: {error.response.status_code}."}
    except httpx.RequestError:
        return {"error": "Could not connect to OpenWeather forecast right now."}

def group_forecast_entries_by_date(entries: list[dict]) -> dict[str, list[dict]]:
    """Group OpenWeather's 3-hour forecast entries by calendar date."""
    daily_forecasts: dict[str, list[dict]] = {}

    for entry in entries:
        forecast_date = entry.get("dt_txt", "").split(" ")[0]
        if forecast_date:
            daily_forecasts.setdefault(forecast_date, []).append(entry)

    return daily_forecasts

def summarize_one_forecast_day(forecast_date: str, day_entries: list[dict]) -> WeatherDay:
    """Create a structured weather summary for one day."""
    temperatures = [
        entry["main"]["temp"]
        for entry in day_entries
        if "main" in entry and "temp" in entry["main"]
    ]
    descriptions = [
        entry["weather"][0]["description"]
        for entry in day_entries
        if entry.get("weather")
    ]

    if not temperatures or not descriptions:
        return WeatherDay(
            date=forecast_date,
            summary="Weather data was found, but it could not be summarized.",
            forecast_available=False,
        )

    most_common_description = max(set(descriptions), key=descriptions.count)
    low_temperature = round(min(temperatures))
    high_temperature = round(max(temperatures))

    return WeatherDay(
        date=forecast_date,
        summary=f"{most_common_description}, around {low_temperature}-{high_temperature}°C.",
        condition=most_common_description,
        low_temperature_c=low_temperature,
        high_temperature_c=high_temperature,
        forecast_available=True,
    )

def build_unavailable_weather_day(forecast_date: date, destination: str) -> WeatherDay:
    """Create a weather entry for a trip day outside OpenWeather's free forecast window."""
    return WeatherDay(
        date=forecast_date.isoformat(),
        summary=(
            "Forecast is not available yet. OpenWeather's free forecast only covers "
            f"the next 5 days, so check closer to the trip for {destination}."
        ),
        forecast_available=False,
    )

async def fetch_weather_days(
    destination: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> dict:
    """Fetch structured weather data for each day in the requested trip date range."""
    location = await get_coordinates(destination)
    requested_dates = build_date_range(start_date, end_date)

    if location.get("error"):
        return {
            "destination": destination,
            "location": None,
            "days": [
                WeatherDay(
                    date=trip_date.isoformat(),
                    summary=location["error"],
                    forecast_available=False,
                ).model_dump()
                for trip_date in requested_dates
            ],
            "message": location["error"],
        }

    forecast = await get_forecast_by_coordinates(location["lat"], location["lon"])

    if forecast.get("error"):
        return {
            "destination": destination,
            "location": location,
            "days": [
                WeatherDay(
                    date=trip_date.isoformat(),
                    summary=forecast["error"],
                    forecast_available=False,
                ).model_dump()
                for trip_date in requested_dates
            ],
            "message": forecast["error"],
        }

    place_name = location["name"]
    if location.get("state"):
        place_name += f", {location['state']}"
    if location.get("country"):
        place_name += f", {location['country']}"

    forecast_entries_by_date = group_forecast_entries_by_date(forecast.get("list", []))

    if not requested_dates:
        requested_dates = [
            forecast_date
            for forecast_date in (
                parse_date(forecast_date_string)
                for forecast_date_string in forecast_entries_by_date.keys()
            )
            if forecast_date
        ]

    weather_days = []

    for trip_date in requested_dates:
        forecast_date = trip_date.isoformat()
        day_entries = forecast_entries_by_date.get(forecast_date)

        if day_entries:
            weather_days.append(summarize_one_forecast_day(forecast_date, day_entries))
        else:
            weather_days.append(build_unavailable_weather_day(trip_date, destination))

    return {
        "destination": destination,
        "location": {
            "name": place_name,
            "lat": location["lat"],
            "lon": location["lon"],
        },
        "days": [weather_day.model_dump() for weather_day in weather_days],
        "message": "Weather forecast loaded.",
    }

def format_weather_days(weather_days: list[dict]) -> str:
    """Format structured daily weather data into a plain-English string for the agent."""
    if not weather_days:
        return "Weather data is not available for the requested trip dates."

    return " ".join(
        f"{weather_day['date']}: {weather_day['summary']}"
        for weather_day in weather_days
    )

async def fetch_weather_summary(
    destination: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> str:
    """Fetch and summarize weather for a destination and optional date range."""
    weather_data = await fetch_weather_days(destination, start_date, end_date)
    location = weather_data.get("location")
    location_name = location["name"] if location else destination

    return (
        f"Weather forecast for {location_name}: "
        f"{format_weather_days(weather_data.get('days', []))}"
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
async def get_weather(destination: str, dates: Optional[str] = None) -> str:
    """Get weather information for a destination, optionally within a date range."""
    start_date = None
    end_date = None

    if dates and "through" in dates:
        start_date, end_date = [part.strip() for part in dates.split("through", 1)]

    return await fetch_weather_summary(destination, start_date, end_date)

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

def build_itinerary_prompt(
    destination: str,
    trip_length_label: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    preferences: Optional[str] = None,
) -> str:
    """Create the prompt sent to the trip planning agent."""
    date_context = ""
    preference_context = ""

    if start_date and end_date:
        date_context = f"The trip dates are {start_date} through {end_date}. "

    if preferences and preferences.strip():
        preference_context = (
            "The traveler shared these preferences and constraints: "
            f"{preferences.strip()} "
            "Use these details to choose restaurants, events, neighborhoods, pacing, "
            "and attractions when possible. "
        )

    return (
        f"Create a {trip_length_label} itinerary for {destination}. "
        f"{date_context}"
        f"{preference_context}"
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

async def create_itinerary(
    destination: str,
    tripLength: int,
    tripUnit: str,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    preferences: Optional[str] = None,
):
    trip_length_label = f"{tripLength} {tripUnit}"
    prompt = build_itinerary_prompt(
        destination,
        trip_length_label,
        startDate,
        endDate,
        preferences,
    )
    print(f"\nCreating a {trip_length_label} itinerary for {destination}...\n")
    result = await Runner.run(agent, prompt)
    itinerary = result.final_output
    weather_data = await fetch_weather_days(destination, startDate, endDate)
    itinerary.weather = [
        WeatherDay(**weather_day)
        for weather_day in weather_data.get("days", [])
    ]
    return itinerary
