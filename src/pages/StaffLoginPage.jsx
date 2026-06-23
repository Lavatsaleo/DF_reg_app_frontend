import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

function StaffLoginPage({ onBackHome, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email address and password to continue.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: email.trim(),
        password,
      });

      const token = response.data?.token || response.data?.accessToken;
      const user = response.data?.user || response.data?.staffUser || null;

      if (!token) {
        setError("Login succeeded but no session token was returned. Please check the backend response.");
        return;
      }

      onLoginSuccess(token, user);
    } catch (loginError) {
      setError(loginError.response?.data?.message || "Unable to sign in. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="page committee-page">
      <section className="committee-hero">
        <div>
          <button type="button" className="back-button" onClick={onBackHome}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to portal
          </button>
          <p className="eyebrow">Internal access</p>
          <h1>Staff login</h1>
          <p>
            Sign in to access the existing committee review and assignment workspace.
          </p>
        </div>
      </section>

      <section className="committee-shell">
        <div className="committee-card staff-login-card">
          <form className="staff-login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <label htmlFor="staff-email">Email address</label>
            <input
              id="staff-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
            />

            <label htmlFor="staff-password">Password</label>
            <div className="staff-password-row">
              <input
                id="staff-password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn committee-secondary-action"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button type="submit" className="btn committee-primary-action" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default StaffLoginPage;
