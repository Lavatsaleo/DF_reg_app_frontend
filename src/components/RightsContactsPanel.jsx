import { buildContactSnapshot, getApplicationContactCountries } from "../utils/countryContext";

function ContactValue({ value }) {
  const text = String(value || "To be confirmed");
  if (text.includes("@")) {
    return <a href={`mailto:${text}`}>{text}</a>;
  }
  return <span>{text}</span>;
}

function RightsContactsPanel({ consent, residenceCountry, compact = false }) {
  const countries = getApplicationContactCountries({ residenceCountry });
  const rows = buildContactSnapshot(consent, countries);
  const contextLabel = residenceCountry
    ? `Showing contacts for your selected country of residence: ${residenceCountry}`
    : "Select your country of residence in the Application to show the relevant country contacts. Until then, all programme-country contacts are shown.";

  return (
    <aside className={`ss-section-card ${compact ? "p-3" : "p-4"}`} aria-label="Your rights and country contacts">
      <span className="ss-small-label dark">Your rights & contacts</span>
      <h2 className={compact ? "h5 mt-2" : "h4 mt-2"}>Help is always visible</h2>
      <p className="small">
        You have the right to access, correct, delete, restrict, object to the use of, or request transfer of your personal data. You also have the right to be treated fairly and with respect by everyone involved in this project.
      </p>
      <p className="small text-muted">{contextLabel}</p>

      <div className="border rounded-4 p-3 mb-3">
        <strong className="d-block mb-2">Safeguarding concerns</strong>
        {rows.map((row) => (
          <div key={`safeguarding-${row.country}`} className="small mb-2">
            <span className="fw-semibold">{row.country}: </span>
            <ContactValue value={row.safeguarding} />
          </div>
        ))}
      </div>

      <div className="border rounded-4 p-3 mb-3">
        <strong className="d-block mb-2">Application questions or concerns</strong>
        {rows.map((row) => (
          <div key={`questions-${row.country}`} className="small mb-2">
            <span className="fw-semibold">{row.country}: </span>
            <ContactValue value={row.questions} />
          </div>
        ))}
      </div>

      <div className="border-top mt-3 pt-3 small">
        <strong className="d-block mb-1">Speak Up</strong>
        <a href={consent?.speakUpUrl} target="_blank" rel="noreferrer">
          Open the Sightsavers Speak Up platform
        </a>
      </div>
    </aside>
  );
}

export default RightsContactsPanel;
