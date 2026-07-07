import React, { useMemo, useState } from "react";
import Hero from "./components/Hero.jsx";
import ItineraryPreview from "./components/ItineraryPreview.jsx";
import Navbar from "./components/Navbar.jsx";
import { mockDays } from "./data/mockItinerary.js";
import { destinations } from "./destinations.js";

function App() {
  const [destination, setDestination] = useState("");
  const [tripLength, setTripLength] = useState(5);
  const [tripUnit, setTripUnit] = useState("days");
  const [submittedTrip, setSubmittedTrip] = useState(null);
  const [generatedItinerary, setGeneratedItinerary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");

  const suggestions = useMemo(() => {
    const query = destination.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return destinations
      .filter((place) => place.toLowerCase().includes(query))
      .sort((firstPlace, secondPlace) => {
        const first = firstPlace.toLowerCase();
        const second = secondPlace.toLowerCase();
        const firstStarts = first.startsWith(query);
        const secondStarts = second.startsWith(query);

        if (firstStarts !== secondStarts) {
          return firstStarts ? -1 : 1;
        }

        return first.indexOf(query) - second.indexOf(query);
      })
      .slice(0, 6);
  }, [destination]);

  const itineraryLengthLabel = `${tripLength} ${tripLength === 1 ? tripUnit.slice(0, -1) : tripUnit}`;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!destination.trim() || tripLength < 1) {
      return;
    }

    const tripRequest = {
      destination: destination.trim(),
      tripLength,
      tripUnit,
    };

    setSubmittedTrip({
      destination: tripRequest.destination,
      length: itineraryLengthLabel,
    });
    setGeneratedItinerary("");
    setGenerationError("");
    setIsGenerating(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/getItinerary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tripRequest),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const itinerary = await response.json();
      setGeneratedItinerary(itinerary);
    } catch (error) {
      setGenerationError(
        "Could not generate the itinerary. Make sure the FastAPI backend is running on port 8000."
      );
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="app">
      <Navbar />
      <Hero
        destination={destination}
        onDestinationChange={setDestination}
        tripLength={tripLength}
        onTripLengthChange={setTripLength}
        tripUnit={tripUnit}
        onTripUnitChange={setTripUnit}
        suggestions={suggestions}
        onSuggestionSelect={setDestination}
        onSubmit={handleSubmit}
      />
      <ItineraryPreview
        submittedTrip={submittedTrip}
        mockDays={mockDays}
        generatedItinerary={generatedItinerary}
        isGenerating={isGenerating}
        generationError={generationError}
      />
    </main>
  );
}

export default App;
