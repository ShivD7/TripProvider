import React, { useState } from "react";
import { Mail } from "lucide-react";

function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    onSubmit({
      email: email.trim(),
      name: email.trim().split("@")[0],
      password,
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
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

      <button className="auth-submit" type="submit">
        Sign In
      </button>
    </form>
  );
}

export default LoginForm;
