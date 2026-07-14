import React from "react";
import { Compass } from "lucide-react";
import TripPlannerForm from "./TripPlannerForm.jsx";

function Hero({
  destination,
  onDestinationChange,
  startDate,
  endDate,
  preferences,
  minDate,
  maxDate,
  maxTripLengthDays,
  maxDestinationLength,
  maxPreferencesLength,
  onStartDateChange,
  onEndDateChange,
  onPreferencesChange,
  suggestions,
  onSuggestionSelect,
  onSubmit,
  isGenerating,
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
          TripProvider creates structured, date-aware itineraries that combine
          destination research, local dining, weather context, and personal travel
          preferences in one organized planning workspace.
        </p>

        <TripPlannerForm
          destination={destination}
          onDestinationChange={onDestinationChange}
          startDate={startDate}
          endDate={endDate}
          preferences={preferences}
          minDate={minDate}
          maxDate={maxDate}
          maxTripLengthDays={maxTripLengthDays}
          maxDestinationLength={maxDestinationLength}
          maxPreferencesLength={maxPreferencesLength}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
          onPreferencesChange={onPreferencesChange}
          suggestions={suggestions}
          onSuggestionSelect={onSuggestionSelect}
          onSubmit={onSubmit}
          isGenerating={isGenerating}
        />
      </div>
    </section>
  );
}

export default Hero;
