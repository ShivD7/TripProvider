import React from "react";
import { CalendarDays, Compass, MapPinned, Sparkles } from "lucide-react";

const serviceCards = [
  {
    icon: <Compass size={22} />,
    title: "Personal trip planning",
    text: "Travelers enter a destination and travel dates, then receive a structured itinerary designed around clear daily plans.",
  },
  {
    icon: <CalendarDays size={22} />,
    title: "Date-aware recommendations",
    text: "Trip dates provide useful context for recommendations, including future support for events, weather, seasonal schedules, and closures.",
  },
  {
    icon: <MapPinned size={22} />,
    title: "Saved travel library",
    text: "Signed-in users can save generated itineraries and return to them later from My Trips for easier planning and comparison.",
  },
];

function AboutPage({ onPlanTrip }) {
  return (
    <section className="page-shell about-page">
      <div className="about-hero">
        <p className="eyebrow dark">
          <Sparkles size={16} />
          About TripProvider
        </p>
        <h1>Travel planning that starts with how people actually make decisions.</h1>
        <p>
          TripProvider is an AI-powered travel planning platform that converts a
          destination and travel dates into a clear day-by-day itinerary. It is
          designed to reduce research time, organize trip details, and give travelers
          a practical starting point before they book, coordinate, or explore.
        </p>
        <button className="primary-action" type="button" onClick={onPlanTrip}>
          Start Planning
        </button>
      </div>

      <div className="about-grid">
        {serviceCards.map((card) => (
          <article className="about-card" key={card.title}>
            <span className="about-card-icon">{card.icon}</span>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}
      </div>

      <div className="about-story">
        <div className="about-story-copy">
          <p className="eyebrow dark">Purpose</p>
          <h2>Trip planning should be organized, current, and easy to revisit.</h2>
          <p>
            Modern travel planning often requires comparing attractions, neighborhoods,
            timing, restaurants, transportation, and seasonal information across many
            sources. TripProvider brings that process into one workspace by generating
            structured itineraries that can be saved, reviewed, and improved as travel
            plans become more specific.
          </p>
        </div>
        <div className="about-story-visual" aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1100&q=80"
            alt=""
          />
          <span>Plan, save, and refine every route.</span>
        </div>
      </div>

      <div className="about-use-cases">
        <h2>Everyday use cases</h2>
        <div>
          <p>Plan weekend trips with a clear route before leaving home.</p>
          <p>Create a first draft to share with friends, family, or travel partners.</p>
          <p>Save itineraries and return to them when details need to change.</p>
          <p>Compare destination ideas by generating sample plans for each option.</p>
        </div>
      </div>
    </section>
  );
}

export default AboutPage;
