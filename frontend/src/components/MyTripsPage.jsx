import React, { useState } from "react";
import {
  Bookmark,
  CalendarDays,
  CloudSun,
  Clock3,
  MapPin,
  PlusCircle,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";

function getItineraryTitle(savedTrip) {
  return savedTrip.title || savedTrip.itinerary?.title || savedTrip.itinerary?.destination || "Saved itinerary";
}

function getTripSummary(savedTrip) {
  const overview = savedTrip.itinerary?.overview;

  if (!overview) {
    return "Open this saved trip when you are ready to review the route.";
  }

  return overview.length > 150 ? `${overview.slice(0, 150)}...` : overview;
}

function formatWeatherDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function SavedWeatherForecast({ weatherDays }) {
  if (!weatherDays?.length) {
    return null;
  }

  return (
    <div className="viewer-weather">
      <div className="viewer-weather-heading">
        <CloudSun size={17} />
        <span>Weather by day</span>
      </div>
      <div className="weather-grid">
        {weatherDays.map((weatherDay) => (
          <article
            className={`weather-card ${weatherDay.forecast_available ? "" : "is-muted"}`}
            key={weatherDay.date}
          >
            <div>
              <span>{formatWeatherDate(weatherDay.date)}</span>
              <strong>
                {weatherDay.forecast_available
                  ? weatherDay.condition || "Forecast"
                  : "Not available yet"}
              </strong>
            </div>
            {weatherDay.forecast_available && (
              <p>
                {weatherDay.low_temperature_c}-{weatherDay.high_temperature_c}°C
              </p>
            )}
            <small>{weatherDay.summary}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function TripsVisual() {
  return (
    <div className="my-trips-visual" aria-hidden="true">
      <img
        src="https://images.unsplash.com/photo-1498307833015-e7b400441eb8?auto=format&fit=crop&w=1000&q=80"
        alt=""
      />
      <span>Saved routes stay ready for the next decision.</span>
    </div>
  );
}

function FullScreenItinerary({ savedTrip, onClose }) {
  const itinerary = savedTrip.itinerary;
  const days = itinerary?.days ?? [];

  return (
    <div className="itinerary-viewer-backdrop" role="presentation">
      <section className="itinerary-viewer" role="dialog" aria-modal="true">
        <div className="itinerary-viewer-header">
          <div>
            <p className="eyebrow dark">
              <Bookmark size={16} />
              Saved Itinerary
            </p>
            <h2>{getItineraryTitle(savedTrip)}</h2>
            {itinerary?.overview && <p>{itinerary.overview}</p>}
          </div>
          <button className="viewer-close" type="button" onClick={onClose} aria-label="Close itinerary">
            <X size={22} />
          </button>
        </div>

        <SavedWeatherForecast weatherDays={itinerary?.weather} />

        <div className="viewer-days">
          {days.map((day) => (
            <article className="viewer-day" key={day.day_number}>
              <div className="viewer-day-title">
                <span>Day {day.day_number}</span>
                <h3>{day.theme}</h3>
              </div>

              {["morning", "afternoon", "evening"].map((part) => {
                const section = day[part];

                if (!section) {
                  return null;
                }

                return (
                  <div className="viewer-section" key={`${day.day_number}-${part}`}>
                    <strong>{part}</strong>
                    <h4>{section.title}</h4>
                    <p>{section.description}</p>
                    {(section.location || section.estimated_duration) && (
                      <div className="section-meta">
                        {section.location && (
                          <span>
                            <MapPin size={14} />
                            {section.location}
                          </span>
                        )}
                        {section.estimated_duration && (
                          <span>
                            <Clock3 size={14} />
                            {section.estimated_duration}
                          </span>
                        )}
                      </div>
                    )}
                    {section.dining_suggestion && (
                      <div className="dining-suggestion">
                        <Utensils size={17} />
                        <div>
                          <span>Where to eat</span>
                          <strong>{section.dining_suggestion.restaurant_name}</strong>
                          {(section.dining_suggestion.cuisine || section.dining_suggestion.location) && (
                            <small>
                              {[section.dining_suggestion.cuisine, section.dining_suggestion.location]
                                .filter(Boolean)
                                .join(" · ")}
                            </small>
                          )}
                          <p>{section.dining_suggestion.why_it_fits}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {day.notes?.length > 0 && (
                <div className="viewer-notes">
                  <strong>Notes</strong>
                  <ul>
                    {day.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>

        {itinerary?.sources?.length > 0 && (
          <div className="viewer-sources">
            <h3>Sources</h3>
            <ul>
              {itinerary.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function MyTripsPage({
  currentUser,
  savedItineraries,
  isLoading,
  errorMessage,
  onPlanTrip,
  onAuthClick,
}) {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const recentTrips = savedItineraries.slice(0, 6);

  return (
    <section className="page-shell my-trips-page">
      <div className="section-heading my-trips-heading">
        <div>
          <p className="eyebrow dark">
            <Bookmark size={16} />
            My Trips
          </p>
          <h1>Your saved itineraries</h1>
        </div>
        <button className="secondary-action" type="button" onClick={onPlanTrip}>
          <PlusCircle size={17} />
          Plan Trip
        </button>
      </div>

      {!currentUser && (
        <div className="my-trips-empty-layout">
          <div className="empty-trips-panel">
            <span className="empty-trips-icon">
              <Sparkles size={30} />
            </span>
            <h2>Sign in to keep your trips together.</h2>
            <p>
              Once you create an account, saved itineraries can live in your travel
              library instead of disappearing when you refresh or switch devices.
            </p>
            <button className="primary-action" type="button" onClick={() => onAuthClick("login")}>
              Sign In
            </button>
          </div>
          <TripsVisual />
        </div>
      )}

      {currentUser && isLoading && (
        <div className="empty-trips-panel">
          <span className="empty-trips-icon">
            <Sparkles size={30} />
          </span>
          <h2>Loading your saved trips...</h2>
          <p>Your travel library is being pulled from Supabase.</p>
        </div>
      )}

      {currentUser && errorMessage && (
        <div className="empty-trips-panel">
          <span className="empty-trips-icon">
            <MapPin size={30} />
          </span>
          <h2>Could not load saved trips.</h2>
          <p>{errorMessage}</p>
        </div>
      )}

      {currentUser && !isLoading && !errorMessage && recentTrips.length === 0 && (
        <div className="my-trips-empty-layout">
          <div className="empty-trips-panel">
            <span className="empty-trips-icon">
              <MapPin size={30} />
            </span>
            <h2>No saved itineraries yet.</h2>
            <p>
              Generate an itinerary, then press Save Itinerary to add it here for
              later.
            </p>
            <button className="primary-action" type="button" onClick={onPlanTrip}>
              Create Your First Trip
            </button>
          </div>
          <TripsVisual />
        </div>
      )}

      {currentUser && !isLoading && !errorMessage && recentTrips.length > 0 && (
        <div className="saved-trips-grid">
          {recentTrips.map((savedTrip) => {
            const dayCount = savedTrip.itinerary?.days?.length ?? 0;
            const savedDate = new Date(savedTrip.savedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <article className="saved-trip-card" key={savedTrip.id}>
                <div className="saved-trip-card-header">
                  <span>
                    <CalendarDays size={16} />
                    {savedDate}
                  </span>
                  <span>{dayCount} {dayCount === 1 ? "day" : "days"}</span>
                </div>
                <h2>{getItineraryTitle(savedTrip)}</h2>
                <p>{getTripSummary(savedTrip)}</p>
                <button className="text-action" type="button" onClick={() => setSelectedTrip(savedTrip)}>
                  View itinerary
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selectedTrip && (
        <FullScreenItinerary savedTrip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}
    </section>
  );
}

export default MyTripsPage;
