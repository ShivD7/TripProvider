import React, { useState } from "react";
import { CalendarDays, MapPin, Search, Sparkles } from "lucide-react";

function TripPlannerForm({
  destination,
  onDestinationChange,
  startDate,
  endDate,
  preferences,
  maxDate,
  maxTripLengthDays,
  onStartDateChange,
  onEndDateChange,
  onPreferencesChange,
  suggestions,
  onSuggestionSelect,
  onSubmit,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  function handleDestinationChange(value) {
    onDestinationChange(value);
    setShowSuggestions(true);
  }

  function handleSuggestionSelect(place) {
    onSuggestionSelect(place);
    setShowSuggestions(false);
  }

  return (
    <form className="planner" onSubmit={onSubmit}>
      <label className="field destination-field">
        <span>Destination</span>
        <div className="input-shell">
          <MapPin size={18} />
          <input
            type="text"
            value={destination}
            onChange={(event) => handleDestinationChange(event.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Where do you want to go?"
            autoComplete="off"
          />
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((place) => (
              <button
                key={place}
                type="button"
                onClick={() => handleSuggestionSelect(place)}
              >
                <Search size={15} />
                {place}
              </button>
            ))}
          </div>
        )}
      </label>

      <fieldset className="field date-range-field">
        <div className="field-heading-row">
          <legend>Trip Dates</legend>
          <span>Max {maxTripLengthDays} days</span>
        </div>
        <div className="date-controls">
          <label>
            <span>Start</span>
            <div className="date-input-shell">
              <CalendarDays size={17} />
              <input
                type="date"
                value={startDate}
                max={maxDate}
                onChange={(event) => onStartDateChange(event.target.value)}
                required
              />
            </div>
          </label>
          <label>
            <span>End</span>
            <div className="date-input-shell">
              <CalendarDays size={17} />
              <input
                type="date"
                min={startDate}
                max={maxDate}
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
                required
              />
            </div>
          </label>
        </div>
      </fieldset>

      <label className="field preferences-field">
        <span>Trip Preferences</span>
        <div className="preferences-shell">
          <textarea
            value={preferences}
            onChange={(event) => onPreferencesChange(event.target.value)}
            placeholder="Cuisines, interests, places you already have in mind, pace, budget, accessibility..."
            rows={3}
          />
        </div>
      </label>

      <button className="submit-button" type="submit">
        <Sparkles size={18} />
        Generate Itinerary
      </button>
    </form>
  );
}

export default TripPlannerForm;
