import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { formatPathwayLabel, formatStatusLabel } from "../utils/displayLabels";
import { findSubmittedApplication } from "../utils/applicationStatusStorage";

const STATUS_STEPS = [
  {
    key: "incomplete",
    labels: ["incomplete"],
    title: "Application incomplete",
    description: "Your application has been saved but has not yet been submitted.",
  },
  {
    key: "submitted",
    labels: ["submitted"],
    title: "Application submitted",
    description: "Your registration has been received.",
  },
  {
    key: "screening",
    labels: ["pending review", "ineligible"],
    title: "Application review",
    description: "Your application information is being reviewed.",
  },
  {
    key: "skills",
    labels: ["eligible pending skills test", "eligible pending basic skills test"],
    title: "Basic IT skills test",
    description: "Eligible applicants complete the short Basic IT skills test.",
  },
  {
    key: "review",
    labels: ["skills test completed pending review", "under review", "review", "synced to dhis2 pending review"],
    title: "Committee review",
    description: "The project team reviews registration details, documents, and test results.",
  },
  {
    key: "decision",
    labels: ["approved", "rejected", "approved for enrollment", "rejected by review committee"],
    title: "Decision made",
    description: "A decision is recorded and the applicant is informed through the agreed communication channel.",
  },
  {
    key: "dhis2",
    labels: ["synced to dhis2", "enrolled", "enrolled in dhis2", "enrolled in dhis2 program"],
    title: "Programme enrollment",
    description: "Approved applicants are enrolled into the selected pathway.",
  },
];

function normalizeStatus(value) {
  return String(value || "Submitted").trim().toLowerCase().replace(/_/g, " ");
}

function getActiveStepIndex(status) {
  const normalizedStatus = normalizeStatus(status);

  const exactIndex = STATUS_STEPS.findIndex((step) =>
    step.labels.some((label) => normalizedStatus === label)
  );

  if (exactIndex >= 0) return exactIndex;
  if (normalizedStatus.includes("enrolled")) return 6;
  if (normalizedStatus.includes("approved") || normalizedStatus.includes("rejected")) return 5;
  if (normalizedStatus.includes("completed") || normalizedStatus.includes("committee") || normalizedStatus.includes("dhis2")) return 4;
  if (normalizedStatus.includes("skills")) return 3;
  if (normalizedStatus.includes("eligible") || normalizedStatus.includes("review") || normalizedStatus.includes("ineligible")) return 2;
  if (normalizedStatus.includes("submitted")) return 1;
  return 0;
}

function formatDate(value) {
  if (!value) return "Not available";

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Not available";
  }
}

function getReferenceFromResult(result) {
  return (
    result?.applicationReference ||
    result?.draftReference ||
    result?.referenceNumber ||
    result?.registrationReference ||
    result?.registrationId ||
    result?.id ||
    ""
  );
}

function getScreeningLabel(result) {
  if (result?.status === "INCOMPLETE") return "Incomplete";
  if (result?.screeningStatus === "ELIGIBLE" || result?.isEligible === true) return "Eligible";
  if (result?.screeningStatus === "NOT_ELIGIBLE" || result?.status === "INELIGIBLE") return "Not eligible";
  return "Pending review";
}

function StatusTimeline({ status }) {
  const activeStepIndex = getActiveStepIndex(status);

  return (
    <div className="ss-status-timeline" aria-label="Application status progress">
      {STATUS_STEPS.map((step, index) => {
        const isComplete = index < activeStepIndex;
        const isActive = index === activeStepIndex;

        return (
          <div
            key={step.key}
            className={`ss-status-step ${isComplete ? "complete" : ""} ${isActive ? "active" : ""}`}
          >
            <span aria-hidden="true">
              {isComplete ? <i className="bi bi-check2" /> : index + 1}
            </span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusResultCard({ result }) {
  const reference = getReferenceFromResult(result);
  const status = result?.status || "Submitted";
  const statusLabel = formatStatusLabel(status);

  return (
    <article className="ss-status-result-card" aria-labelledby="status-result-title">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
        <div>
          <span className="ss-small-label dark">Application found</span>
          <h2 id="status-result-title">Current application status</h2>
          <p className="mb-0">
            The information below shows the latest status for this application.
          </p>
        </div>
        <div className="ss-status-badge" aria-label={`Current status is ${statusLabel}`}>
          {statusLabel}
        </div>
      </div>

      <div className="ss-status-summary-grid" role="list">
        <div role="listitem">
          <span>Application reference</span>
          <strong>{result?.status === "INCOMPLETE" ? "Not submitted yet" : reference || "Not available"}</strong>
        </div>
        <div role="listitem">
          <span>Application review</span>
          <strong>{getScreeningLabel(result)}</strong>
        </div>
        <div role="listitem">
          <span>Pathway</span>
          <strong>{formatPathwayLabel(result?.pathwayTitle || result?.pathway, "Physical Academy")}</strong>
        </div>
        <div role="listitem">
          <span>{result?.status === "INCOMPLETE" ? "Last saved" : "Submitted"}</span>
          <strong>{formatDate(result?.submittedAt || result?.savedAt || result?.lastSavedAt)}</strong>
        </div>
      </div>

      {result?.nextStepMessage && (
        <div className="ss-status-note" role="note">
          <i className="bi bi-signpost-2" aria-hidden="true" />
          <p>{result.nextStepMessage}</p>
        </div>
      )}

      {result?.eligibilityReason && (
        <div className="ss-status-note" role="note">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <p>{result.eligibilityReason}</p>
        </div>
      )}

      {result?.skillsTest?.submitted && (
        <div className="ss-status-note" role="note">
          <i className="bi bi-journal-check" aria-hidden="true" />
          <p>
            Basic IT skills test submitted. Score: {result.skillsTest.score}/{result.skillsTest.maxScore} ({result.skillsTest.percentage}%).
          </p>
        </div>
      )}

      {result?.requiresBasicSkillsTest && (
        <div className="ss-status-note" role="note">
          <i className="bi bi-envelope-check" aria-hidden="true" />
          <div>
            <p className="mb-2">You are eligible. Please complete the Basic IT skills test using your invitation link.</p>
            {result?.testInvitation?.expiresAt && (
              <p className="mb-0">Invitation expiry: {formatDate(result.testInvitation.expiresAt)}.</p>
            )}
          </div>
        </div>
      )}

      <StatusTimeline status={status} />
    </article>
  );
}

function StatusCheckPage({ onBackHome, onStartApplication, onResumeApplication }) {
  const [identifier, setIdentifier] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupMessage, setLookupMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumeDateOfBirth, setResumeDateOfBirth] = useState("");
  const [resumeEmail, setResumeEmail] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanIdentifier = identifier.trim();
    setLookupResult(null);
    setLookupMessage("");
    setResumeMessage("");
    setResumeDateOfBirth("");
    setResumeEmail("");

    if (!cleanIdentifier) {
      setLookupMessage("Please enter your application reference number or mobile number.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        `${API_BASE_URL}/api/registrations/status/${encodeURIComponent(cleanIdentifier)}`
      );

      const apiResult = response.data?.data || response.data?.application || response.data?.registration || response.data;
      if (apiResult && (getReferenceFromResult(apiResult) || apiResult.status === "INCOMPLETE")) {
        setLookupResult(apiResult);
        return;
      }

      throw new Error("No official status returned");
    } catch {
      const localResult = findSubmittedApplication(cleanIdentifier);

      if (localResult) {
        setLookupResult(localResult);
        setLookupMessage(
          "Showing the confirmation saved on this device. Please try again later for the latest online status."
        );
      } else {
        setLookupMessage(
          "We could not find an application using that reference or mobile number. Check the details and use the same mobile number entered during registration."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResumeDraft(event) {
    event.preventDefault();

    if (!lookupResult?.draftReference) {
      setResumeMessage("No incomplete application is selected.");
      return;
    }

    if (!resumeDateOfBirth && !resumeEmail.trim()) {
      setResumeMessage("Enter the date of birth or email address used in the saved form to continue.");
      return;
    }

    try {
      setResumeLoading(true);
      setResumeMessage("");

      const response = await axios.post(`${API_BASE_URL}/api/registrations/drafts/resume`, {
        draftReference: lookupResult.draftReference,
        contactNumber: identifier.trim(),
        dateOfBirth: resumeDateOfBirth || undefined,
        email: resumeEmail.trim() || undefined,
      });

      const draft = response.data?.data;

      if (!draft?.answers) {
        throw new Error("The saved application could not be opened.");
      }

      onResumeApplication?.(draft);
    } catch (error) {
      console.error(error);
      setResumeMessage(
        error.response?.data?.message ||
          error.message ||
          "We could not open the incomplete application. Check the details and try again."
      );
    } finally {
      setResumeLoading(false);
    }
  }

  return (
    <main id="main-content" tabIndex="-1" className="ss-status-page">
      <section className="ss-status-hero" aria-labelledby="status-page-title">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-8">
              <button type="button" className="btn ss-btn-outline mb-4" onClick={onBackHome}>
                <i className="bi bi-arrow-left" aria-hidden="true" /> Back to home
              </button>
              <span className="ss-small-label light">Application tracking</span>
              <h1 id="status-page-title">Check your registration status</h1>
              <p>
                Enter your application reference or the mobile number used during registration to see the latest status available.
              </p>
            </div>
            <div className="col-12 col-lg-4">
              <div className="ss-selected-card">
                <span>Applicant support</span>
                <strong>Use your reference or mobile number</strong>
                <small>Example: SS-PHYS-20260525-ABCDE or +254712345678</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="row g-4 align-items-start">
          <div className="col-12 col-xl-8">
            <section className="ss-status-lookup-card" aria-labelledby="lookup-title">
              <span className="ss-small-label dark">Find application</span>
              <h2 id="lookup-title">Find your application</h2>
              <p>
                Use the application reference shown after submission or the same mobile number entered in the application form.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <label className="form-label" htmlFor="application-reference">
                  Application reference or mobile number
                </label>
                <div className="ss-status-search-row">
                  <input
                    id="application-reference"
                    className="form-control"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Reference or mobile number"
                    autoComplete="tel"
                  />
                  <button type="submit" className="btn ss-btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Checking...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-search" aria-hidden="true" /> Check status
                      </>
                    )}
                  </button>
                </div>
              </form>

              {lookupMessage && (
                <div className="alert ss-alert-info mt-4" role="status" aria-live="polite">
                  <i className="bi bi-info-circle" aria-hidden="true" /> {lookupMessage}
                </div>
              )}

              {lookupResult && (
                <div className="mt-4">
                  <StatusResultCard result={lookupResult} />

                  {lookupResult?.status === "INCOMPLETE" && lookupResult?.allowResume && (
                    <form className="ss-status-note mt-4" onSubmit={handleResumeDraft}>
                      <i className="bi bi-pencil-square" aria-hidden="true" />
                      <div className="w-100">
                        <h3 className="h5">Continue incomplete application</h3>
                        <p>For privacy, confirm your date of birth or email address before continuing.</p>
                        <div className="row g-3">
                          <div className="col-12 col-md-6">
                            <label className="form-label" htmlFor="resume-date-of-birth">Date of birth</label>
                            <input
                              id="resume-date-of-birth"
                              className="form-control"
                              type="date"
                              value={resumeDateOfBirth}
                              onChange={(event) => setResumeDateOfBirth(event.target.value)}
                            />
                          </div>
                          <div className="col-12 col-md-6">
                            <label className="form-label" htmlFor="resume-email">Email address</label>
                            <input
                              id="resume-email"
                              className="form-control"
                              type="email"
                              value={resumeEmail}
                              onChange={(event) => setResumeEmail(event.target.value)}
                              placeholder="name@example.org"
                            />
                          </div>
                        </div>
                        {resumeMessage && (
                          <div className="alert ss-alert-info mt-3" role="status">
                            <i className="bi bi-info-circle" aria-hidden="true" /> {resumeMessage}
                          </div>
                        )}
                        <button type="submit" className="btn ss-btn-primary mt-3" disabled={resumeLoading}>
                          {resumeLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Opening...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-box-arrow-in-right" aria-hidden="true" /> Continue application
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="col-12 col-xl-4">
            <div className="ss-sticky-panel">
              <div className="ss-help-card">
                <span className="ss-small-label dark">What your status means</span>
                <ul className="ss-status-help-list">
                  <li><strong>Submitted:</strong> your application was received.</li>
                  <li><strong>Incomplete:</strong> your form has been saved but not yet submitted.</li>
                  <li><strong>Pending review:</strong> your application is being checked.</li>
                  <li><strong>Eligible pending skills test:</strong> complete the Basic IT skills test.</li>
                  <li><strong>Under review:</strong> your application and test result are being reviewed.</li>
                  <li><strong>Approved:</strong> the applicant can move to enrollment.</li>
                </ul>
              </div>

              <div className="ss-help-card mt-4">
                <span className="ss-small-label dark">No reference yet?</span>
                <p>
                  Start one application and keep the confirmation reference after submission. You can also use the same mobile number entered in the form to check the application status.
                </p>
                <button type="button" className="btn ss-btn-outline w-100" onClick={onStartApplication}>
                  Start application
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default StatusCheckPage;
