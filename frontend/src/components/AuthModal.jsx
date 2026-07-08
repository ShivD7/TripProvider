import React from "react";
import { LogIn, UserPlus, X } from "lucide-react";
import LoginForm from "./LoginForm.jsx";
import SignupForm from "./SignupForm.jsx";

function AuthModal({ mode, onClose, onSubmit, onModeChange }) {
  const isSignup = mode === "signup";

  return (
    <div className="auth-backdrop" role="presentation">
      <section className="auth-modal" role="dialog" aria-modal="true">
        <button className="auth-close" type="button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="auth-header">
          <span className="auth-icon">
            {isSignup ? <UserPlus size={22} /> : <LogIn size={22} />}
          </span>
          <div>
            <p className="eyebrow dark">{isSignup ? "Create account" : "Welcome back"}</p>
            <h2>{isSignup ? "Save trips to your travel library." : "Sign in to save this itinerary."}</h2>
          </div>
        </div>

        {isSignup ? (
          <SignupForm onSubmit={onSubmit} />
        ) : (
          <LoginForm onSubmit={onSubmit} />
        )}

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New to TripProvider?"}{" "}
          <button
            type="button"
            onClick={() => onModeChange(isSignup ? "login" : "signup")}
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      </section>
    </div>
  );
}

export default AuthModal;
