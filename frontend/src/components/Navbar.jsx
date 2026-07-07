import React from "react";
import { Plane, Sparkles } from "lucide-react";

function Navbar() {
  return (
    <nav className="navbar">
      <a className="brand" href="#">
        <span className="brand-mark">
          <Plane size={20} />
        </span>
        TripProvider
      </a>

      <div className="nav-links" aria-label="Primary navigation">
        <a href="#">Explore</a>
        <a href="#">Itineraries</a>
        <a href="#">Pricing</a>
        <a href="#">About</a>
      </div>

      <button className="nav-action" type="button">
        <Sparkles size={17} />
        Plan Trip
      </button>
    </nav>
  );
}

export default Navbar;
