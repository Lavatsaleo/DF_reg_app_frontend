import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import MissingLinkHelp, { SupportContact } from "../components/MissingLinkHelp";
import { formatPathwayLabel, formatStatusLabel } from "../utils/displayLabels";
import {
  findSubmittedApplication,
  listSubmittedApplications,
} from "../utils/applicationStatusStorage";

const STATUS_STEPS = [
  {
    key: "submitted",
    labels: ["submitted"],
    title: "Application submitted",
    description: "Your registration has been received and a participant identifier has been assigned.",
  },
  {
    key: "screening",
    labels: ["pending review", "ineligible"],
    title: "Application review",
    description: "The application information is reviewed and may be flagged for manual review.",
  },
  {
    key: "skills",
    labels: ["eligible pending skills test", "eligible pending basic skills test"],
    title: "Basic IT skills test",
    description: "Eligible applicants complete the short skills test using the secure email invitation link.",
  },
  {
    key: "review",
    labels: ["skills test completed pending review", "under review", "review", "synced to dhis2 pending review"],
    title: "Committee review",
    description: "The committee reviews registration details, documents, and test results.",
  },
  {
    key: "decision",
    labels: ["approved", "rejected", "approved for enrollment", "rejected by review committee"],
    title: "Decision made",
    description: "A decision is recorded and the applicant is informed through the agreed communication channel.",
  },
  {
    key: "participant-registration",
    labels: [
      "participant registration pending",
      "participant registration completed pending verification",
    ],
    title: "Participant registration",
    description: "Selected Physical and Virtual Academy participants complete the secure Participant Registration & Baseline Survey sent by email.",
  },
  {
    key: "dhis2",
    labels: ["synced to dhis2", "enrolled", "enrolled in dhis2", "enrolled in dhis2 program"],
    title: "Programme enrollment",
    description: "Verified participants are enrolled into the correct pathway/programme workflow.",
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
  if (normalizedStatus.includes("participant registration")) return 5;
  if (normalizedStatus.includes("approved") || normalizedStatus.includes("rejected")) return 4;
  if (normalizedStatus.includes("completed") || normalizedStatus.includes("committee") || normalizedStatus.includes("dhis2")) return 3;
  if (normalizedStatus.includes("skills")) return 2;
  if (normalizedStatus.includes("eligible") || normalizedStatus.includes("review") || normalizedStatus.includes("ineligible")) return 1;
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

// Tell the applicant what actually happened to their test email instead of always saying it was sent.
function SkillsTestInvitationNote({ invitation, reference, supportEmail }) {
  const expired = Boolean(invitation?.expired) || invitation?.status === "EXPIRED";
  const sent = ["SENT", "OPENED"].includes(invitation?.status);
  const contactTeam = "You can ask for a new link below.";

  let icon = "bi-envelope-check";
  let message;

  if (!invitation) {
    icon = "bi-envelope-exclamation";
    message = `You are eligible, but your Basic IT skills test link has not been created yet. ${contactTeam}`;
  } else if (expired) {
    icon = "bi-envelope-exclamation";
    message = `Your Basic IT skills test link expired on ${formatDate(invitation.expiresAt)}. ${contactTeam}`;
  } else if (!sent) {
    icon = "bi-envelope-exclamation";
    message = `You are eligible, but we could not send the Basic IT skills test link to your email address. ${contactTeam}`;
  } else {
    const recipient = invitation.emailTo ? ` to ${invitation.emailTo}` : " to your email address";
    const when = invitation.sentAt ? ` on ${formatDate(invitation.sentAt)}` : "";
    message = `You are eligible. We sent the secure Basic IT skills test link${recipient}${when}. If you cannot find it, check your spam or junk folder.`;
  }

  return (
    <div className="ss-status-note" role="note">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <div>
        <p className="mb-2">{message}</p>
        {sent && !expired && invitation.expiresAt && (
          <p className="mb-0">Link expires: {formatDate(invitation.expiresAt)}.</p>
        )}
        <MissingLinkHelp reference={reference} supportEmail={supportEmail} />
      </div>
    </div>
  );
}

function getReferenceFromResult(result) {
  return (
    result?.applicationReference ||
    result?.referenceNumber ||
    result?.registrationReference ||
    result?.registrationId ||
    result?.id ||
    ""
  );
}

function getScreeningLabel(result) {
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
  const headingRef = useRef(null);

  // A found application replaces the form result area; move focus so screen readers announce it.
  useEffect(() => {
    headingRef.current?.focus();
  }, [result]);
  const status = result?.status || "Submitted";
  const statusLabel = formatStatusLabel(status);

  return (
    <article className="ss-status-result-card" aria-labelledby="status-result-title">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
        <div>
          <span className="ss-small-label dark">Application found</span>
          <h2 id="status-result-title" tabIndex="-1" ref={headingRef}>Current application status</h2>
          <p className="mb-0">
            The information below shows the latest status available to this portal.
          </p>
        </div>
        <div className="ss-status-badge" aria-label={`Current status is ${statusLabel}`}>
          {statusLabel}
        </div>
      </div>

      <div className="ss-status-summary-grid" role="list">
        <div role="listitem">
          <span>Application reference</span>
          <strong>{reference || "Not available"}</strong>
        </div>
        <div role="listitem">
          <span>Unique participant ID</span>
          <strong>{result?.participantCode || "Not available"}</strong>
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
          <span>Submitted</span>
          <strong>{formatDate(result?.submittedAt || result?.savedAt)}</strong>
        </div>
      </div>

      {result?.nextStepMessage && (
        <div className="ss-status-note" role="note">
          <i className="bi bi-signpost-2" aria-hidden="true" />
          <p>{result.nextStepMessage}</p>
        </div>
      )}

      {result?.eligibilityReason && result?.screeningStatus !== "ELIGIBLE" && (
        <div className="ss-status-note" role="note">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <p>{result.eligibilityReason}</p>
        </div>
      )}

      {result?.skillsTest?.submitted && (
        <div className="ss-status-note" role="note">
          <i className="bi bi-journal-check" aria-hidden="true" />
          <p>
            Basic IT skills test submitted.
            {result.skillsTest.score !== undefined &&
              ` Score: ${result.skillsTest.score}/${result.skillsTest.maxScore} (${result.skillsTest.percentage}%).`}
          </p>
        </div>
      )}

      {result?.requiresBasicSkillsTest && (
        <SkillsTestInvitationNote
          invitation={result?.testInvitation}
          reference={reference}
          supportEmail={result?.supportEmail}
        />
      )}

      {status === "PARTICIPANT_REGISTRATION_PENDING" && (
        <div className="ss-status-note" role="note">
          <i className="bi bi-envelope-check" aria-hidden="true" />
          <div>
            <p className="mb-2">
              You have been selected. Please check the email address used in your application for the secure Participant Registration &amp; Baseline Survey link. Also check your spam or junk folder.
            </p>
            {result?.participantRegistrationInvitation?.expiresAt && (
              <p className="mb-2">
                Registration invitation expires: {formatDate(result.participantRegistrationInvitation.expiresAt)}.
              </p>
            )}
            <p className="mb-0">
              Haven&apos;t received it? <SupportContact supportEmail={result?.supportEmail} /> and include your application reference, and the team will send it again.
            </p>
          </div>
        </div>
      )}

      {status === "PARTICIPANT_REGISTRATION_COMPLETED_PENDING_VERIFICATION" && (
        <div className="ss-status-note" role="note">
          <i className="bi bi-clipboard2-check" aria-hidden="true" />
          <p>
            Your Participant Registration &amp; Baseline Survey has been submitted. The programme team will now verify your details and supporting documents.
          </p>
        </div>
      )}

      <StatusTimeline status={status} />
    </article>
  );
}

function SavedDraftCard({ draft, onResumeDraft }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [draft]);

  return (
    <article className="ss-status-result-card" aria-labelledby="draft-result-title">
      <span className="ss-small-label dark">Saved application found</span>
      <h2 id="draft-result-title" tabIndex="-1" ref={headingRef}>Your application is not finished yet</h2>
      <div className="ss-status-summary-grid" role="list">
        <div role="listitem">
          <span>Pathway</span>
          <strong>{formatPathwayLabel(draft.pathway)}</strong>
        </div>
        <div role="listitem">
          <span>Completed</span>
          <strong>{draft.completionPercent || 0}%</strong>
        </div>
        <div role="listitem">
          <span>Last saved</span>
          <strong>{formatDate(draft.lastSavedAt)}</strong>
        </div>
      </div>
      <div className="ss-status-note" role="note">
        <i className="bi bi-signpost-2" aria-hidden="true" />
        <p>Continue from where you stopped. Your application is only sent when you submit it at the end.</p>
      </div>
      <button type="button" className="btn ss-btn-primary mt-3" onClick={() => onResumeDraft(draft)}>
        Continue your application <i className="bi bi-arrow-right" aria-hidden="true" />
      </button>
    </article>
  );
}

const RESEND_WAIT_SECONDS = 60;

const PAGE_TEXT = {
  status: {
    label: "Application tracking",
    title: "Check your application status",
    intro: "Enter your application reference, mobile number or email address. We will email you a code to confirm it is you. You can also use this page to continue an application you did not finish.",
    cardTitle: "Use your reference, mobile number or email",
    lookupLabel: "Find application",
    lookupTitle: "Find your application",
    lookupIntro: "Use the application reference shown after submission, or the mobile number or email address you entered in the application form. We send a 6-digit code to the email address in your application.",
    fieldLabel: "Application reference, mobile number or email address",
    placeholder: "Reference, mobile number or email",
  },
  continue: {
    label: "Saved application",
    title: "Continue my application",
    intro: "Enter the mobile number or email address you used in your application. We will email you a 6-digit code, and then you can continue from where you stopped.",
    cardTitle: "Use your mobile number or email",
    lookupLabel: "Find saved application",
    lookupTitle: "Find your saved application",
    lookupIntro: "Use the mobile number or email address you entered on the personal details page. We send the code to the email address in your application.",
    fieldLabel: "Mobile number or email address",
    placeholder: "Mobile number or email",
  },
};

function StatusCheckPage({ onBackHome, onStartApplication, onResumeDraft, mode = "status" }) {
  const text = PAGE_TEXT[mode] || PAGE_TEXT.status;
  const isContinue = mode === "continue";
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  // "details" -> "code" -> result shown
  const [stage, setStage] = useState("details");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupMessage, setLookupMessage] = useState("");
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef(null);

  const recentApplications = useMemo(() => listSubmittedApplications().slice(0, 3), []);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (stage === "code") codeInputRef.current?.focus();
  }, [stage]);

  async function requestCode() {
    const cleanIdentifier = identifier.trim();
    setLookupResult(null);
    setLookupMessage("");
    setCodeError("");

    if (!cleanIdentifier) {
      setLookupMessage("Enter your application reference, mobile number or email address.");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/registrations/status/request-code`, {
        identifier: cleanIdentifier,
      });
      setLookupMessage(response.data?.message || "If we found an application, we have sent a code to its email address.");
      setCode("");
      setStage("code");
      setResendIn(RESEND_WAIT_SECONDS);
    } catch (error) {
      if (error.response) {
        setLookupMessage(error.response.data?.message || "We could not send a code. Please try again.");
        return;
      }
      const localResult = findSubmittedApplication(cleanIdentifier);
      if (localResult) {
        setLookupResult(localResult);
        setLookupMessage(
          "Showing the confirmation saved on this device because the official status lookup could not be reached."
        );
      } else {
        setLookupMessage("We could not reach the portal. Check your internet connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    requestCode();
  }

  async function handleVerify(event) {
    event.preventDefault();
    setCodeError("");
    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setCodeError("Enter the 6-digit code from the email.");
      codeInputRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/registrations/status/verify`, {
        identifier: identifier.trim(),
        code: cleanCode,
      });
      const result = response.data?.data || null;
      if (isContinue && result?.kind === "DRAFT") {
        onResumeDraft(result);
        return;
      }
      setLookupResult(result);
      setLookupMessage(
        isContinue && result?.kind === "APPLICATION"
          ? "This application has already been submitted, so it cannot be changed. Its current status is shown below."
          : ""
      );
      setStage("result");
    } catch (error) {
      setCodeError(error.response?.data?.message || "We could not check the code. Please try again.");
      codeInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleStartAgain() {
    setStage("details");
    setCode("");
    setCodeError("");
    setLookupMessage("");
    setLookupResult(null);
  }

  function handleRecentClick(application) {
    const recentReference = getReferenceFromResult(application);
    setIdentifier(recentReference);
    setStage("details");
    setLookupResult(application);
    setLookupMessage("Showing a recently submitted application saved on this device. Check status to see the latest progress.");
  }

  return (
    <main id="main-content" tabIndex="-1" className="ss-status-page">
      <section className="ss-status-hero" aria-labelledby="status-page-title">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-8">
              <a
                href="/"
                className="df-back-link d-flex align-items-center gap-2 mb-4"
                onClick={(event) => {
                  event.preventDefault();
                  onBackHome();
                }}
              >
                <i className="bi bi-arrow-left" aria-hidden="true" /> Back to home
              </a>
              <span className="ss-small-label light">{text.label}</span>
              <h1 id="status-page-title" tabIndex="-1">{text.title}</h1>
              <p>{text.intro}</p>
            </div>
            <div className="col-12 col-lg-4">
              <div className="ss-selected-card">
                <span>Applicant support</span>
                <strong>{text.cardTitle}</strong>
                <small>{isContinue ? "Example: 0712345678 or name@example.com" : "Example: APP-DF-2026-AB12CD or +254712345678"}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="row g-4 align-items-start">
          <div className="col-12 col-xl-8">
            <section className="ss-status-lookup-card" aria-labelledby="lookup-title">
              <span className="ss-small-label dark">{text.lookupLabel}</span>
              <h2 id="lookup-title">{text.lookupTitle}</h2>
              <p>{text.lookupIntro}</p>

              <form onSubmit={handleSubmit} noValidate>
                <label className="form-label" htmlFor="application-reference">
                  {text.fieldLabel}
                </label>
                <div className="ss-status-search-row">
                  <input
                    id="application-reference"
                    className="form-control"
                    type="text"
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      if (stage !== "details") handleStartAgain();
                    }}
                    placeholder={text.placeholder}
                    autoComplete="off"
                  />
                  <button type="submit" className="btn ss-btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Sending...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-envelope-paper" aria-hidden="true" /> Send me a code
                      </>
                    )}
                  </button>
                </div>
              </form>

              {stage === "code" && (
                <form className="ss-otp-form mt-4" onSubmit={handleVerify} noValidate>
                  <label className="form-label" htmlFor="verification-code">
                    6-digit code from the email
                  </label>
                  <div className="ss-status-search-row">
                    <input
                      id="verification-code"
                      ref={codeInputRef}
                      className={`form-control ss-otp-input ${codeError ? "is-invalid" : ""}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      aria-invalid={Boolean(codeError)}
                      aria-describedby={codeError ? "verification-code-error" : "verification-code-help"}
                    />
                    <button type="submit" className="btn ss-btn-primary" disabled={loading}>
                      {loading ? "Checking..." : isContinue ? "Confirm and continue" : "Confirm code"}
                    </button>
                  </div>
                  {codeError ? (
                    <div id="verification-code-error" className="invalid-feedback d-block" role="alert">{codeError}</div>
                  ) : (
                    <p id="verification-code-help" className="form-text">The code expires in 10 minutes.</p>
                  )}
                  <div className="ss-otp-actions">
                    <button type="button" className="btn ss-link-button" onClick={requestCode} disabled={loading || resendIn > 0}>
                      {resendIn > 0 ? `Send a new code (available in ${resendIn}s)` : "Send a new code"}
                    </button>
                    <button type="button" className="btn ss-link-button" onClick={handleStartAgain}>
                      Use different details
                    </button>
                  </div>
                </form>
              )}

              {lookupMessage && (
                <div className="alert ss-alert-info mt-4" role="status" aria-live="polite">
                  <i className="bi bi-info-circle" aria-hidden="true" /> {lookupMessage}
                </div>
              )}

              {lookupResult && (
                <div className="mt-4">
                  {lookupResult.kind === "DRAFT" ? (
                    <SavedDraftCard draft={lookupResult} onResumeDraft={onResumeDraft} />
                  ) : (
                    <StatusResultCard result={lookupResult} />
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
                  <li><strong>Pending Review:</strong> the project team needs to review eligibility details before sending a test invitation.</li>
                  <li><strong>Eligible Pending Skills Test:</strong> check your email for the secure test link.</li>
                  <li><strong>Under Review:</strong> the Selection Committee reviews the application and test result where applicable.</li>
                  <li><strong>Participant Registration Pending:</strong> selected Physical and Virtual Academy participants should check their email for the secure registration link.</li>
                  <li><strong>Registration Completed:</strong> the participant registration and supporting documents are awaiting verification.</li>
                </ul>
              </div>

              {!isContinue && recentApplications.length > 0 && (
                <div className="ss-help-card mt-4">
                  <span className="ss-small-label dark">Recent on this device</span>
                  <div className="ss-recent-reference-list">
                    {recentApplications.map((application) => {
                      const recentReference = getReferenceFromResult(application);
                      return (
                        <button
                          key={recentReference}
                          type="button"
                          className="ss-recent-reference"
                          onClick={() => handleRecentClick(application)}
                        >
                          <strong>{recentReference}</strong>
                          <span>{application.pathwayTitle || application.pathway || "Physical Academy"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="ss-help-card mt-4">
                <span className="ss-small-label dark">No reference yet?</span>
                <p>
                  Start one application and keep the confirmation reference after submission. You can also use the mobile number or email address entered in the form.
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
