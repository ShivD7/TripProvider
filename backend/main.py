import os
import time
from collections import defaultdict, deque
from datetime import date, datetime, timedelta

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator, model_validator

try:
    from backend import ItineraryAgent
except ImportError:
    import ItineraryAgent

app = FastAPI()

MAX_TRIP_LENGTH_DAYS = 21
MAX_DESTINATION_LENGTH = 120
MAX_PREFERENCES_LENGTH = 1000
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "3600"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "10"))
rate_limit_requests = defaultdict(deque)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        ",".join(
            [
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://localhost:5173",
                "http://localhost:5174",
            ]
        ),
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-Frame-Options"] = "DENY"
    return response

@app.middleware("http")
async def rate_limit_itinerary_generation(request: Request, call_next):
    if request.url.path != "/getItinerary" or request.method == "OPTIONS":
        return await call_next(request)

    forwarded_for = request.headers.get("x-forwarded-for")
    client_ip = (
        forwarded_for.split(",", 1)[0].strip()
        if forwarded_for
        else request.client.host if request.client else "unknown"
    )
    now = time.monotonic()
    request_times = rate_limit_requests[client_ip]

    while request_times and now - request_times[0] > RATE_LIMIT_WINDOW_SECONDS:
        request_times.popleft()

    if len(request_times) >= RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={
                "detail": (
                    "Too many itinerary requests. Please wait a bit before generating another trip."
                )
            },
            headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)},
        )

    request_times.append(now)
    return await call_next(request)

class TripRequest(BaseModel):
    """A description of the trip, including the destination and the length of the trip"""
    destination: str = Field(
        min_length=2,
        max_length=MAX_DESTINATION_LENGTH,
        description="The name of the city or country that the user wants to visit.",
    )
    tripLength: int = Field(
        gt=0,
        le=MAX_TRIP_LENGTH_DAYS,
        description="A number that represents how much time the user will spend in the destination.",
    )
    tripUnit: str = Field(pattern="^days$", description="The unit for the trip length.")
    startDate: str | None = Field(default=None, description="The trip start date in YYYY-MM-DD format.")
    endDate: str | None = Field(default=None, description="The trip end date in YYYY-MM-DD format.")
    preferences: str | None = Field(
        default=None,
        max_length=MAX_PREFERENCES_LENGTH,
        description="Optional user preferences, such as cuisines, interests, pace, budget, neighborhoods, or must-see places.",
    )

    @field_validator("destination", "preferences", mode="before")
    @classmethod
    def strip_text_fields(cls, value):
        if isinstance(value, str):
            return value.strip()

        return value

    @field_validator("startDate", "endDate")
    @classmethod
    def validate_date_format(cls, value):
        if value is None:
            return value

        try:
            datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError as error:
            raise ValueError("Date must use YYYY-MM-DD format.") from error

        return value

    @model_validator(mode="after")
    def validate_trip_dates(self):
        if not self.startDate or not self.endDate:
            return self

        start_date = datetime.strptime(self.startDate, "%Y-%m-%d").date()
        end_date = datetime.strptime(self.endDate, "%Y-%m-%d").date()
        minimum_start_date = date.today() + timedelta(days=1)

        if start_date < minimum_start_date:
            raise ValueError("Start date must be at least one day after today.")

        if end_date < start_date:
            raise ValueError("End date must be on or after the start date.")

        inclusive_days = (end_date - start_date).days + 1

        if inclusive_days != self.tripLength:
            raise ValueError("Trip length must match the selected start and end dates.")

        return self


@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/getItinerary", response_model=ItineraryAgent.Itinerary)
async def get_itinerary(request: TripRequest):  
    try:
        itinerary = await ItineraryAgent.create_itinerary(
            request.destination,
            request.tripLength,
            request.tripUnit,
            request.startDate,
            request.endDate,
            request.preferences,
        )
    except Exception as error:
        print(f"Could not generate itinerary: {error}")
        raise HTTPException(
            status_code=503,
            detail="Could not generate the itinerary right now. Please try again shortly.",
        ) from error

    return itinerary

@app.get("/getWeatherData")
async def weather(
    destination: str = Query(min_length=2, max_length=MAX_DESTINATION_LENGTH, description="The city, country, or destination to get weather for."),
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
    destination: str = Query(min_length=2, max_length=MAX_DESTINATION_LENGTH, description="The city, country, or destination to search near."),
    area: str | None = Query(default=None, max_length=MAX_DESTINATION_LENGTH, description="Optional neighborhood or area inside the destination."),
    cuisine: str | None = Query(default=None, max_length=MAX_PREFERENCES_LENGTH, description="Optional cuisine or food preference."),
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
    destination: str = Query(min_length=2, max_length=MAX_DESTINATION_LENGTH, description="The city, country, or destination to search for events."),
    startDate: str | None = Query(default=None, description="Optional trip start date in YYYY-MM-DD format."),
    endDate: str | None = Query(default=None, description="Optional trip end date in YYYY-MM-DD format."),
    interests: str | None = Query(default=None, max_length=MAX_PREFERENCES_LENGTH, description="Optional event interests such as music, sports, theatre, or festivals."),
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
