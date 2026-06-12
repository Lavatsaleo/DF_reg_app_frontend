import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import "./CommitteeDashboardPage.css";

function ResetPasswordPage({ token, onBackToSignIn }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(`${API_BASE_URL}/api/auth/password-reset/complete`, {
        token,
        password,
      });
      setMessage(response.data?.message || "Password reset successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (resetError) {
      setError(resetError.response?.data?.message || "Unable to reset password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="page committee-page staff-login-page">
      <section className="committee-hero staff-login-hero">
        <div>
          <button type="button" className="back-button" onClick={onBackToSignIn}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to sign in
          </button>
          <p className="eyebrow">Internal workspace</p>
          <h1>Reset password</h1>
          <p>Create a new password for your Digital Futures staff account.</p>
        </div>
        <div className="committee-hero-badge" aria-hidden="true">
          <i className="bi bi-key" />
          <span>Password reset</span>
        </div>
      </section>

      <section className="committee-section-card staff-login-card" aria-labelledby="reset-password-title">
        <div>
          <span className="ss-small-label dark">Staff account</span>
          <h2 id="reset-password-title">Choose a new password</h2>
          <p>After resetting, sign in again using your new password.</p>
        </div>

        {message && (
          <div className="alert committee-alert success" role="status">
            <i className="bi bi-check-circle" aria-hidden="true" /> {message}
          </div>
        )}

        {error && (
          <div className="alert committee-alert error" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {error}
          </div>
        )}

        <form className="staff-login-form" onSubmit={handleSubmit}>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <button type="submit" className="btn committee-primary-action" disabled={submitting}>
            <i className="bi bi-check2-circle" aria-hidden="true" />
            {submitting ? "Resetting..." : "Reset password"}
          </button>

          {message && (
            <button type="button" className="staff-text-button" onClick={onBackToSignIn}>
              Go to sign in
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
