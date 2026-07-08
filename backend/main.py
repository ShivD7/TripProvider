from fastapi import FastAPI
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
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TripRequest(BaseModel):
    """A description of the trip, including the destination and the length of the trip"""
    destination: str = Field(description="The name of the city or country that the user wants to visit.")
    tripLength: int = Field(gt=0, description="A number that represents how much time the user will spend in the destination.")
    tripUnit: str = Field(description="One of three units: days, weeks, months.")


@app.get("/")
def root():
    return {"Hello" : "World"}

@app.post("/getItinerary", response_model=ItineraryAgent.Itinerary)
async def get_itinerary(request: TripRequest):  
    itinerary = await ItineraryAgent.create_itinerary(request.destination, request.tripLength, request.tripUnit)
    return itinerary


