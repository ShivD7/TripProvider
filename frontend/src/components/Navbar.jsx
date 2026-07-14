import React, { useState } from "react";
import { Menu, Plane, Sparkles, UserCircle, X } from "lucide-react";

function Navbar({ currentUser, currentPage, onNavigate, onAuthClick, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function handleNavigate(page) {
    onNavigate(page);
    setIsMenuOpen(false);
  }

  function handleAuthClick(mode) {
    onAuthClick(mode);
    setIsMenuOpen(false);
  }

  return (
    <nav className="navbar">
      <button className="brand nav-button" type="button" onClick={() => handleNavigate("planner")}>
        <span className="brand-mark">
          <Plane size={20} />
        </span>
        TripProvider
      </button>

      <button
        className="mobile-menu-button"
        type="button"
        onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={`nav-links ${isMenuOpen ? "open" : ""}`} aria-label="Primary navigation">
        <button
          className={currentPage === "planner" ? "active" : ""}
          type="button"
          onClick={() => handleNavigate("planner")}
        >
          Explore
        </button>
        <button
          className={currentPage === "my-trips" ? "active" : ""}
          type="button"
          onClick={() => handleNavigate("my-trips")}
        >
          My Trips
        </button>
        <button
          className={currentPage === "about" ? "active" : ""}
          type="button"
          onClick={() => handleNavigate("about")}
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
        <button className="nav-action" type="button" onClick={() => handleAuthClick("login")}>
          <Sparkles size={17} />
          Sign in
        </button>
      )}
    </nav>
  );
}

export default Navbar;
