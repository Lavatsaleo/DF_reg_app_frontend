import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { formatPathwayLabel } from "../utils/displayLabels";
import "./ConsentRecordsPage.css";

const COUNTRY_OPTIONS = ["Kenya", "Nigeria", "Ghana", "Zambia"];
const PATHWAY_OPTIONS = ["PHYSICAL_ACADEMY", "VIRTUAL_ACADEMY", "DIGITAL_ENTREPRENEURSHIP"];
const PAGE_SIZE = 25;
const TABS = ["signed", "requests"];
const EMPTY_FILTERS = { search: "", country: "", pathway: "", from: "", to: "", assisted: "", requestStatus: "" };

function formatDate(value) {
  if (!value) return "Not available";
  try {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "2-digit" }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatShortDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatJuratClause(template, jurat = {}) {
  return String(template || "")
    .replace("[name]", jurat.interpreterName || "[name]")
    .replace("[address]", jurat.interpreterAddress || "[address]")
    .replace("[name of language]", jurat.language || "[name of language]");
}

// "DF-01-PHYSICAL-ACADEMY-CONSENT-V4-2026-09-29" reads as "Version 4" in the list.
function shortVersion(version) {
  if (!version) return "No version";
  const match = /-V(\d+)(?:-|$)/i.exec(version);
  return match ? `Version ${match[1]}` : version;
}

function readTabFromHash() {
  const id = window.location.hash.replace("#", "");
  return TABS.includes(id) ? id : "signed";
}

function buildQuery(filters, extra = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) {
    if (value) query.set(key, value);
  }
  return query.toString();
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

function ContactValue({ value }) {
  const text = String(value || "To be confirmed");
  return text.includes("@") ? <a href={`mailto:${text}`}>{text}</a> : <span>{text}</span>;
}

function ConsentText({ consent, contactsDisplayedAtSigning }) {
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
      <p>{consent.rightsIntro}</p>
      {Array.isArray(contactsDisplayedAtSigning) && contactsDisplayedAtSigning.length > 0 && (
        <div className="border rounded-4 p-3 mb-3">
          {contactsDisplayedAtSigning.map((row) => (
            <div key={`safeguarding-${row.country}`} className="mb-2">
              <strong>{row.country}:</strong> <ContactValue value={row.safeguarding} />
            </div>
          ))}
        </div>
      )}
      <p>{consent.speakUpPrefix}<a href={consent.speakUpUrl}>{consent.speakUpUrl}</a></p>

      <h3>{consent.questionsTitle}</h3>
      <p>{consent.questionsIntro}</p>
      {Array.isArray(contactsDisplayedAtSigning) && contactsDisplayedAtSigning.length > 0 && (
        <div className="border rounded-4 p-3 mb-3">
          {contactsDisplayedAtSigning.map((row) => (
            <div key={`questions-${row.country}`} className="mb-2">
              <strong>{row.country}:</strong> <ContactValue value={row.questions} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConsentRecord({ record }) {
  const consent = record.consentSnapshot;

  return (
    <article className="consent-record">
      <header className="consent-record-header">
        <span className="ss-small-label dark">Signed consent</span>
        <h2 className="h4 mb-1">{record.applicantName || record.nameOrIdCode || "Applicant"}</h2>
        <p className="mb-0 text-muted">
          {record.applicationReference || record.participantCode || "No reference"} · {record.countryOfResidence || "Country not available"} · {formatPathwayLabel(record.pathway, "Pathway not recorded")}
        </p>
      </header>

      <dl className="consent-record-facts">
        <div><dt>Consent version</dt><dd>{record.consentVersion || "Not available"}</dd></div>
        <div><dt>Country of residence</dt><dd>{record.countryOfResidence || "Not available"}</dd></div>
        <div><dt>Contacts shown when signed</dt><dd>{record.contactContextAtSigning === "ALL" ? "All programme countries" : record.contactContextAtSigning || "Not available"}</dd></div>
        <div><dt>Application submitted</dt><dd>{formatDate(record.submittedAt)}</dd></div>
      </dl>

      {record.assistance?.assistantName && (
        <section className="border rounded-4 p-4 my-4">
          <h3 className="h5">{consent?.assistanceStepTitle || "Consent assistance"}</h3>
          <dl className="row mb-3">
            <dt className="col-sm-4">Person providing assistance</dt>
            <dd className="col-sm-8">{record.assistance.assistantName}</dd>
            <dt className="col-sm-4">Relationship to applicant</dt>
            <dd className="col-sm-8">
              {record.assistance.relationship || "Not available"}
              {record.assistance.relationshipOther ? ` — ${record.assistance.relationshipOther}` : ""}
            </dd>
            <dt className="col-sm-4">Type of assistance</dt>
            <dd className="col-sm-8">
              {Array.isArray(record.assistance.assistanceTypes)
                ? record.assistance.assistanceTypes.join(", ")
                : record.assistance.assistanceTypes || "Not available"}
              {record.assistance.assistanceTypeOther ? ` — ${record.assistance.assistanceTypeOther}` : ""}
            </dd>
            <dt className="col-sm-4">Language / communication method</dt>
            <dd className="col-sm-8">{record.assistance.languageOrCommunicationMethod || "Not available"}</dd>
            <dt className="col-sm-4">Date</dt>
            <dd className="col-sm-8">{formatDate(record.assistance.date)}</dd>
          </dl>
          <SignatureDisplay
            method={record.assistance.signatureMethod}
            data={record.assistance.signatureData}
            label="Signature of person providing assistance"
          />
        </section>
      )}

      {record.juratRequired && consent?.juratTitle && (
        <section className="border rounded-4 p-4 my-4">
          <h3 className="h5">{consent.juratTitle}</h3>
          <p>{consent.juratWhen}</p>
          <p className="fw-semibold">{formatJuratClause(consent.juratClause, record.jurat)}</p>
          <dl className="row mb-3">
            <dt className="col-sm-4">Interpreter name</dt><dd className="col-sm-8">{record.jurat?.interpreterName || "Not available"}</dd>
            <dt className="col-sm-4">Interpreter address</dt><dd className="col-sm-8">{record.jurat?.interpreterAddress || "Not available"}</dd>
            <dt className="col-sm-4">Language / dialect</dt><dd className="col-sm-8">{record.jurat?.language || "Not available"}</dd>
            <dt className="col-sm-4">Date</dt><dd className="col-sm-8">{formatDate(record.jurat?.date)}</dd>
          </dl>
          <SignatureDisplay method={record.jurat?.signatureMethod} data={record.jurat?.signatureData} label="Signature of Interpreter" />
        </section>
      )}

      <ConsentText consent={consent} contactsDisplayedAtSigning={record.contactsDisplayedAtSigning} />

      <section className="border-top pt-4 mt-4">
        <h3 className="h5">Your Consent</h3>
        {record.consentDecision ? (
          <p><strong>{consent?.consentQuestion || "Consent decision"}</strong><br />{record.consentDecision}</p>
        ) : (
          <>
            <p>☑ {record.informationRead ? "Yes" : "No"} — I have read and understood this information</p>
            <p>☑ {record.agreedToParticipate ? "Yes" : "No"} — I agree to take part in this questionnaire</p>
          </>
        )}
        <dl className="row">
          <dt className="col-sm-4">Name</dt><dd className="col-sm-8">{record.nameOrIdCode || "Not available"}</dd>
          <dt className="col-sm-4">Date</dt><dd className="col-sm-8">{formatDate(record.signedDate)}</dd>
          {record.completedConsentSelf && (
            <>
              <dt className="col-sm-4">Completed consent section</dt>
              <dd className="col-sm-8">{record.completedConsentSelf}</dd>
            </>
          )}
        </dl>
        <SignatureDisplay method={record.signatureMethod} data={record.signatureData} label="Signature" />
      </section>
    </article>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="consent-filter-field">
      <span>{label}</span>
      <span className="consent-select">
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
        <i className="bi bi-chevron-down" aria-hidden="true" />
      </span>
    </label>
  );
}

function ConsentDialog({ state, onClose, onPrint }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeys(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const dialog = document.querySelector(".consent-dialog");
        const focusable = [...(dialog?.querySelectorAll("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])") || [])];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeys);
    };
  }, [onClose]);

  return (
    <div
      className="consent-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="consent-dialog" role="dialog" aria-modal="true" aria-labelledby="consent-dialog-title">
        <div className="consent-dialog-toolbar">
          <h2 id="consent-dialog-title" className="h5 mb-0">{state.summary.applicantName || state.summary.nameOrIdCode || "Signed consent"}</h2>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn ss-btn-primary" onClick={onPrint} disabled={!state.record}>
              <i className="bi bi-printer" aria-hidden="true" /> Print this consent
            </button>
            <button ref={closeRef} type="button" className="btn ss-btn-outline" onClick={onClose}>
              <i className="bi bi-x-lg" aria-hidden="true" /> Close
            </button>
          </div>
        </div>
        <div className="consent-dialog-body">
          {state.error ? (
            <div className="alert ss-alert-error" role="alert">{state.error}</div>
          ) : !state.record ? (
            <div className="text-center py-5"><div className="spinner-border" role="status" /><p className="mt-3">Loading consent...</p></div>
          ) : (
            <ConsentRecord record={state.record} />
          )}
        </div>
      </div>
    </div>
  );
}

function ConsentRecordsPage({ onBack, onSessionExpired }) {
  const [tab, setTab] = useState(readTabFromHash);
  const [draftSearch, setDraftSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [reloadToken, setReloadToken] = useState(0);
  const [data, setData] = useState({ key: "", records: [], supportRequests: [], pendingSupportRequests: 0, generatedAt: null, countries: COUNTRY_OPTIONS });
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [updatingRequest, setUpdatingRequest] = useState("");
  const [dialog, setDialog] = useState(null);
  const [printRecords, setPrintRecords] = useState([]);
  const [preparingPrint, setPreparingPrint] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const openerRef = useRef(null);

  const queryString = buildQuery(filters);
  const requestKey = `${queryString}|${reloadToken}`;
  const loading = data.key !== requestKey && !error;

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get(`${API_BASE_URL}/api/consents${queryString ? `?${queryString}` : ""}`, { signal: controller.signal })
      .then((response) => {
        setError("");
        setData({
          key: requestKey,
          records: response.data?.records || [],
          supportRequests: response.data?.supportRequests || [],
          pendingSupportRequests: response.data?.pendingSupportRequests || 0,
          generatedAt: response.data?.generatedAt || null,
          countries: response.data?.countries || COUNTRY_OPTIONS,
        });
      })
      .catch((requestError) => {
        if (axios.isCancel(requestError)) return;
        if (requestError.response?.status === 401) {
          onSessionExpired?.();
          return;
        }
        setError(requestError.response?.data?.message || "Unable to load consent records.");
      });

    return () => controller.abort();
  }, [queryString, requestKey, onSessionExpired]);

  useEffect(() => {
    const syncTab = () => setTab(readTabFromHash());
    window.addEventListener("hashchange", syncTab);
    window.addEventListener("popstate", syncTab);
    return () => {
      window.removeEventListener("hashchange", syncTab);
      window.removeEventListener("popstate", syncTab);
    };
  }, []);

  useEffect(() => {
    const reset = () => setPrintRecords([]);
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  // Print once the chosen records are on the page.
  useEffect(() => {
    if (!printRecords.length) return undefined;
    const frame = window.requestAnimationFrame(() => window.print());
    return () => window.cancelAnimationFrame(frame);
  }, [printRecords]);

  const totalPages = Math.max(1, Math.ceil(data.records.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRecords = useMemo(
    () => data.records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [data.records, currentPage]
  );
  const activeFilters = [
    filters.search && `“${filters.search}”`,
    filters.country,
    filters.pathway && formatPathwayLabel(filters.pathway),
    filters.from && `from ${formatShortDate(filters.from)}`,
    filters.to && `to ${formatShortDate(filters.to)}`,
    tab === "signed" && filters.assisted === "yes" && "Assisted",
    tab === "signed" && filters.assisted === "no" && "Not assisted",
    tab === "requests" && filters.requestStatus === "PENDING" && "Waiting for a call",
    tab === "requests" && filters.requestStatus === "CONTACTED" && "Contacted",
  ].filter(Boolean);

  function updateFilter(field, value) {
    setError("");
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }

  function clearFilters() {
    setError("");
    setDraftSearch("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function refresh() {
    setError("");
    setReloadToken((current) => current + 1);
  }

  function switchTab(id) {
    setTab(id);
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
  }

  async function openRecord(summary, opener) {
    openerRef.current = opener;
    setDialog({ summary, record: null, error: "" });
    try {
      const response = await axios.get(`${API_BASE_URL}/api/consents/records/${encodeURIComponent(summary.applicantId)}`);
      setDialog((current) => (current?.summary.applicantId === summary.applicantId ? { ...current, record: response.data?.record } : current));
    } catch (requestError) {
      if (requestError.response?.status === 401) onSessionExpired?.();
      setDialog((current) => (current ? { ...current, error: requestError.response?.data?.message || "Unable to load this consent." } : current));
    }
  }

  function closeDialog() {
    setDialog(null);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  }

  async function printFiltered() {
    setPreparingPrint(true);
    setError("");
    try {
      const response = await axios.get(`${API_BASE_URL}/api/consents?${buildQuery(filters, { view: "full" })}`);
      setPrintRecords(response.data?.records || []);
    } catch (requestError) {
      if (requestError.response?.status === 401) onSessionExpired?.();
      setError(requestError.response?.data?.message || "Unable to prepare the consents for printing.");
    } finally {
      setPreparingPrint(false);
    }
  }

  async function markContacted(id) {
    setUpdatingRequest(id);
    setError("");
    try {
      await axios.patch(`${API_BASE_URL}/api/consents/support-requests/${id}/contacted`);
      refresh();
    } catch (requestError) {
      if (requestError.response?.status === 401) onSessionExpired?.();
      setError(requestError.response?.data?.message || "Unable to mark the request as contacted.");
    } finally {
      setUpdatingRequest("");
    }
  }

  return (
    <main id="main-content" className="consent-page">
      <div className="consent-shell">
        <header className="consent-header">
          <div>
            <button type="button" className="btn ss-btn-outline mb-3" onClick={onBack}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> Back to staff workspace
            </button>
            <span className="ss-small-label dark d-block">Super Admin</span>
            <h1>Consent records</h1>
            <p className="mb-0">Find and print signed consents, and follow up with people who asked for the consent to be explained.</p>
          </div>
          <button type="button" className="btn ss-btn-outline" onClick={refresh} disabled={loading}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" /> {loading ? "Loading..." : "Refresh"}
          </button>
        </header>

        <div className="consent-tabs" role="tablist" aria-label="Consent records">
          <button
            type="button"
            role="tab"
            id="consent-tab-signed"
            aria-selected={tab === "signed"}
            aria-controls="consent-panel"
            className={tab === "signed" ? "active" : ""}
            onClick={() => switchTab("signed")}
          >
            <i className="bi bi-pen" aria-hidden="true" />
            <span>
              <strong>Signed consents</strong>
              <small>{data.records.length} {data.records.length === 1 ? "record" : "records"}</small>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="consent-tab-requests"
            aria-selected={tab === "requests"}
            aria-controls="consent-panel"
            className={tab === "requests" ? "active" : ""}
            onClick={() => switchTab("requests")}
          >
            <i className="bi bi-telephone" aria-hidden="true" />
            <span>
              <strong>Explanation requests</strong>
              <small>
                {data.pendingSupportRequests
                  ? `${data.pendingSupportRequests} waiting for a call`
                  : `${data.supportRequests.length} ${data.supportRequests.length === 1 ? "request" : "requests"}`}
              </small>
            </span>
            {data.pendingSupportRequests > 0 && <span className="consent-tab-badge">{data.pendingSupportRequests}</span>}
          </button>
        </div>

        <button
          type="button"
          className="consent-filter-toggle"
          aria-expanded={showFilters}
          aria-controls="consent-filters"
          onClick={() => setShowFilters((current) => !current)}
        >
          <i className="bi bi-funnel" aria-hidden="true" /> Filters
          {activeFilters.length > 0 && <span className="consent-tab-badge">{activeFilters.length}</span>}
          <i className={`bi ${showFilters ? "bi-chevron-up" : "bi-chevron-down"}`} aria-hidden="true" />
        </button>

        <form
          id="consent-filters"
          className={`consent-filters ${showFilters ? "open" : ""}`}
          aria-label="Filter consent records"
          onSubmit={(event) => {
            event.preventDefault();
            updateFilter("search", draftSearch.trim());
          }}
        >
          <label className="consent-filter-field consent-filter-search">
            <span>Search</span>
            <span className="consent-search-input">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder={tab === "signed" ? "Name, reference or participant ID" : "Name or phone number"}
              />
            </span>
          </label>
          <SelectField label="Country" value={filters.country} onChange={(value) => updateFilter("country", value)}>
            <option value="">All countries</option>
            {data.countries.map((country) => <option key={country} value={country}>{country}</option>)}
          </SelectField>
          <SelectField label="Pathway" value={filters.pathway} onChange={(value) => updateFilter("pathway", value)}>
            <option value="">All pathways</option>
            {PATHWAY_OPTIONS.map((pathway) => <option key={pathway} value={pathway}>{formatPathwayLabel(pathway)}</option>)}
          </SelectField>
          <label className="consent-filter-field">
            <span>From</span>
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => updateFilter("from", event.target.value)} />
          </label>
          <label className="consent-filter-field">
            <span>To</span>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => updateFilter("to", event.target.value)} />
          </label>
          {tab === "signed" ? (
            <SelectField label="Assistance" value={filters.assisted} onChange={(value) => updateFilter("assisted", value)}>
              <option value="">Anyone</option>
              <option value="yes">Signed with assistance</option>
              <option value="no">Signed without assistance</option>
            </SelectField>
          ) : (
            <SelectField label="Follow-up" value={filters.requestStatus} onChange={(value) => updateFilter("requestStatus", value)}>
              <option value="">Any status</option>
              <option value="PENDING">Waiting for a call</option>
              <option value="CONTACTED">Contacted</option>
            </SelectField>
          )}
          <div className="consent-filter-actions">
            <button type="submit" className="btn ss-btn-primary">
              <i className="bi bi-search" aria-hidden="true" /> Search
            </button>
          </div>
        </form>

        <div className="consent-results-bar" aria-live="polite">
          <p className="mb-0">
            {loading ? "Loading..." : tab === "signed"
              ? `${data.records.length} signed ${data.records.length === 1 ? "consent" : "consents"}`
              : `${data.supportRequests.length} explanation ${data.supportRequests.length === 1 ? "request" : "requests"}`}
            {activeFilters.length > 0 && <> · {activeFilters.join(" · ")}</>}
          </p>
          <div className="d-flex flex-wrap gap-2">
            {activeFilters.length > 0 && (
              <button type="button" className="consent-link-button" onClick={clearFilters}>
                <i className="bi bi-x-circle" aria-hidden="true" /> Clear filters
              </button>
            )}
            {tab === "signed" && (
              <button type="button" className="btn ss-btn-outline" onClick={printFiltered} disabled={!data.records.length || preparingPrint || loading}>
                <i className="bi bi-printer" aria-hidden="true" />
                {preparingPrint ? " Preparing..." : activeFilters.length ? ` Print these ${data.records.length}` : " Print all"}
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert ss-alert-error" role="alert">{error}</div>}

        <section id="consent-panel" role="tabpanel" aria-labelledby={`consent-tab-${tab}`} className="consent-panel">
          {tab === "signed" ? (
            !loading && data.records.length === 0 ? (
              <div className="consent-empty">
                <i className="bi bi-file-earmark-check" aria-hidden="true" />
                <h2>{activeFilters.length ? "No consents match these filters" : "No signed consents yet"}</h2>
                <p>{activeFilters.length ? "Try a different country, pathway or date range." : "Consent records appear here after applicants submit an application."}</p>
              </div>
            ) : (
              <>
                <div className="consent-table-wrap">
                  <table className="consent-table">
                    <caption className="visually-hidden">Signed consents</caption>
                    <thead>
                      <tr>
                        <th scope="col">Applicant</th>
                        <th scope="col">Country</th>
                        <th scope="col">Pathway</th>
                        <th scope="col">Signed</th>
                        <th scope="col">Consent</th>
                        <th scope="col"><span className="visually-hidden">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRecords.map((record) => (
                        <tr key={record.applicantId}>
                          <td data-label="Applicant">
                            <strong>{record.applicantName || record.nameOrIdCode || "Applicant"}</strong>
                            <small>{record.applicationReference || record.participantCode || "No reference"}</small>
                          </td>
                          <td data-label="Country">{record.countryOfResidence || "—"}</td>
                          <td data-label="Pathway">{formatPathwayLabel(record.pathway, "—")}</td>
                          <td data-label="Signed">{formatShortDate(record.signedDate || record.submittedAt)}</td>
                          <td data-label="Consent">
                            <span className="consent-pills">
                              <span className={`consent-pill ${record.agreedToParticipate ? "agreed" : "declined"}`}>
                                {record.agreedToParticipate ? "Agreed" : "Not agreed"}
                              </span>
                              {record.assisted && <span className="consent-pill assisted">Assisted</span>}
                              <span className="consent-pill version" title={record.consentVersion || undefined}>
                                {shortVersion(record.consentVersion)}
                              </span>
                            </span>
                          </td>
                          <td className="consent-row-action">
                            <button type="button" className="btn ss-btn-outline btn-sm" onClick={(event) => openRecord(record, event.currentTarget)}>
                              View<span className="visually-hidden"> consent for {record.applicantName || record.applicationReference}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <nav className="consent-pagination" aria-label="Signed consent pages">
                    <button type="button" className="btn ss-btn-outline btn-sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                      <i className="bi bi-chevron-left" aria-hidden="true" /> Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button type="button" className="btn ss-btn-outline btn-sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                      Next <i className="bi bi-chevron-right" aria-hidden="true" />
                    </button>
                  </nav>
                )}
              </>
            )
          ) : (
            <>
              <p className="consent-panel-intro">
                Contact these people before they decide whether to consent. Mark a request as contacted only after speaking with the person. Requests are separate from signed consent.
              </p>
              {!loading && data.supportRequests.length === 0 ? (
                <div className="consent-empty">
                  <i className="bi bi-telephone-x" aria-hidden="true" />
                  <h2>{activeFilters.length ? "No requests match these filters" : "No explanation requests yet"}</h2>
                  <p>People who ask for the consent to be explained by phone will appear here.</p>
                </div>
              ) : (
                <ul className="consent-request-list">
                  {data.supportRequests.map((request) => (
                    <li key={request.id} className={`consent-request ${request.status === "CONTACTED" ? "done" : "pending"}`}>
                      <div className="consent-request-main">
                        <h3>{request.fullName}</h3>
                        <p>
                          <a href={`tel:${request.contactNumber}`}>{request.contactNumber}</a> · {request.country} · {formatPathwayLabel(request.pathway, "Pathway not recorded")}
                        </p>
                        <p className="consent-request-meta">
                          Requested {formatShortDate(request.createdAt)} ·{" "}
                          {request.notificationStatus === "SENT"
                            ? "Team email accepted by SMTP"
                            : request.notificationStatus === "FAILED"
                              ? "Team email failed, follow up manually"
                              : "Team email not confirmed"}
                        </p>
                        {request.accommodation && (
                          <p className="consent-request-note"><strong>Accommodation:</strong> {request.accommodation}</p>
                        )}
                      </div>
                      <div className="consent-request-action">
                        {request.status === "CONTACTED" ? (
                          <span className="consent-pill agreed">
                            <i className="bi bi-check2" aria-hidden="true" /> Contacted {formatShortDate(request.contactedAt)}
                          </span>
                        ) : (
                          <>
                            <span className="consent-pill waiting">Waiting for a call</span>
                            <button type="button" className="btn ss-btn-primary btn-sm" disabled={Boolean(updatingRequest)} onClick={() => markContacted(request.id)}>
                              {updatingRequest === request.id ? "Saving…" : "Mark contacted"}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {data.generatedAt && <p className="consent-generated">Loaded {formatDate(data.generatedAt)}</p>}
      </div>

      {dialog && (
        <ConsentDialog
          state={dialog}
          onClose={closeDialog}
          onPrint={() => dialog.record && setPrintRecords([dialog.record])}
        />
      )}

      <div className="consent-print-area" aria-hidden="true">
        {printRecords.map((record) => <ConsentRecord key={record.applicantId} record={record} />)}
      </div>
    </main>
  );
}

export default ConsentRecordsPage;
