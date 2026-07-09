import React, { useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";

function SignupForm({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const cleanEmail = email.trim();
    const displayName = name.trim() || cleanEmail.split("@")[0];
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: displayName,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data.session) {
      setSuccessMessage("Check your email to confirm your account before signing in.");
      return;
    }

    onSubmit({
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name || displayName,
      session: data.session,
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        <span>Name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
        />
      </label>

      <label>
        <span>Email</span>
        <div className="auth-input-shell">
          <Mail size={17} />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
      </label>

      <label>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          minLength="8"
          required
        />
      </label>

      <button className="auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating Account..." : "Create Account"}
      </button>

      {errorMessage && <p className="auth-error">{errorMessage}</p>}
      {successMessage && <p className="auth-success">{successMessage}</p>}
    </form>
  );
}

export default SignupForm;
