function getEligibilityLabel(result) {
  if (!result) return "Submitted";
  if (result.isEligible === true) return "Eligible - Pending Review";
  if (result.isEligible === false) return "Submitted - Eligibility Review Required";
  return result.status || "Submitted";
}

function getReference(result) {
  return (
    result?.applicationReference ||
    result?.referenceNumber ||
    result?.registrationReference ||
    result?.registrationId ||
    result?.id ||
    "Reference pending"
  );
}

function formatSubmittedAt(value) {
  if (!value) return "Just now";

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Just now";
  }
}

function ApplicationConfirmation({ result, selectedPathway, onStartNewApplication, onCheckStatus }) {
  const reference = getReference(result);
  const eligibilityLabel = getEligibilityLabel(result);
  const isEligible = result?.isEligible === true;

  function handlePrint() {
    window.print();
  }

  return (
    <main id="main-content" tabIndex="-1" className="ss-confirmation-page">
      <section className="ss-confirmation-hero" aria-labelledby="confirmation-title">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-10">
              <div className={`ss-confirmation-card ${isEligible ? "eligible" : "review"}`}>
                <div className="ss-confirmation-icon" aria-hidden="true">
                  <i className="bi bi-check2-circle" />
                </div>

                <span className="ss-small-label dark">Application submitted</span>
                <h1 id="confirmation-title">Thank you. Your registration has been received.</h1>
                <p className="ss-confirmation-lead">
                  Your application for the <strong>{selectedPathway?.title || result?.pathway || "selected pathway"}</strong> has been saved successfully. Please keep your reference number safely.
                </p>

                <div className="ss-reference-box" aria-label={`Your application reference is ${reference}`}>
                  <span>Application reference</span>
                  <strong>{reference}</strong>
                  <small>Submitted: {formatSubmittedAt(result?.submittedAt)}</small>
                </div>

                <div className="ss-confirmation-grid" role="list">
                  <div className="ss-confirmation-detail" role="listitem">
                    <span>Status</span>
                    <strong>{result?.status || "Submitted"}</strong>
                  </div>
                  <div className="ss-confirmation-detail" role="listitem">
                    <span>Eligibility</span>
                    <strong>{eligibilityLabel}</strong>
                  </div>
                  <div className="ss-confirmation-detail" role="listitem">
                    <span>Pathway</span>
                    <strong>{result?.pathway || selectedPathway?.id || "Physical Academy"}</strong>
                  </div>
                  <div className="ss-confirmation-detail" role="listitem">
                    <span>Registration mode</span>
                    <strong>{result?.registrationMode || selectedPathway?.mode || "Public registration"}</strong>
                  </div>
                </div>

                {result?.eligibilityReason && (
                  <div className="ss-eligibility-note" role="note">
                    <i className="bi bi-info-circle" aria-hidden="true" />
                    <p>{result.eligibilityReason}</p>
                  </div>
                )}

                <div className="ss-next-steps" aria-labelledby="next-steps-title">
                  <h2 id="next-steps-title">What happens next?</h2>
                  <div className="ss-timeline">
                    <div className="ss-timeline-item complete">
                      <span aria-hidden="true">1</span>
                      <div>
                        <strong>Application received</strong>
                        <p>Your information has been submitted successfully.</p>
                      </div>
                    </div>
                    <div className="ss-timeline-item active">
                      <span aria-hidden="true">2</span>
                      <div>
                        <strong>Review by the project team</strong>
                        <p>The team will review your eligibility information and supporting documents.</p>
                      </div>
                    </div>
                    <div className="ss-timeline-item">
                      <span aria-hidden="true">3</span>
                      <div>
                        <strong>Decision and pathway enrollment</strong>
                        <p>Approved applicants will be enrolled into the correct Digital Futures pathway.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ss-confirmation-actions">
                  <button type="button" className="btn ss-btn-primary" onClick={handlePrint}>
                    <i className="bi bi-printer" aria-hidden="true" /> Print confirmation
                  </button>
                  <button type="button" className="btn ss-btn-outline" onClick={onCheckStatus}>
                    <i className="bi bi-search" aria-hidden="true" /> Check status
                  </button>
                  <button type="button" className="btn ss-btn-outline" onClick={onStartNewApplication}>
                    <i className="bi bi-arrow-repeat" aria-hidden="true" /> Start another application
                  </button>
                </div>

                <p className="ss-confirmation-footnote">
                  This confirmation does not guarantee final enrollment. The project team will complete the review process first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ApplicationConfirmation;
