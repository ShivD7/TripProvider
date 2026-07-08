import React from "react";
import { Plane, Sparkles, UserCircle } from "lucide-react";

function Navbar({ currentUser, onAuthClick, onLogout }) {
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
        <a href="#">My Trips</a>
        <a href="#">Pricing</a>
        <a href="#">About</a>
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
