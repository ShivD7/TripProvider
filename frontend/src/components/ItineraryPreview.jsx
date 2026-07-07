import React from "react";
import { CalendarDays } from "lucide-react";
import DayCard from "./DayCard.jsx";

function ItineraryPreview({
  submittedTrip,
  mockDays,
  generatedItinerary,
  isGenerating,
  generationError,
}) {
  const showMockCards = !generatedItinerary && !isGenerating && !generationError;

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
        <span className="status-pill">
          {generatedItinerary ? "Live response" : "Mock mode"}
        </span>
      </div>

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
        <pre className="response-panel itinerary-response">{generatedItinerary}</pre>
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
