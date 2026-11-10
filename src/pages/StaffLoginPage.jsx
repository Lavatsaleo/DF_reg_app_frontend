import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

const EMPTY_LOGIN_FORM = {
  email: "",
  password: "",
};

function StaffLoginPage({ onLogin, onBackHome }) {
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // "sign-in", or "forgot" for the reset-link request.
  const [mode, setMode] = useState("sign-in");
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [localResetUrl, setLocalResetUrl] = useState("");
  const cardHeadingRef = useRef(null);
  const modeChanged = useRef(false);

  // Switching between sign in and reset replaces the card, so move focus to its heading.
  useEffect(() => {
    if (!modeChanged.current) return;
    cardHeadingRef.current?.focus();
  }, [mode]);

  function switchMode(nextMode) {
    modeChanged.current = true;
    setError("");
    setResetMessage("");
    setLocalResetUrl("");
    if (nextMode === "forgot" && !resetEmail) setResetEmail(loginForm.email);
    setMode(nextMode);
  }

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

  async function handleResetRequest(event) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setLocalResetUrl("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      setError("Enter the email address you use to sign in, for example name@example.org.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/password-reset/request`, { email: resetEmail.trim() });
      setResetMessage(
        "If this email address belongs to an active staff account, we have sent a link to choose a new password. "
        + "Check your inbox and spam folder. The link works once, and the email says when it expires."
      );
      setLocalResetUrl(response.data?.localResetUrl || "");
    } catch (requestError) {
      setError(
        requestError.response?.status === 429
          ? "Too many reset requests. Wait a while and try again."
          : requestError.response?.data?.message || "We could not send the reset link. Try again in a few minutes."
      );
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

          <p className="eyebrow">Staff access</p>
          <h1 id="committee-sign-in-title">Staff sign in</h1>
          <p className="staff-login-lead">
            Sign in to your workspace. Your account determines whether you can access programme insights or committee review.
          </p>

          <div className="staff-login-feature-grid" aria-label="Staff workspace capabilities">
            <div>
              <i className="bi bi-people-fill" aria-hidden="true" />
              <strong>Programme insights</strong>
              <span>Explore applications by age, country, month and region.</span>
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

        <div className="staff-login-card" aria-label={mode === "forgot" ? "Reset your password" : "Staff sign in form"}>
          <div className="staff-login-card-header">
            <div className="staff-login-lock">
              <i className={`bi ${mode === "forgot" ? "bi-key" : "bi-shield-check"}`} aria-hidden="true" />
            </div>
            <div>
              <span>{mode === "forgot" ? "Forgotten password" : "Authorised users only"}</span>
              <h2 ref={cardHeadingRef} tabIndex="-1">{mode === "forgot" ? "Reset your password" : "Staff sign in"}</h2>
            </div>
          </div>

          {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}

          {mode === "sign-in" ? (
            <>
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

              <p className="staff-login-switch">
                <button type="button" className="staff-text-button" onClick={() => switchMode("forgot")}>
                  Forgot your password?
                </button>
              </p>
            </>
          ) : (
            <>
              {resetMessage ? (
                <div className="staff-login-note" role="status">
                  <i className="bi bi-envelope-check" aria-hidden="true" />
                  <div>
                    <p className="mb-0">{resetMessage}</p>
                    {localResetUrl && (
                      <p className="mb-0 mt-2">
                        Local testing only: <a href={localResetUrl}>open the reset link</a>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetRequest} className="staff-login-form" noValidate>
                  <p className="staff-login-help">
                    Enter the email address you use to sign in. We will email you a link to choose a new password.
                  </p>
                  <label>
                    Email address
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      placeholder="name@example.org"
                      autoComplete="username"
                      required
                    />
                  </label>
                  <button type="submit" className="btn committee-primary-action staff-login-submit" disabled={submitting}>
                    <i className="bi bi-envelope-arrow-up" aria-hidden="true" /> {submitting ? "Sending..." : "Email me a reset link"}
                  </button>
                </form>
              )}

              <p className="staff-login-switch">
                <button type="button" className="staff-text-button" onClick={() => switchMode("sign-in")}>
                  <i className="bi bi-arrow-left" aria-hidden="true" /> Back to sign in
                </button>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default StaffLoginPage;
