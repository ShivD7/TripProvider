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
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_API_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
TRIPPROVIDER_USER_AGENT = os.getenv(
    "TRIPPROVIDER_USER_AGENT",
    "TripProvider learning project",
)



class Source(BaseModel):
    """A source used to support an itinerary recommendation."""
    title: str = Field(description="The name or title of the source.")
    url: str = Field(description="A URL for the source.")

class DiningSuggestion(BaseModel):
    """A place to eat that fits this part of the day and the traveler's preferences."""
    restaurant_name: str = Field(description="The name of a real restaurant or food venue.")
    cuisine: Optional[str] = Field(default=None, description="The type of food served.")
    location: Optional[str] = Field(
        default=None,
        description="The address or neighborhood where the restaurant is located.",
    )
    why_it_fits: str = Field(
        description=(
            "A concise explanation of why this restaurant matches the traveler's "
            "preferences and this part of the itinerary."
        )
    )

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
    dining_suggestion: DiningSuggestion = Field(
        description="A nearby place to eat during this part of the day."
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

class ToolUsage(BaseModel):
    """Information about an external tool used while building the itinerary."""
    tool_name: str = Field(description="The name of the tool that was used.")
    status: str = Field(description="A short status such as used, unavailable, or skipped.")
    summary: str = Field(description="A plain-English summary of what the tool returned.")
    sample_results: list[str] = Field(
        default_factory=list,
        description="A few human-readable examples returned by the tool.",
    )

class EventSuggestion(BaseModel):
    """One current event found for the traveler's destination and dates."""
    name: str = Field(description="The name of the event.")
    date: Optional[str] = Field(default=None, description="The event date, if known.")
    time: Optional[str] = Field(default=None, description="The event time, if known.")
    venue: Optional[str] = Field(default=None, description="The venue or event location.")
    category: Optional[str] = Field(default=None, description="The broad event type.")
    url: Optional[str] = Field(default=None, description="A source URL for the event.")
    why_it_fits: str = Field(
        description="A short explanation of why the event fits the destination, dates, or preferences."
    )

class EventSearchResult(BaseModel):
    """Structured event search results returned by the web search agent."""
    destination: str = Field(description="The destination searched for events.")
    date_range: Optional[str] = Field(default=None, description="The date range used for the search.")
    summary: str = Field(description="A short summary of the event search result.")
    events: list[EventSuggestion] = Field(default_factory=list)

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
    tool_usage: list[ToolUsage] = Field(
        default_factory=list,
        description="External tools used to support the generated itinerary.",
    )
    sources: list[Source] = Field(
        default_factory=list,
        description="Sources used to support current recommendations.",
    )

event_search_agent = Agent(
    name="Local Event Searcher",
    instructions=(
        "Use web search to find real, current events in or near the requested "
        "destination and date range. Prefer official event pages, venue calendars, "
        "tourism boards, festival pages, and reputable ticketing pages. Return only "
        "events that appear relevant to the traveler. Do not invent events. If exact "
        "dates or times are not available, leave those fields blank and explain the "
        "uncertainty in the summary."
    ),
    tools=[WebSearchTool()],
    model="gpt-5.5",
    output_type=EventSearchResult,
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

def parse_date_range_text(dates: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """Parse a simple 'start through end' date string used by the agent tool."""
    if not dates:
        return None, None

    if "through" in dates:
        start_date, end_date = [part.strip() for part in dates.split("through", 1)]
        return start_date, end_date

    parsed_date = parse_date(dates.strip())
    if parsed_date:
        return parsed_date.isoformat(), parsed_date.isoformat()

    return None, None

async def geocode_with_nominatim(query: str) -> dict:
    """Use OpenStreetMap Nominatim to convert a place name into coordinates."""
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
    }
    headers = {"User-Agent": TRIPPROVIDER_USER_AGENT}

    try:
        async with httpx.AsyncClient(timeout=12, headers=headers) as client:
            response = await client.get(NOMINATIM_SEARCH_URL, params=params)
            response.raise_for_status()
            locations = response.json()
    except httpx.HTTPStatusError as error:
        return {"error": f"Nominatim returned an error: {error.response.status_code}."}
    except httpx.RequestError:
        return {"error": "Could not connect to Nominatim right now."}

    if not locations:
        return {"error": f"Could not find coordinates for {query}."}

    location = locations[0]
    return {
        "name": location.get("display_name", query),
        "lat": float(location["lat"]),
        "lon": float(location["lon"]),
    }

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
async def search_restaurants(
    destination: str,
    area: Optional[str] = None,
    cuisine: Optional[str] = None,
    limit: int = 8,
) -> str:
    """Find nearby restaurants using OpenStreetMap and Overpass."""
    restaurant_data = await fetch_nearby_restaurants(destination, area, cuisine, limit)
    return format_restaurant_results(restaurant_data)

def build_restaurant_search_query(destination: str, area: Optional[str] = None) -> str:
    """Build the text query used for restaurant geocoding."""
    if area and area.strip():
        return f"{area.strip()}, {destination}"

    return destination

def build_overpass_restaurant_query(
    lat: float,
    lon: float,
    radius_meters: int,
    result_limit: int,
) -> str:
    """Build an Overpass query for restaurants and casual food places near coordinates."""
    amenities = ["restaurant", "cafe", "fast_food", "food_court"]
    selectors = []

    for amenity in amenities:
        selectors.extend(
            [
                f'node(around:{radius_meters},{lat},{lon})["amenity"="{amenity}"];',
                f'way(around:{radius_meters},{lat},{lon})["amenity"="{amenity}"];',
                f'relation(around:{radius_meters},{lat},{lon})["amenity"="{amenity}"];',
            ]
        )

    selector_block = "\n      ".join(selectors)

    return f"""
    [out:json][timeout:15];
    (
      {selector_block}
    );
    out center tags {result_limit};
    """

def get_osm_element_coordinates(element: dict) -> tuple[Optional[float], Optional[float]]:
    """Read coordinates from either a point element or a way/relation center."""
    if "lat" in element and "lon" in element:
        return element["lat"], element["lon"]

    center = element.get("center", {})
    return center.get("lat"), center.get("lon")

def get_osm_address(tags: dict) -> Optional[str]:
    """Build a compact address from common OpenStreetMap address tags."""
    address_parts = [
        " ".join(
            part
            for part in [tags.get("addr:housenumber"), tags.get("addr:street")]
            if part
        ),
        tags.get("addr:city"),
    ]
    address = ", ".join(part for part in address_parts if part)
    return address or tags.get("addr:full")

def normalize_restaurant_element(element: dict) -> Optional[dict]:
    """Convert one Overpass element into a restaurant dictionary."""
    tags = element.get("tags", {})
    name = tags.get("name")

    if not name:
        return None

    lat, lon = get_osm_element_coordinates(element)

    return {
        "name": name,
        "category": tags.get("amenity"),
        "cuisine": tags.get("cuisine"),
        "address": get_osm_address(tags),
        "opening_hours": tags.get("opening_hours"),
        "website": tags.get("website") or tags.get("contact:website"),
        "phone": tags.get("phone") or tags.get("contact:phone"),
        "lat": lat,
        "lon": lon,
        "osm_url": f"https://www.openstreetmap.org/{element.get('type')}/{element.get('id')}",
    }

def restaurant_matches_cuisine(restaurant: dict, cuisine: Optional[str]) -> bool:
    """Check whether a restaurant's cuisine tag matches the requested cuisine."""
    if not cuisine or not cuisine.strip():
        return True

    cuisine_query = cuisine.strip().lower()
    restaurant_cuisine = (restaurant.get("cuisine") or "").lower()
    restaurant_name = restaurant.get("name", "").lower()

    return cuisine_query in restaurant_cuisine or cuisine_query in restaurant_name

def rank_restaurants(restaurants: list[dict], cuisine: Optional[str]) -> list[dict]:
    """Prioritize cuisine matches and places with richer useful metadata."""
    def score(restaurant: dict) -> tuple[int, int, str]:
        cuisine_score = 1 if restaurant_matches_cuisine(restaurant, cuisine) else 0
        metadata_score = sum(
            1
            for key in ["cuisine", "address", "opening_hours", "website", "phone"]
            if restaurant.get(key)
        )
        return cuisine_score, metadata_score, restaurant["name"].lower()

    return sorted(restaurants, key=score, reverse=True)

async def fetch_nearby_restaurants(
    destination: str,
    area: Optional[str] = None,
    cuisine: Optional[str] = None,
    limit: int = 8,
    radius_meters: int = 1800,
) -> dict:
    """Search OpenStreetMap for restaurants near a destination or neighborhood."""
    search_query = build_restaurant_search_query(destination, area)
    location = await geocode_with_nominatim(search_query)

    if location.get("error"):
        return {
            "destination": destination,
            "area": area,
            "restaurants": [],
            "message": location["error"],
        }

    overpass_query = build_overpass_restaurant_query(
        location["lat"],
        location["lon"],
        radius_meters,
        max(limit * 3, 20),
    )
    last_error = "Overpass could not return restaurant data right now."
    overpass_data = None

    headers = {
        "User-Agent": TRIPPROVIDER_USER_AGENT,
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        for overpass_url in OVERPASS_API_URLS:
            try:
                response = await client.post(overpass_url, data={"data": overpass_query})
                response.raise_for_status()
                overpass_data = response.json()
                break
            except httpx.HTTPStatusError as error:
                last_error = f"Overpass returned an error: {error.response.status_code}."
            except httpx.RequestError:
                last_error = "Could not connect to Overpass right now."

    if not overpass_data:
        return {
            "destination": destination,
            "area": area,
            "restaurants": [],
            "message": last_error,
        }

    restaurants = [
        restaurant
        for restaurant in (
            normalize_restaurant_element(element)
            for element in overpass_data.get("elements", [])
        )
        if restaurant
    ]
    ranked_restaurants = rank_restaurants(restaurants, cuisine)
    matching_restaurants = [
        restaurant
        for restaurant in ranked_restaurants
        if restaurant_matches_cuisine(restaurant, cuisine)
    ]
    chosen_restaurants = matching_restaurants[:limit] or ranked_restaurants[:limit]

    return {
        "destination": destination,
        "area": area,
        "search_location": location,
        "cuisine": cuisine,
        "restaurants": chosen_restaurants,
        "message": f"Found {len(chosen_restaurants)} restaurant options from OpenStreetMap.",
    }

def format_restaurant_results(restaurant_data: dict) -> str:
    """Format restaurant search results for the itinerary agent."""
    restaurants = restaurant_data.get("restaurants", [])

    if not restaurants:
        return restaurant_data.get("message", "No nearby restaurants were found.")

    location_name = restaurant_data.get("search_location", {}).get("name")
    heading = "Nearby restaurant options"

    if location_name:
        heading += f" near {location_name}"

    lines = [heading + ":"]

    for index, restaurant in enumerate(restaurants, start=1):
        details = [
            restaurant["name"],
            restaurant.get("category"),
            restaurant.get("cuisine"),
            restaurant.get("address"),
            restaurant.get("opening_hours"),
            restaurant.get("osm_url"),
        ]
        lines.append(f"{index}. " + " | ".join(str(detail) for detail in details if detail))

    lines.append(
        "Note: OpenStreetMap data does not reliably include ratings, reviews, or price levels."
    )
    return "\n".join(lines)

def build_event_search_prompt(
    destination: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    interests: Optional[str] = None,
    limit: int = 8,
) -> str:
    """Create the prompt used by the web-search event agent."""
    date_context = "during the trip dates, if current event dates are available"

    if start_date and end_date:
        date_context = f"from {start_date} through {end_date}"
    elif start_date:
        date_context = f"on or after {start_date}"

    interest_context = (
        f"The traveler is interested in: {interests.strip()}."
        if interests and interests.strip()
        else "Prioritize broadly useful local events, festivals, performances, sports, markets, and cultural events."
    )

    return (
        f"Find up to {min(max(limit, 1), 20)} real events in or near {destination} "
        f"{date_context}. {interest_context} Include the event name, date, time if known, "
        "venue, category, source URL, and a short reason it fits the trip. Use current web "
        "sources and do not invent events."
    )

async def fetch_events_with_web_search(
    destination: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    interests: Optional[str] = None,
    limit: int = 8,
) -> dict:
    """Search the web for events near a destination and date range."""
    prompt = build_event_search_prompt(destination, start_date, end_date, interests, limit)

    try:
        result = await Runner.run(event_search_agent, prompt)
    except Exception:
        return {
            "destination": destination,
            "events": [],
            "message": "Web event search could not run. Make sure OpenAI API access and credits are configured.",
        }

    event_result = result.final_output
    events = [event.model_dump() for event in event_result.events[:limit]]

    if not events:
        return {
            "destination": event_result.destination or destination,
            "date_range": event_result.date_range,
            "events": [],
            "message": event_result.summary or "No current events were found by web search.",
        }

    return {
        "destination": event_result.destination or destination,
        "date_range": event_result.date_range,
        "events": events,
        "message": event_result.summary or f"Found {len(events)} event options using web search.",
    }

def format_event_results(event_data: dict) -> str:
    """Format web event search results for the itinerary agent."""
    events = event_data.get("events", [])

    if not events:
        return event_data.get("message", "No events were found.")

    lines = [f"Event options for {event_data.get('destination', 'the destination')}:"]

    for index, event in enumerate(events, start=1):
        date_time = " ".join(part for part in [event.get("date"), event.get("time")] if part)
        details = [
            event["name"],
            date_time,
            event.get("category"),
            event.get("venue"),
            event.get("url"),
            event.get("why_it_fits"),
        ]
        lines.append(f"{index}. " + " | ".join(str(detail) for detail in details if detail))

    return "\n".join(lines)

async def build_restaurant_tool_usage(destination: str, preferences: Optional[str] = None) -> ToolUsage:
    """Run a lightweight restaurant search and summarize the results for the UI."""
    restaurant_data = await fetch_nearby_restaurants(
        destination=destination,
        cuisine=preferences,
        limit=5,
        radius_meters=2200,
    )
    restaurants = restaurant_data.get("restaurants", [])

    if not restaurants:
        return ToolUsage(
            tool_name="search_restaurants",
            status="unavailable",
            summary=restaurant_data.get("message", "Restaurant search did not return results."),
        )

    sample_results = []

    for restaurant in restaurants[:5]:
        details = [
            restaurant["name"],
            restaurant.get("cuisine"),
            restaurant.get("address"),
        ]
        sample_results.append(" | ".join(detail for detail in details if detail))

    return ToolUsage(
        tool_name="search_restaurants",
        status="used",
        summary=(
            f"{restaurant_data.get('message')} These OpenStreetMap results were "
            "available to ground dining suggestions."
        ),
        sample_results=sample_results,
    )

async def build_event_tool_usage(
    destination: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    preferences: Optional[str] = None,
) -> ToolUsage:
    """Run an event search and summarize the results for the UI."""
    event_data = await fetch_events_with_web_search(destination, start_date, end_date, preferences, limit=5)
    events = event_data.get("events", [])

    if not events:
        return ToolUsage(
            tool_name="search_events",
            status="unavailable",
            summary=event_data.get("message", "Event search did not return results."),
        )

    sample_results = []

    for event in events[:5]:
        date_time = " ".join(part for part in [event.get("date"), event.get("time")] if part)
        details = [
            event["name"],
            date_time,
            event.get("venue"),
            event.get("category"),
        ]
        sample_results.append(" | ".join(detail for detail in details if detail))

    return ToolUsage(
        tool_name="search_events",
        status="used",
        summary=(
            f"{event_data.get('message')} These web search results were available "
            "to support date-aware event suggestions."
        ),
        sample_results=sample_results,
    )

@function_tool
async def search_events(
    destination: str,
    dates: Optional[str] = None,
    interests: Optional[str] = None,
    limit: int = 8,
) -> str:
    """Find current events happening in a destination, optionally within a date range."""
    start_date, end_date = parse_date_range_text(dates)
    event_data = await fetch_events_with_web_search(destination, start_date, end_date, interests, limit)
    return format_event_results(event_data)

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
        "Create exactly one itinerary day for each requested trip day. "
        "Every morning, afternoon, and evening section must include a real, nearby "
        "dining suggestion selected with the traveler's food, budget, dietary, and "
        "accessibility preferences in mind. Use the restaurant search tool to find "
        "grounded options near the activities. Use the event search tool when trip "
        "dates are available and the traveler may benefit from concerts, sports, "
        "shows, festivals, or other time-specific events."
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
    else:
        preference_context = (
            "The traveler did not provide dining preferences, so choose a varied mix "
            "of well-located local food options at broadly accessible price points. "
        )

    return (
        f"Create a {trip_length_label} itinerary for {destination}. "
        f"{date_context}"
        f"{preference_context}"
        "Each day must include a theme, morning plan, afternoon plan, evening plan, "
        "and practical notes. Every morning, afternoon, and evening section must "
        "include one real dining suggestion near that section's activities. For each "
        "suggestion, provide the restaurant name, cuisine, location, and a concise "
        "reason it fits the traveler's stated preferences. Use the restaurant search "
        "tool to ground these choices and do not invent restaurant names. Avoid "
        "repeating a restaurant within the itinerary. Use the event search tool for "
        "date-specific concerts, shows, sports, festivals, and other local events "
        "that match the traveler. Use web search for current attraction and travel "
        "information. Include source URLs when available."
    )

def format_day_section(label: str, section: DaySection) -> str:
    """Format one part of the day for human-readable output."""
    details = [f"{label}: {section.title}", f"  {section.description}"]

    if section.location:
        details.append(f"  Location: {section.location}")

    if section.estimated_duration:
        details.append(f"  Estimated time: {section.estimated_duration}")

    dining = section.dining_suggestion
    dining_details = [dining.restaurant_name, dining.cuisine, dining.location]
    details.append(f"  Where to eat: {' | '.join(item for item in dining_details if item)}")
    details.append(f"  Why it fits: {dining.why_it_fits}")

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
    itinerary.tool_usage = [
        await build_restaurant_tool_usage(destination, preferences),
        await build_event_tool_usage(destination, startDate, endDate, preferences),
    ]
    return itinerary
