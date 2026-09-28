import { buildContactSnapshot, getApplicationContactCountries } from "../utils/countryContext";

function ContactValue({ value }) {
  const text = String(value || "To be confirmed");
  if (text.includes("@")) {
    return <a className="ss-contact-value" href={`mailto:${text}`}>{text}</a>;
  }
  return <span className="ss-contact-value">{text}</span>;
}

function ContactRows({ rows, field }) {
  return rows.map((row) => (
    <div key={`${field}-${row.country}`} className="ss-contact-row">
      <span className="ss-contact-country">{row.country}</span>
      <ContactValue value={row[field]} />
    </div>
  ));
}

function RightsContactsPanel({ consent, residenceCountry, compact = false }) {
  const countries = getApplicationContactCountries({ residenceCountry });
  const rows = buildContactSnapshot(consent, countries);
  const contextLabel = residenceCountry
    ? `Showing contacts for your selected country of residence: ${residenceCountry}`
    : "Select your country of residence in the Application to show the relevant country contacts. Until then, all programme-country contacts are shown.";

  return (
    <aside className={`ss-section-card ss-rights-contacts-panel ${compact ? "p-3" : "p-4"}`} aria-label="Your rights and country contacts">
      <span className="ss-small-label dark">Your rights and contacts</span>
      <h2 className={compact ? "h5 mt-2" : "h4 mt-2"}>Rights and support contacts</h2>
      <p className="small">
        You have the right to access, correct, delete, restrict, object to the use of, or request transfer of your personal data. You also have the right to be treated fairly and with respect by everyone involved in this project.
      </p>
      <p className="small text-muted">{contextLabel}</p>

      <div className="ss-contact-card mb-3">
        <strong className="d-block mb-2">Safeguarding concerns</strong>
        <ContactRows rows={rows} field="safeguarding" />
      </div>

      <div className="ss-contact-card mb-3">
        <strong className="d-block mb-2">Application questions or concerns</strong>
        <ContactRows rows={rows} field="questions" />
      </div>

      <div className="border-top mt-3 pt-3 small">
        <strong className="d-block mb-1">Speak Up</strong>
        <a className="ss-contact-value" href={consent?.speakUpUrl} target="_blank" rel="noreferrer">
          Open the Sightsavers Speak Up platform
        </a>
      </div>
    </aside>
  );
}

export default RightsContactsPanel;
