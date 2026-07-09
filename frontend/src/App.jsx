import React, { useEffect, useMemo, useState } from "react";
import AboutPage from "./components/AboutPage.jsx";
import AuthModal from "./components/AuthModal.jsx";
import Hero from "./components/Hero.jsx";
import ItineraryPreview from "./components/ItineraryPreview.jsx";
import MyTripsPage from "./components/MyTripsPage.jsx";
import Navbar from "./components/Navbar.jsx";
import { mockDays } from "./data/mockItinerary.js";
import { destinations } from "./destinations.js";
import { supabase } from "./lib/supabaseClient.js";

const maxTripLengthDays = 21;

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
}

function calculateInclusiveDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dayInMilliseconds = 1000 * 60 * 60 * 24;

  return Math.floor((end - start) / dayInMilliseconds) + 1;
}

const defaultStartDate = formatDateInput(new Date());
const defaultEndDate = addDays(defaultStartDate, 4);
const maxSelectableDate = addDays(defaultStartDate, 365);

function App() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [submittedTrip, setSubmittedTrip] = useState(null);
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("planner");
  const [authMode, setAuthMode] = useState("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [savedItineraries, setSavedItineraries] = useState([]);
  const [isLoadingSavedTrips, setIsLoadingSavedTrips] = useState(false);
  const [savedTripsError, setSavedTripsError] = useState("");
  const [saveNotice, setSaveNotice] = useState(null);

  useEffect(() => {
    if (!saveNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveNotice(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveNotice]);

  useEffect(() => {
    function setUserFromSession(session) {
      const user = session?.user;

      setCurrentUser(
        user
          ? {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email.split("@")[0],
            }
          : null
      );
    }

    supabase.auth.getSession().then(({ data }) => {
      setUserFromSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserFromSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const tripLength = calculateInclusiveDays(startDate, endDate);
  const itineraryLengthLabel = `${tripLength} ${tripLength === 1 ? "day" : "days"}`;

  function mapSavedItineraryRow(row) {
    return {
      id: row.id,
      savedAt: row.created_at,
      title: row.title,
      destination: row.destination,
      tripLengthDays: row.trip_length_days,
      itinerary: row.itinerary_json,
    };
  }

  useEffect(() => {
    let ignoreResult = false;

    async function loadSavedItineraries() {
      if (!currentUser) {
        setSavedItineraries([]);
        setSavedTripsError("");
        return;
      }

      setIsLoadingSavedTrips(true);
      setSavedTripsError("");

      const { data, error } = await supabase
        .from("saved_itineraries")
        .select("id,title,destination,trip_length_days,itinerary_json,created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (ignoreResult) {
        return;
      }

      setIsLoadingSavedTrips(false);

      if (error) {
        setSavedTripsError(error.message);
        return;
      }

      setSavedItineraries(data.map(mapSavedItineraryRow));
    }

    loadSavedItineraries();

    return () => {
      ignoreResult = true;
    };
  }, [currentUser]);

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }

  function closeAuth() {
    setIsAuthOpen(false);
  }

  function handleAuthSubmit(authData) {
    setCurrentUser({
      id: authData.id,
      email: authData.email,
      name: authData.name,
    });
    setIsAuthOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSaveNotice(null);
  }

  function handleNavigate(page) {
    setCurrentPage(page);
  }

  function handleStartDateChange(value) {
    if (!value) {
      setStartDate(value);
      return;
    }

    const nextStartDate = value > maxSelectableDate ? maxSelectableDate : value;

    setStartDate(nextStartDate);

    if (!endDate || new Date(`${endDate}T00:00:00`) < new Date(`${nextStartDate}T00:00:00`)) {
      setEndDate(nextStartDate);
      return;
    }

    const selectedDays = calculateInclusiveDays(nextStartDate, endDate);

    if (selectedDays > maxTripLengthDays) {
      setEndDate(addDays(nextStartDate, maxTripLengthDays - 1));
      return;
    }

    if (endDate > maxSelectableDate) {
      setEndDate(maxSelectableDate);
    }
  }

  function handleEndDateChange(value) {
    if (!value || !startDate) {
      setEndDate(value);
      return;
    }

    const nextEndDate = value > maxSelectableDate ? maxSelectableDate : value;
    const selectedDays = calculateInclusiveDays(startDate, nextEndDate);

    if (selectedDays < 1) {
      setEndDate(startDate);
      return;
    }

    setEndDate(
      selectedDays > maxTripLengthDays
        ? addDays(startDate, maxTripLengthDays - 1)
        : nextEndDate
    );
  }

  async function handleSaveItinerary() {
    if (!generatedItinerary) {
      return;
    }

    if (!currentUser) {
      setSaveNotice({
        type: "info",
        message: "Sign in or create an account to save this itinerary.",
      });
      openAuth("login");
      return;
    }

    const title = `${generatedItinerary.trip_length_days}-day ${generatedItinerary.destination} itinerary`;
    const { data, error } = await supabase
      .from("saved_itineraries")
      .insert({
        user_id: currentUser.id,
        title,
        destination: generatedItinerary.destination,
        trip_length_days: generatedItinerary.trip_length_days,
        itinerary_json: generatedItinerary,
      })
      .select("id,title,destination,trip_length_days,itinerary_json,created_at")
      .single();

    if (error) {
      setSaveNotice({
        type: "error",
        message: `Could not save itinerary: ${error.message}`,
      });
      return;
    }

    setSavedItineraries((currentItineraries) => [
      mapSavedItineraryRow(data),
      ...currentItineraries,
    ]);
    setSaveNotice({
      type: "success",
      message: `Saved to My Trips. You now have ${savedItineraries.length + 1} saved itinerary.`,
    });
  }

  function showPlanner() {
    setCurrentPage("planner");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !destination.trim() ||
      !startDate ||
      !endDate ||
      startDate > maxSelectableDate ||
      endDate > maxSelectableDate ||
      tripLength < 1 ||
      tripLength > maxTripLengthDays
    ) {
      return;
    }

    const tripRequest = {
      destination: destination.trim(),
      tripLength,
      tripUnit: "days",
      startDate,
      endDate,
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
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onAuthClick={openAuth}
        onLogout={handleLogout}
      />

      {currentPage === "planner" && (
        <>
          <Hero
            destination={destination}
            onDestinationChange={setDestination}
            startDate={startDate}
            endDate={endDate}
            maxDate={maxSelectableDate}
            maxTripLengthDays={maxTripLengthDays}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
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
            saveNotice={saveNotice}
          />
        </>
      )}

      {currentPage === "my-trips" && (
        <MyTripsPage
          currentUser={currentUser}
          savedItineraries={savedItineraries}
          isLoading={isLoadingSavedTrips}
          errorMessage={savedTripsError}
          onPlanTrip={showPlanner}
          onAuthClick={openAuth}
        />
      )}

      {currentPage === "about" && (
        <AboutPage onPlanTrip={showPlanner} />
      )}

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
