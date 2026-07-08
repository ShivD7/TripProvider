import React, { useState } from "react";
import { ChevronDown, Clock3, MapPin } from "lucide-react";

function summarizeText(text, maxLength = 220) {
  if (!text) {
    return "";
  }

  const cleanedText = text.replace(/\s+/g, " ").trim();

  if (cleanedText.length <= maxLength) {
    return cleanedText;
  }

  return `${cleanedText.slice(0, maxLength).trim()}...`;
}

function buildDaySummary(day) {
  return summarizeText(
    [day.morning?.description, day.afternoon?.description, day.evening?.description]
      .filter(Boolean)
      .join(" ")
  );
}

function buildMetaItems(day) {
  const sections = [day.morning, day.afternoon, day.evening].filter(Boolean);
  const locations = [...new Set(sections.map((section) => section.location).filter(Boolean))];
  const durations = [...new Set(sections.map((section) => section.estimated_duration).filter(Boolean))];

  return {
    locations: locations.slice(0, 3),
    durations: durations.slice(0, 2),
  };
}

function DaySection({ label, section }) {
  if (!section) {
    return null;
  }

  return (
    <div className="generated-section">
      <div>
        <strong>{label}</strong>
        <h4>{section.title}</h4>
      </div>
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
    </div>
  );
}

function GeneratedDayCard({ day, index }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);
  const daySummary = buildDaySummary(day);
  const metaItems = buildMetaItems(day);

  return (
    <article className={`day-card generated-day-card ${isExpanded ? "is-expanded" : ""}`}>
      <button
        className="generated-card-toggle"
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
      >
        <div>
          <div className="card-topline">
            <span>Day {day.day_number}</span>
            <Clock3 size={17} />
          </div>
          <h3>{day.theme}</h3>
        </div>
        <ChevronDown size={20} />
      </button>

      <div className="day-route-summary">
        {[day.morning, day.afternoon, day.evening]
          .filter(Boolean)
          .map((section, sectionIndex) => (
            <span key={`${section.title}-${sectionIndex}`}>{section.title}</span>
          ))}
      </div>

      {!isExpanded && (
        <div className="collapsed-day-preview">
          {daySummary && <p>{daySummary}</p>}

          {(metaItems.locations.length > 0 || metaItems.durations.length > 0) && (
            <div className="collapsed-meta">
              {metaItems.locations.map((location) => (
                <span key={location}>
                  <MapPin size={14} />
                  {location}
                </span>
              ))}
              {metaItems.durations.map((duration) => (
                <span key={duration}>
                  <Clock3 size={14} />
                  {duration}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="generated-card-details">
          <div className="generated-timeline">
            <DaySection label="Morning" section={day.morning} />
            <DaySection label="Afternoon" section={day.afternoon} />
            <DaySection label="Evening" section={day.evening} />
          </div>

          {day.notes?.length > 0 && (
            <div className="day-notes">
              <strong>Notes</strong>
              <ul>
                {day.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="card-number">{String(index + 1).padStart(2, "0")}</div>
    </article>
  );
}

export default GeneratedDayCard;
