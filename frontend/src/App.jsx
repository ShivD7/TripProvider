import React, { useMemo, useState } from "react";
import AuthModal from "./components/AuthModal.jsx";
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
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [savedItineraries, setSavedItineraries] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");

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

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }

  function closeAuth() {
    setIsAuthOpen(false);
  }

  function handleAuthSubmit(authData) {
    setCurrentUser({
      email: authData.email,
      name: authData.name,
    });
    setIsAuthOpen(false);
    setSaveMessage("You're signed in. You can now save itineraries to My Trips.");
  }

  function handleLogout() {
    setCurrentUser(null);
    setSaveMessage("");
  }

  function handleSaveItinerary() {
    if (!generatedItinerary) {
      return;
    }

    if (!currentUser) {
      setSaveMessage("Sign in or create an account to save this itinerary.");
      openAuth("login");
      return;
    }

    setSavedItineraries((currentItineraries) => [
      {
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        itinerary: generatedItinerary,
      },
      ...currentItineraries,
    ]);
    setSaveMessage(`Saved to My Trips. You now have ${savedItineraries.length + 1} saved itinerary.`);
  }

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
    setGeneratedItinerary(null);
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
      <Navbar
        currentUser={currentUser}
        onAuthClick={openAuth}
        onLogout={handleLogout}
      />
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
        currentUser={currentUser}
        onSaveItinerary={handleSaveItinerary}
        saveMessage={saveMessage}
      />

      {isAuthOpen && (
        <AuthModal
          mode={authMode}
          onClose={closeAuth}
          onSubmit={handleAuthSubmit}
          onModeChange={setAuthMode}
        />
      )}
    </main>
  );
}

export default App;
