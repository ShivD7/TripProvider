import React, { useState } from "react";
import { ChevronDown, MapPin, Search, Sparkles } from "lucide-react";

function TripPlannerForm({
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

      <label className="field length-field">
        <span>Trip Length</span>
        <div className="length-controls">
          <input
            type="number"
            min="1"
            value={tripLength}
            onChange={(event) => onTripLengthChange(Number(event.target.value))}
          />
          <div className="select-shell">
            <select
              value={tripUnit}
              onChange={(event) => onTripUnitChange(event.target.value)}
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
            <ChevronDown size={16} />
          </div>
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
