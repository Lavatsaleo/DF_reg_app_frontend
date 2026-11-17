import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

const RESEND_WAIT_SECONDS = 60;

/*
 * Shown when a participant registration link is opened. The link alone does not open the form:
 * the participant asks for a code, which is emailed to them, and enters it here. The code is not
 * sent automatically, because email security scanners open links before the person does.
 */
function RegistrationCodeGate({ linkToken, maskedEmail, notice, onVerified, onBackHome }) {
  const [stage, setStage] = useState("start");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const headingRef = useRef(null);
  const codeRef = useRef(null);
  const base = `${API_BASE_URL}/api/participant-registration/invite/${encodeURIComponent(linkToken)}`;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (stage === "code") codeRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function requestCode() {
    setError("");
    setMessage("");
    try {
      setLoading(true);
      const response = await axios.post(`${base}/request-code`);
      setMessage(response.data?.message || "We have sent you a code.");
      setStage("code");
      setResendIn(RESEND_WAIT_SECONDS);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We could not send a code. Check your internet connection and try again.");
      if (requestError.response?.status === 429) setStage("code");
    } finally {
      setLoading(false);
    }
  }

  async function verify(event) {
    event.preventDefault();
    setError("");
    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setError("Enter the 6-digit code from the email.");
      codeRef.current?.focus();
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post(`${base}/verify`, { code: cleanCode });
      onVerified(response.data?.sessionToken);
    } catch (verifyError) {
      setError(verifyError.response?.data?.message || "We could not check the code. Please try again.");
      codeRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" tabIndex="-1" className="container py-5">
      <section className="ss-section-card mx-auto pr-code-gate" style={{ maxWidth: "720px" }} aria-labelledby="pr-code-title">
        <span className="ss-small-label dark">Participant registration</span>
        <h1 id="pr-code-title" tabIndex="-1" ref={headingRef}>Confirm it is you</h1>

        {notice && <div className="alert ss-alert-warning" role="alert">{notice}</div>}

        <p>
          To protect your information, we email you a 6-digit code before your registration form opens.
          {maskedEmail && <> We will send it to <strong>{maskedEmail}</strong>, the email address on your application.</>}
        </p>

        {stage === "start" ? (
          <button type="button" className="btn ss-btn-primary" onClick={requestCode} disabled={loading}>
            <i className="bi bi-envelope" aria-hidden="true" /> {loading ? "Sending…" : "Email me a code"}
          </button>
        ) : (
          <form onSubmit={verify} noValidate>
            <label htmlFor="pr-code-input" className="form-label fw-semibold">6-digit code</label>
            <div className="pr-code-row">
              <input
                id="pr-code-input"
                ref={codeRef}
                className="form-control"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "pr-code-error" : "pr-code-help"}
              />
              <button type="submit" className="btn ss-btn-primary" disabled={loading}>
                {loading ? "Checking…" : "Open my form"}
              </button>
            </div>
            <p id="pr-code-help" className="pr-code-help">
              The code works for 10 minutes. Check your spam or junk folder if you cannot find it.
            </p>
            <button type="button" className="btn btn-sm ss-link-button" onClick={requestCode} disabled={loading || resendIn > 0}>
              {resendIn > 0 ? `Send a new code (in ${resendIn} s)` : "Send a new code"}
            </button>
          </form>
        )}

        {message && !error && <p className="alert ss-alert-info mt-3 mb-0" role="status">{message}</p>}
        {error && <p id="pr-code-error" className="alert ss-alert-error mt-3 mb-0" role="alert">{error}</p>}

        <hr />
        <p className="mb-2">
          Your answers are saved as you go. If you can no longer use this email address, contact the programme team.
        </p>
        <button type="button" className="btn ss-btn-outline" onClick={onBackHome}>Back to home</button>
      </section>
    </main>
  );
}

export default RegistrationCodeGate;
