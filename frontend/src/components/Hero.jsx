import React from "react";
import { Compass } from "lucide-react";
import TripPlannerForm from "./TripPlannerForm.jsx";

function Hero({
  destination,
  onDestinationChange,
  tripLength,
  onTripLengthChange,
  tripUnit,
  onTripUnitChange,
  suggestions,
  onSuggestionSelect,
  onSubmit,
}) {
  return (
    <section className="hero">
      <div className="hero-media" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80"
          alt=""
        />
      </div>

      <div className="hero-content">
        <p className="eyebrow">
          <Compass size={16} />
          AI travel planning workspace
        </p>
        <h1>Design a trip that feels like it was made by someone who knows the city.</h1>
        <p className="hero-copy">
          Pick a destination, choose the trip length, and preview the itinerary
          experience your agent will generate once your backend is connected.
        </p>

        <TripPlannerForm
          destination={destination}
          onDestinationChange={onDestinationChange}
          tripLength={tripLength}
          onTripLengthChange={onTripLengthChange}
          tripUnit={tripUnit}
          onTripUnitChange={onTripUnitChange}
          suggestions={suggestions}
          onSuggestionSelect={onSuggestionSelect}
          onSubmit={onSubmit}
        />
      </div>
    </section>
  );
}

export default Hero;
