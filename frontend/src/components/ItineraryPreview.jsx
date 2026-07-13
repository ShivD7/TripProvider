import React from "react";
import { Bookmark, CalendarDays, CheckCircle2, CloudSun, X } from "lucide-react";
import DayCard from "./DayCard.jsx";
import GeneratedDayCard from "./GeneratedDayCard.jsx";

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

function WeatherForecast({ weatherDays }) {
  if (!weatherDays?.length) {
    return null;
  }

  return (
    <div className="response-panel weather-panel">
      <div className="weather-panel-heading">
        <p className="eyebrow dark">
          <CloudSun size={16} />
          Weather by day
        </p>
        <span>{weatherDays.length} day forecast</span>
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

function ItineraryPreview({
  submittedTrip,
  mockDays,
  generatedItinerary,
  isGenerating,
  generationError,
  currentUser,
  onSaveItinerary,
  onClearItinerary,
  saveNotice,
}) {
  const showMockCards = !generatedItinerary && !isGenerating && !generationError;
  const generatedDays = generatedItinerary?.days ?? [];

  return (
    <section className="dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow dark">
            <CalendarDays size={16} />
            Itinerary Preview
          </p>
          <h2>
            {isGenerating
              ? "Generating your itinerary..."
              : submittedTrip
                ? `${submittedTrip.length} in ${submittedTrip.destination}`
                : "Your trip preview will appear here"}
          </h2>
        </div>
        <div className="preview-actions">
          {generatedItinerary && (
            <>
              <button className="save-itinerary-button" type="button" onClick={onSaveItinerary}>
                <Bookmark size={17} />
                Save Itinerary
              </button>
              <button className="clear-itinerary-button" type="button" onClick={onClearItinerary}>
                <X size={17} />
                Clear
              </button>
            </>
          )}
          <span className="status-pill">
            {generatedItinerary ? (currentUser ? "Ready to save" : "Sign in to save") : "Mock mode"}
          </span>
        </div>
      </div>

      {saveNotice && (
        <div className={`save-toast ${saveNotice.type}`} role="status" aria-live="polite">
          <span className="save-toast-icon">
            <Bookmark size={22} />
            <CheckCircle2 size={14} />
          </span>
          <div>
            <strong>
              {saveNotice.type === "error"
                ? "Save failed"
                : saveNotice.type === "info"
                  ? "Sign in needed"
                  : "Trip saved"}
            </strong>
            <p>{saveNotice.message}</p>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="response-panel loading-panel">
          <div className="loading-bar" />
          <p>Your backend is talking to the itinerary agent. This can take a moment.</p>
        </div>
      )}

      {generationError && (
        <div className="response-panel error-panel">
          <p>{generationError}</p>
        </div>
      )}

      {generatedItinerary && (
        <>
          <div className="response-panel itinerary-overview">
            <p>{generatedItinerary.overview}</p>
          </div>

          <WeatherForecast weatherDays={generatedItinerary.weather} />

          <div className="itinerary-grid generated-itinerary-grid">
            {generatedDays.map((day, index) => (
              <GeneratedDayCard day={day} index={index} key={day.day_number} />
            ))}
          </div>

          {generatedItinerary.sources?.length > 0 && (
            <div className="response-panel sources-panel">
              <h3>Sources</h3>
              <ul>
                {generatedItinerary.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {showMockCards && (
        <div className="itinerary-grid">
          {mockDays.map((day, index) => (
            <DayCard day={day} index={index} key={day.day} />
          ))}
        </div>
      )}

      <p className="data-credit">
        City suggestion dataset adapted from{" "}
        <a href="https://simplemaps.com/data/world-cities" target="_blank" rel="noreferrer">
          SimpleMaps World Cities Database
        </a>
        .
      </p>
    </section>
  );
}

export default ItineraryPreview;
