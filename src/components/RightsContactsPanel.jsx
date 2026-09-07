import { buildContactSnapshot, getContactCountries } from "../utils/countryContext";

function ContactValue({ value }) {
  const text = String(value || "To be confirmed");
  if (text.includes("@")) {
    return <a href={`mailto:${text}`}>{text}</a>;
  }
  return <span>{text}</span>;
}

function RightsContactsPanel({ consent, residenceCountry, detectedCountry, compact = false }) {
  const countries = getContactCountries({ residenceCountry, detectedCountry });
  const rows = buildContactSnapshot(consent, countries);
  const contextLabel = residenceCountry
    ? `Showing contacts for your selected country of residence: ${residenceCountry}`
    : detectedCountry
      ? `Showing contacts based on your current location: ${detectedCountry}`
      : "Country could not be confirmed from your current location, so all programme-country contacts are shown.";

  return (
    <aside className={`ss-section-card ${compact ? "p-3" : "p-4"}`} aria-label="Your rights and country contacts">
      <span className="ss-small-label dark">Your rights & contacts</span>
      <h2 className={compact ? "h5 mt-2" : "h4 mt-2"}>Help is always visible</h2>

      {consent?.rightsIntro && (
        <p className="small mb-3">{consent.rightsIntro}</p>
      )}

      <p className="small text-muted">{contextLabel}</p>

      <div className="d-grid gap-3">
        {rows.map((row) => (
          <div key={row.country} className="border rounded-4 p-3">
            <strong className="d-block mb-2">{row.country}</strong>
            <div className="small mb-2">
              <span className="fw-semibold d-block">Country Safeguarding Lead</span>
              <ContactValue value={row.safeguarding} />
            </div>
            <div className="small">
              <span className="fw-semibold d-block">Application questions or concerns</span>
              <ContactValue value={row.questions} />
            </div>
          </div>
        ))}
      </div>

      {consent?.questionsIntro && (
        <p className="small mt-3 mb-0">{consent.questionsIntro}</p>
      )}

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
