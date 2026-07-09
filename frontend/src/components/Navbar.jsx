import React from "react";
import { Plane, Sparkles, UserCircle } from "lucide-react";

function Navbar({ currentUser, currentPage, onNavigate, onAuthClick, onLogout }) {
  return (
    <nav className="navbar">
      <button className="brand nav-button" type="button" onClick={() => onNavigate("planner")}>
        <span className="brand-mark">
          <Plane size={20} />
        </span>
        TripProvider
      </button>

      <div className="nav-links" aria-label="Primary navigation">
        <button
          className={currentPage === "planner" ? "active" : ""}
          type="button"
          onClick={() => onNavigate("planner")}
        >
          Explore
        </button>
        <button
          className={currentPage === "my-trips" ? "active" : ""}
          type="button"
          onClick={() => onNavigate("my-trips")}
        >
          My Trips
        </button>
        <button
          className={currentPage === "about" ? "active" : ""}
          type="button"
          onClick={() => onNavigate("about")}
        >
          About
        </button>
      </div>

      {currentUser ? (
        <div className="nav-user">
          <button className="profile-button" type="button">
            <UserCircle size={18} />
            {currentUser.name}
          </button>
          <button className="logout-button" type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      ) : (
        <button className="nav-action" type="button" onClick={() => onAuthClick("login")}>
          <Sparkles size={17} />
          Sign in
        </button>
      )}
    </nav>
  );
}

export default Navbar;
