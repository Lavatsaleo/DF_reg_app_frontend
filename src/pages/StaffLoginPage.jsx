import { useState } from "react";
import axios from "axios";
import sightsaversLogo from "../assets/sightsavers-logo.png";
import { API_BASE_URL } from "../config/api";

const EMPTY_LOGIN_FORM = {
  email: "",
  password: "",
};

function StaffLoginPage({ onLogin, onBackHome }) {
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, loginForm);
      const token = response.data?.token;
      const user = response.data?.user;

      if (!token || !user) {
        throw new Error("The server did not return a valid staff session.");
      }

      onLogin({ token, user });
    } catch (loginError) {
      setError(loginError.response?.data?.message || loginError.message || "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="page staff-login-page">
      <section className="staff-login-shell" aria-labelledby="committee-sign-in-title">
        <div className="staff-login-intro">
          <button type="button" className="back-button staff-login-back" onClick={onBackHome}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to portal
          </button>

          <div className="staff-login-brand-card" aria-hidden="true">
            <img src={sightsaversLogo} alt="" />
            <span>Digital Futures</span>
          </div>

          <p className="eyebrow">Internal committee access</p>
          <h1 id="committee-sign-in-title">Review dashboard sign in</h1>
          <p className="staff-login-lead">
            Secure access for authorised staff to assign applicants, manage reviewers, and record selection decisions.
          </p>

          <div className="staff-login-feature-grid" aria-label="Committee dashboard capabilities">
            <div>
              <i className="bi bi-people-fill" aria-hidden="true" />
              <strong>Reviewer management</strong>
              <span>View committee members and workloads.</span>
            </div>
            <div>
              <i className="bi bi-person-check-fill" aria-hidden="true" />
              <strong>Applicant review</strong>
              <span>Assess skills-test outcomes and profiles.</span>
            </div>
            <div>
              <i className="bi bi-shield-lock-fill" aria-hidden="true" />
              <strong>Controlled access</strong>
              <span>Only approved staff accounts can sign in.</span>
            </div>
          </div>
        </div>

        <div className="staff-login-card" aria-label="Committee sign in form">
          <div className="staff-login-card-header">
            <div className="staff-login-lock">
              <i className="bi bi-shield-check" aria-hidden="true" />
            </div>
            <div>
              <span>Authorised users only</span>
              <h2>Committee sign in</h2>
            </div>
          </div>

          {error && <div className="alert alert-error mb-3">{error}</div>}

          <form onSubmit={handleLogin} className="staff-login-form">
            <label>
              Email address
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="name@example.org"
                autoComplete="username"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className="btn committee-primary-action staff-login-submit" disabled={submitting}>
              <i className="bi bi-box-arrow-in-right" aria-hidden="true" /> {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

        </div>
      </section>
    </main>
  );
}

export default StaffLoginPage;
