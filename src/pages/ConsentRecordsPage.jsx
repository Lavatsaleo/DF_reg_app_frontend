import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

function formatDate(value) {
  if (!value) return "Not available";
  try {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "2-digit" }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function SignatureDisplay({ method, data, label }) {
  if (!data) return <span>Not available</span>;

  if (String(method || "").toUpperCase() === "DRAWN") {
    return (
      <div>
        <span className="d-block small text-muted mb-1">{label}</span>
        <svg viewBox="0 0 800 220" width="320" height="90" role="img" aria-label={label} style={{ maxWidth: "100%", borderBottom: "1px solid currentColor" }}>
          <path d={String(data)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      <span className="d-block small text-muted mb-1">{label}</span>
      <strong style={{ fontStyle: "italic", fontSize: "1.25rem" }}>{String(data)}</strong>
      <small className="d-block">Typed electronic signature</small>
    </div>
  );
}

function ConsentText({ consent }) {
  if (!consent) return <p>Consent wording for this historical version is not available.</p>;

  return (
    <div className="consent-print-text">
      <h3>{consent.introductionTitle}</h3>
      {consent.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

      <h3>{consent.purposeTitle}</h3>
      {consent.purpose.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {consent.informationLinks.map((item) => (
        <p key={item.url}>
          {item.before}<a href={item.url}>{item.label}</a>{item.between}<a href={item.secondUrl}>{item.secondLabel}</a>
        </p>
      ))}

      <h3>{consent.rightsTitle}</h3>
      <p>{consent.rights[0]}<a href={consent.speakUpUrl}>{consent.speakUpUrl}</a></p>

      <h3>{consent.questionsTitle}</h3>
      {consent.questions.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

      <h3>{consent.juratTitle}</h3>
      <p>{consent.juratWhen}</p>

      <h3>{consent.consentTitle}</h3>
      <p>{consent.consentIntro}</p>
      <ul>{consent.consentBullets.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function ConsentRecord({ record, printOnlyId, onPrint }) {
  const consent = record.consentSnapshot;
  const isPrintHidden = printOnlyId && printOnlyId !== record.applicantId;

  return (
    <article className={`card shadow-sm border-0 mb-4 consent-record ${isPrintHidden ? "consent-print-hidden" : ""}`}>
      <div className="card-body p-4 p-lg-5">
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4 consent-screen-actions">
          <div>
            <span className="ss-small-label dark">Signed consent</span>
            <h2 className="h4 mb-1">{record.applicantName || record.nameOrIdCode || "Applicant"}</h2>
            <p className="mb-0 text-muted">{record.applicationReference || record.participantCode || "No reference"} · {record.country || "Country not available"}</p>
          </div>
          <button type="button" className="btn ss-btn-outline" onClick={() => onPrint(record.applicantId)}>
            <i className="bi bi-printer" aria-hidden="true" /> Print this consent
          </button>
        </div>

        <div className="border rounded-4 p-3 mb-4">
          <strong>Consent version:</strong> {record.consentVersion || "Not available"}<br />
          <strong>Application submitted:</strong> {formatDate(record.submittedAt)}
        </div>

        <ConsentText consent={consent} />

        {record.juratRequired && consent && (
          <section className="border rounded-4 p-4 my-4">
            <h3 className="h5">{consent.juratTitle}</h3>
            <p>{consent.juratWhen}</p>
            <p className="fw-semibold">{consent.juratClause}</p>
            <dl className="row mb-3">
              <dt className="col-sm-4">Interpreter name</dt><dd className="col-sm-8">{record.jurat?.interpreterName || "Not available"}</dd>
              <dt className="col-sm-4">Interpreter address</dt><dd className="col-sm-8">{record.jurat?.interpreterAddress || "Not available"}</dd>
              <dt className="col-sm-4">Language / dialect</dt><dd className="col-sm-8">{record.jurat?.language || "Not available"}</dd>
              <dt className="col-sm-4">Date</dt><dd className="col-sm-8">{formatDate(record.jurat?.date)}</dd>
            </dl>
            <SignatureDisplay method={record.jurat?.signatureMethod} data={record.jurat?.signatureData} label="Signature of Interpreter" />
          </section>
        )}

        <section className="border-top pt-4 mt-4">
          <h3 className="h5">Your Consent</h3>
          <p>☑ {record.informationRead ? "Yes" : "No"} — I have read and understood this information</p>
          <p>☑ {record.agreedToParticipate ? "Yes" : "No"} — I agree to take part in this questionnaire</p>
          <dl className="row">
            <dt className="col-sm-4">Name / ID code</dt><dd className="col-sm-8">{record.nameOrIdCode || "Not available"}</dd>
            <dt className="col-sm-4">Date</dt><dd className="col-sm-8">{formatDate(record.signedDate)}</dd>
          </dl>
          <SignatureDisplay method={record.signatureMethod} data={record.signatureData} label="Signature" />
        </section>
      </div>
    </article>
  );
}

function ConsentRecordsPage({ onBack, onSessionExpired }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [printOnlyId, setPrintOnlyId] = useState("");

  async function loadRecords() {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(`${API_BASE_URL}/api/consents`);
      setRecords(response.data?.records || []);
      setGeneratedAt(response.data?.generatedAt || null);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onSessionExpired?.();
        return;
      }
      setError(requestError.response?.data?.message || "Unable to load consent records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRecords(); }, []);

  useEffect(() => {
    const reset = () => setPrintOnlyId("");
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  function printAll() {
    setPrintOnlyId("");
    window.requestAnimationFrame(() => window.print());
  }

  function printOne(applicantId) {
    setPrintOnlyId(applicantId);
    window.requestAnimationFrame(() => window.print());
  }

  return (
    <main id="main-content" className="container py-5">
      <style>{`
        @media print {
          .consent-screen-actions, .consent-page-actions, nav, .ss-accessibility-toolbar { display: none !important; }
          .consent-print-hidden { display: none !important; }
          .consent-record { box-shadow: none !important; border: 0 !important; break-after: page; }
          .consent-record:last-child { break-after: auto; }
          a { color: inherit !important; text-decoration: underline !important; }
        }
      `}</style>

      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4 consent-page-actions">
        <div>
          <button type="button" className="btn ss-btn-outline mb-3" onClick={onBack}><i className="bi bi-arrow-left" aria-hidden="true" /> Back to staff workspace</button>
          <span className="ss-small-label dark d-block">Super Admin</span>
          <h1>Signed consent records</h1>
          <p className="mb-0">View and print the consent captured with each submitted Application.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn ss-btn-outline" onClick={loadRecords} disabled={loading}><i className="bi bi-arrow-clockwise" aria-hidden="true" /> Refresh</button>
          <button type="button" className="btn ss-btn-primary" onClick={printAll} disabled={!records.length}><i className="bi bi-printer" aria-hidden="true" /> Print all consents</button>
        </div>
      </div>

      {generatedAt && <p className="text-muted consent-page-actions">Generated {formatDate(generatedAt)} · {records.length} consent record{records.length === 1 ? "" : "s"}</p>}
      {error && <div className="alert ss-alert-error consent-page-actions">{error}</div>}
      {loading ? (
        <div className="text-center py-5 consent-page-actions"><div className="spinner-border" role="status" /><p className="mt-3">Loading signed consents...</p></div>
      ) : records.length === 0 ? (
        <div className="ss-section-card consent-page-actions"><h2>No signed consents yet</h2><p>Consent records will appear here after applicants submit the new Physical Academy Application.</p></div>
      ) : (
        records.map((record) => <ConsentRecord key={record.applicantId} record={record} printOnlyId={printOnlyId} onPrint={printOne} />)
      )}
    </main>
  );
}

export default ConsentRecordsPage;
