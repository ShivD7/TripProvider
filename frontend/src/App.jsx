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
import { CheckCircle2, LogOut } from "lucide-react";

const maxTripLengthDays = 21;

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const minimumStartDate = addDays(formatDateInput(new Date()), 1);
const defaultStartDate = minimumStartDate;
const defaultEndDate = addDays(defaultStartDate, 4);
const maxSelectableDate = addDays(defaultStartDate, 365);
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://tripprovider.onrender.com";
const backendWakeRetryDelayMs = 5000;
const backendWakeMaxAttempts = 18;

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function getResponseErrorMessage(response) {
  const fallbackMessage = `Backend returned ${response.status}`;

  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const errorBody = await response.json();
      const detail = errorBody.detail || errorBody.error || errorBody.message;

      if (Array.isArray(detail)) {
        return detail
          .map((item) => `${item.loc?.join(".") || "Request"}: ${item.msg}`)
          .join(" ");
      }

      if (typeof detail === "string") {
        return detail;
      }
    }

    const errorText = await response.text();
    return errorText || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function App() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [preferences, setPreferences] = useState("");
  const [submittedTrip, setSubmittedTrip] = useState(null);
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("planner");
  const [authMode, setAuthMode] = useState("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [savedItineraries, setSavedItineraries] = useState([]);
  const [isLoadingSavedTrips, setIsLoadingSavedTrips] = useState(false);
  const [savedTripsError, setSavedTripsError] = useState("");
  const [saveNotice, setSaveNotice] = useState(null);
  const [accountNotice, setAccountNotice] = useState(null);

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
    if (!accountNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAccountNotice(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [accountNotice]);

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
    setAccountNotice({
      type: "success",
      title: "Signed in",
      message: `Welcome back${authData.name ? `, ${authData.name}` : ""}. Your saved trips are ready.`,
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSaveNotice(null);
    setAccountNotice({
      type: "success",
      title: "Signed out",
      message: "You have been logged out of your TripProvider account.",
    });
  }

  function handleNavigate(page) {
    setCurrentPage(page);
  }

  function resetTripForm() {
    setDestination("");
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setPreferences("");
  }

  function handleClearGeneratedItinerary() {
    setSubmittedTrip(null);
    setGeneratedItinerary(null);
    setGenerationStatus("");
    setGenerationError("");
    setSaveNotice(null);
  }

  function handleStartDateChange(value) {
    if (!value) {
      setStartDate(value);
      return;
    }

    const nextStartDate = value < minimumStartDate
      ? minimumStartDate
      : value > maxSelectableDate
        ? maxSelectableDate
        : value;

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

  async function handleDeleteSavedItinerary(savedTripId) {
    if (!currentUser || !savedTripId) {
      return;
    }

    const { error } = await supabase
      .from("saved_itineraries")
      .delete()
      .eq("id", savedTripId)
      .eq("user_id", currentUser.id);

    if (error) {
      setSavedTripsError(`Could not delete saved trip: ${error.message}`);
      return;
    }

    setSavedItineraries((currentItineraries) =>
      currentItineraries.filter((savedTrip) => savedTrip.id !== savedTripId)
    );
    setSavedTripsError("");
  }

  function showPlanner() {
    setCurrentPage("planner");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isGenerating) {
      return;
    }

    if (
      !destination.trim() ||
      !startDate ||
      !endDate ||
      startDate < minimumStartDate ||
      endDate < startDate ||
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
      preferences: preferences.trim(),
    };

    setSubmittedTrip({
      destination: tripRequest.destination,
      length: itineraryLengthLabel,
    });
    setGeneratedItinerary(null);
    setGenerationError("");
    setGenerationStatus("Starting your itinerary request...");
    setIsGenerating(true);

    try {
      let response;

      for (let attempt = 1; attempt <= backendWakeMaxAttempts; attempt += 1) {
        let shouldRetry = false;

        try {
          if (attempt === 1) {
            setGenerationStatus("Contacting the TripProvider backend...");
          } else {
            setGenerationStatus(
              `Render may be waking up the backend. Still trying... (${attempt}/${backendWakeMaxAttempts})`
            );
          }

          response = await fetch(`${apiBaseUrl}/getItinerary`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tripRequest),
          });

          if (response.ok) {
            break;
          }

          shouldRetry = [502, 503, 504].includes(response.status);

          if (!shouldRetry) {
            throw new Error(await getResponseErrorMessage(response));
          }
        } catch (error) {
          if (!shouldRetry || attempt === backendWakeMaxAttempts) {
            throw error;
          }
        }

        await wait(backendWakeRetryDelayMs);
      }

      if (!response?.ok) {
        throw new Error(
          response
            ? await getResponseErrorMessage(response)
            : "The backend did not send a response."
        );
      }

      setGenerationStatus("Building your itinerary...");
      const itinerary = await response.json();
      setGeneratedItinerary(itinerary);
      setGenerationStatus("");
      resetTripForm();
    } catch (error) {
      setGenerationError(
        `Could not generate the itinerary. ${error.message}`
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
            preferences={preferences}
            minDate={minimumStartDate}
            maxDate={maxSelectableDate}
            maxTripLengthDays={maxTripLengthDays}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onPreferencesChange={setPreferences}
            suggestions={suggestions}
            onSuggestionSelect={setDestination}
            onSubmit={handleSubmit}
            isGenerating={isGenerating}
          />
          <ItineraryPreview
            submittedTrip={submittedTrip}
            mockDays={mockDays}
            generatedItinerary={generatedItinerary}
            isGenerating={isGenerating}
            generationStatus={generationStatus}
            generationError={generationError}
            currentUser={currentUser}
            onSaveItinerary={handleSaveItinerary}
            onClearItinerary={handleClearGeneratedItinerary}
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
          onDeleteTrip={handleDeleteSavedItinerary}
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

      {accountNotice && (
        <div className={`save-toast account-toast ${accountNotice.type}`} role="status" aria-live="polite">
          <span className="save-toast-icon account-toast-icon">
            <LogOut size={22} />
            <CheckCircle2 size={14} />
          </span>
          <div>
            <strong>{accountNotice.title}</strong>
            <p>{accountNotice.message}</p>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
