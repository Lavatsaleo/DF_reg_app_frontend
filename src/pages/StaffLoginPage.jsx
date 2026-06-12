import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { saveStaffSession } from "../utils/authSession";

function StaffLoginPage({ onBackHome, onAuthenticated, sessionNotice = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [localResetUrl, setLocalResetUrl] = useState("");
  const [ssoConfig, setSsoConfig] = useState({ enabled: false, providerName: "Organisation SSO" });

  useEffect(() => {
    let cancelled = false;

    async function loadSsoConfig() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/sso/config`);
        if (!cancelled) {
          setSsoConfig({
            enabled: Boolean(response.data?.enabled),
            providerName: response.data?.providerName || "Organisation SSO",
            loginUrl: response.data?.loginUrl || `${API_BASE_URL}/api/auth/sso/start`,
          });
        }
      } catch {
        if (!cancelled) {
          setSsoConfig({ enabled: false, providerName: "Organisation SSO" });
        }
      }
    }

    loadSsoConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const session = {
        token: response.data?.token,
        user: response.data?.user,
      };

      saveStaffSession(session);
      onAuthenticated(session);
    } catch (loginError) {
      setError(loginError.response?.data?.message || "Unable to sign in. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordResetRequest(event) {
    event.preventDefault();
    setResetSubmitting(true);
    setResetMessage("");
    setLocalResetUrl("");
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/password-reset/request`, {
        email: resetEmail,
      });

      setResetMessage(response.data?.message || "Password reset instructions have been sent if the account exists.");
      setLocalResetUrl(response.data?.localResetUrl || "");
    } catch (resetError) {
      setResetMessage(resetError.response?.data?.message || "Unable to start password reset. Please try again.");
    } finally {
      setResetSubmitting(false);
    }
  }

  function handleStartSso() {
    window.location.href = ssoConfig.loginUrl || `${API_BASE_URL}/api/auth/sso/start`;
  }

  return (
    <main id="main-content" className="page committee-page staff-login-page">
      <section className="committee-hero staff-login-hero">
        <div>
          <button type="button" className="back-button" onClick={onBackHome}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to portal
          </button>
          <p className="eyebrow">Internal workspace</p>
          <h1>Staff sign in</h1>
          <p>
            Sign in to access committee assignment, applicant review and internal selection tools.
          </p>
        </div>
        <div className="committee-hero-badge" aria-hidden="true">
          <i className="bi bi-shield-lock" />
          <span>Protected access</span>
        </div>
      </section>

      <section className="committee-section-card staff-login-card" aria-labelledby="staff-login-title">
        <div>
          <span className="ss-small-label dark">Committee module</span>
          <h2 id="staff-login-title">Sign in with your staff account</h2>
          <p>Only authorised staff can access this area.</p>
        </div>

        {error && (
          <div className="alert committee-alert error" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {error}
          </div>
        )}

        {sessionNotice && !error && (
          <div className="alert committee-alert warning" role="status">
            <i className="bi bi-clock-history" aria-hidden="true" /> {sessionNotice}
          </div>
        )}

        {ssoConfig.enabled && (
          <div className="staff-sso-panel">
            <button type="button" className="btn committee-primary-action staff-sso-button" onClick={handleStartSso}>
              <i className="bi bi-building-lock" aria-hidden="true" /> Continue with {ssoConfig.providerName}
            </button>
            <div className="staff-divider"><span>or</span></div>
          </div>
        )}

        {!showReset ? (
          <form className="staff-login-form" onSubmit={handleSubmit}>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className="btn committee-primary-action" disabled={submitting}>
              <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            <button type="button" className="staff-text-button" onClick={() => {
              setShowReset(true);
              setResetEmail(email);
              setResetMessage("");
              setLocalResetUrl("");
            }}>
              Forgot password?
            </button>
          </form>
        ) : (
          <form className="staff-login-form" onSubmit={handlePasswordResetRequest}>
            <div className="staff-reset-heading">
              <h3>Reset password</h3>
              <p>Enter your staff email address and we will send password reset instructions.</p>
            </div>

            {resetMessage && (
              <div className="alert committee-alert success" role="status">
                <i className="bi bi-info-circle" aria-hidden="true" /> {resetMessage}
              </div>
            )}

            {localResetUrl && (
              <div className="staff-local-reset-box">
                <strong>Temporary local testing link</strong>
                <p>SMTP is not configured yet, so use this link during local testing:</p>
                <a href={localResetUrl}>{localResetUrl}</a>
              </div>
            )}

            <label>
              Staff email address
              <input
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <button type="submit" className="btn committee-primary-action" disabled={resetSubmitting}>
              <i className="bi bi-send" aria-hidden="true" />
              {resetSubmitting ? "Sending..." : "Send reset instructions"}
            </button>

            <button type="button" className="staff-text-button" onClick={() => setShowReset(false)}>
              Back to sign in
            </button>
          </form>
        )}

        {!ssoConfig.enabled && (
          <p className="staff-login-note">
            Organisation single sign-on is ready in the system and will appear here after ICT provides the AD configuration.
          </p>
        )}
      </section>
    </main>
  );
}

export default StaffLoginPage;
