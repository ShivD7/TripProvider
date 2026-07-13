from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from backend import ItineraryAgent
except ImportError:
    import ItineraryAgent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TripRequest(BaseModel):
    """A description of the trip, including the destination and the length of the trip"""
    destination: str = Field(description="The name of the city or country that the user wants to visit.")
    tripLength: int = Field(gt=0, description="A number that represents how much time the user will spend in the destination.")
    tripUnit: str = Field(description="The unit for the trip length.")
    startDate: str | None = Field(default=None, description="The trip start date in YYYY-MM-DD format.")
    endDate: str | None = Field(default=None, description="The trip end date in YYYY-MM-DD format.")
    preferences: str | None = Field(
        default=None,
        description="Optional user preferences, such as cuisines, interests, pace, budget, neighborhoods, or must-see places.",
    )


@app.get("/")
def root():
    return {"Hello" : "World"}

@app.post("/getItinerary", response_model=ItineraryAgent.Itinerary)
async def get_itinerary(request: TripRequest):  
    itinerary = await ItineraryAgent.create_itinerary(
        request.destination,
        request.tripLength,
        request.tripUnit,
        request.startDate,
        request.endDate,
        request.preferences,
    )
    return itinerary

@app.get("/getWeatherData")
async def weather(
    destination: str = Query(description="The city, country, or destination to get weather for."),
    startDate: str | None = Query(default=None, description="Optional trip start date in YYYY-MM-DD format."),
    endDate: str | None = Query(default=None, description="Optional trip end date in YYYY-MM-DD format."),
):
    weather_data = await ItineraryAgent.fetch_weather_days(
        destination,
        startDate,
        endDate,
    )
    return weather_data

@app.get("/getNearbyRestaurants")
async def nearby_restaurants(
    destination: str = Query(description="The city, country, or destination to search near."),
    area: str | None = Query(default=None, description="Optional neighborhood or area inside the destination."),
    cuisine: str | None = Query(default=None, description="Optional cuisine or food preference."),
    limit: int = Query(default=8, ge=1, le=20, description="Maximum number of restaurant results."),
):
    restaurant_data = await ItineraryAgent.fetch_nearby_restaurants(
        destination,
        area,
        cuisine,
        limit,
    )
    return restaurant_data

@app.get("/getEvents")
async def events(
    destination: str = Query(description="The city, country, or destination to search for events."),
    startDate: str | None = Query(default=None, description="Optional trip start date in YYYY-MM-DD format."),
    endDate: str | None = Query(default=None, description="Optional trip end date in YYYY-MM-DD format."),
    interests: str | None = Query(default=None, description="Optional event interests such as music, sports, theatre, or festivals."),
    limit: int = Query(default=8, ge=1, le=20, description="Maximum number of event results."),
):
    event_data = await ItineraryAgent.fetch_events_with_web_search(
        destination,
        startDate,
        endDate,
        interests,
        limit,
    )
    return event_data
