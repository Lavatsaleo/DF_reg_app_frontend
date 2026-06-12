import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { applyAuthToken, saveStaffSession } from "../utils/authSession";
import "./CommitteeDashboardPage.css";

function StaffSsoCompletePage({ token, error, onAuthenticated, onBackToSignIn }) {
  const initialFailure = Boolean(error) || !token;
  const initialMessage = error || (!token ? "Single sign-on did not return a valid staff session." : "Completing staff sign in...");
  const [statusMessage, setStatusMessage] = useState(initialMessage);
  const [failed, setFailed] = useState(initialFailure);

  useEffect(() => {
    if (error || !token) return undefined;

    let cancelled = false;

    async function completeSso() {
      try {
        applyAuthToken(token);
        const response = await axios.get(`${API_BASE_URL}/api/auth/me`);
        const session = {
          token,
          user: response.data?.user,
        };
        saveStaffSession(session);

        if (!cancelled) {
          onAuthenticated(session);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setStatusMessage("Single sign-on completed, but the staff session could not be verified.");
        }
      }
    }

    completeSso();

    return () => {
      cancelled = true;
    };
  }, [error, onAuthenticated, token]);

  return (
    <main id="main-content" className="page committee-page staff-login-page">
      <section className="committee-section-card staff-login-card staff-sso-complete-card" aria-live="polite">
        <div className="staff-sso-complete-icon" aria-hidden="true">
          <i className={`bi ${failed ? "bi-exclamation-triangle" : "bi-shield-check"}`} />
        </div>
        <h1>{failed ? "Single sign-on needs attention" : "Signing you in"}</h1>
        <p>{statusMessage}</p>
        {failed && (
          <button type="button" className="btn committee-primary-action" onClick={onBackToSignIn}>
            Back to staff sign in
          </button>
        )}
      </section>
    </main>
  );
}

export default StaffSsoCompletePage;
