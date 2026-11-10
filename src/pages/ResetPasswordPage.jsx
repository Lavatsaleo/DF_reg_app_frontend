import { useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import PasswordFields from "../components/PasswordFields";
import { getPasswordPairProblem } from "../utils/passwordRules";

// Opened from the link in a password reset email: /reset-password/<token>.
function ResetPasswordPage({ token, onBackToSignIn }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const problem = getPasswordPairProblem(password, confirmPassword);
    if (problem) {
      setError(problem);
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`${API_BASE_URL}/api/auth/password-reset/complete`, {
        token,
        password,
        confirmPassword,
      });
      setPassword("");
      setConfirmPassword("");
      setDone(true);
      window.requestAnimationFrame(() => resultRef.current?.focus());
    } catch (resetError) {
      setError(
        resetError.response?.status === 429
          ? "Too many attempts. Wait a while and try again."
          : resetError.response?.data?.message || "We could not reset the password. The link may have expired."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="page staff-login-page">
      <section className="staff-login-shell" aria-labelledby="reset-password-title">
        <div className="staff-login-intro is-compact">
          <button type="button" className="back-button staff-login-back" onClick={onBackToSignIn}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to sign in
          </button>
          <p className="eyebrow">Staff access</p>
          <h1 id="reset-password-title">Choose a new password</h1>
          <p className="staff-login-lead">
            Set a new password for your Digital Futures staff account. Once it is saved, you are signed out on every device and can sign in again with the new password.
          </p>
        </div>

        <div className="staff-login-card" aria-label="New password form">
          <div className="staff-login-card-header">
            <div className="staff-login-lock">
              <i className="bi bi-key" aria-hidden="true" />
            </div>
            <div>
              <span>Password reset</span>
              <h2>{done ? "Password changed" : "New password"}</h2>
            </div>
          </div>

          {done ? (
            <div className="staff-login-done">
              <p ref={resultRef} tabIndex="-1" className="staff-login-note" role="status">
                <i className="bi bi-check-circle-fill" aria-hidden="true" />
                <span>Your password has been changed. You can now sign in with your new password.</span>
              </p>
              <button type="button" className="btn committee-primary-action staff-login-submit" onClick={onBackToSignIn}>
                <i className="bi bi-box-arrow-in-right" aria-hidden="true" /> Go to sign in
              </button>
            </div>
          ) : !token ? (
            <div className="alert alert-error" role="alert">
              This reset link is incomplete. Open the link from your email again, or ask for a new one on the sign-in page.
            </div>
          ) : (
            <form className="staff-login-form" onSubmit={handleSubmit} noValidate>
              {error && <div className="alert alert-error mb-0" role="alert">{error}</div>}
              <PasswordFields
                password={password}
                confirmPassword={confirmPassword}
                onPasswordChange={setPassword}
                onConfirmPasswordChange={setConfirmPassword}
                label="New password"
                confirmLabel="Confirm new password"
                stacked
              />
              <button type="submit" className="btn committee-primary-action staff-login-submit" disabled={submitting}>
                <i className="bi bi-check2-circle" aria-hidden="true" />
                {submitting ? "Saving..." : "Save new password"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
