import { useId, useState } from "react";
import { getPasswordChecks } from "../utils/passwordRules";
import "./PasswordFields.css";

function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  person,
  label = "Password",
  confirmLabel = "Confirm password",
  note,
  required = true,
  stacked = false,
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const checks = getPasswordChecks(password, person);
  const allMet = checks.every((check) => check.met);
  const showMatch = confirmPassword.length > 0;
  const matches = showMatch && confirmPassword === password;
  const inputType = visible ? "text" : "password";

  return (
    <fieldset className={`pw-fields ${stacked ? "is-stacked" : ""}`}>
      <legend className="visually-hidden">{label}</legend>

      <div className="pw-field">
        <label htmlFor={`${id}-password`}>{label}</label>
        <input
          id={`${id}-password`}
          type={inputType}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          autoComplete="new-password"
          aria-describedby={`${id}-rules`}
          spellCheck="false"
          autoCapitalize="none"
          maxLength={128}
          required={required}
        />
      </div>

      <div className="pw-field">
        <label htmlFor={`${id}-confirm`}>{confirmLabel}</label>
        <input
          id={`${id}-confirm`}
          type={inputType}
          value={confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          autoComplete="new-password"
          aria-describedby={`${id}-match`}
          aria-invalid={showMatch && !matches ? "true" : undefined}
          spellCheck="false"
          autoCapitalize="none"
          maxLength={128}
          required={required}
        />
        <p id={`${id}-match`} className={`pw-match ${showMatch ? (matches ? "is-ok" : "is-bad") : ""}`} aria-live="polite">
          {showMatch && (
            <>
              <i className={`bi ${matches ? "bi-check-circle-fill" : "bi-x-circle-fill"}`} aria-hidden="true" />
              {matches ? "The passwords match." : "The passwords do not match yet."}
            </>
          )}
        </p>
      </div>

      <button
        type="button"
        className="pw-toggle"
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        <i className={`bi ${visible ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />
        {visible ? "Hide passwords" : "Show passwords"}
      </button>

      <div id={`${id}-rules`} className={`pw-rules ${allMet ? "is-complete" : ""}`}>
        <p className="pw-rules-title">A strong password must have:</p>
        <ul>
          {checks.map((check) => (
            <li key={check.id} className={check.met ? "is-met" : ""}>
              <i className={`bi ${check.met ? "bi-check-circle-fill" : "bi-circle"}`} aria-hidden="true" />
              <span>{check.label}</span>
              <span className="visually-hidden">{check.met ? " (done)" : " (not yet)"}</span>
            </li>
          ))}
        </ul>
        <p className="pw-tip">
          <i className="bi bi-lightbulb" aria-hidden="true" />
          <span>
            Tip: join three or four unrelated words with a symbol and a number. It is strong and easier to remember.
            Do not reuse a password from another account.
          </span>
        </p>
        {note && (
          <p className="pw-note">
            <i className="bi bi-shield-lock" aria-hidden="true" />
            <span>{note}</span>
          </p>
        )}
      </div>
    </fieldset>
  );
}

export default PasswordFields;
