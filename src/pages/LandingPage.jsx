import { pathways } from "../data/pathways";
import PathwayCard from "../components/PathwayCard";

function LandingPage({ pathwayMessage, onPathwaySelect, onCheckStatus }) {
  const openPathways = pathways.filter((pathway) => pathway.status === "open");

  return (
    <main id="main-content" tabIndex="-1">
      <section className="ss-hero" aria-labelledby="digital-futures-title">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-12 col-lg-7">
              <span className="ss-hero-kicker">Digital Futures Programme</span>
              <h1 id="digital-futures-title" className="ss-title">
                Digital skills. <span>Inclusive futures.</span>
              </h1>
              <p className="ss-subtitle mt-4">
                Apply for a Digital Futures training pathway through an accessible portal designed for inclusive participation, clear eligibility checks and secure participant tracking.
              </p>
              <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                <a href="#pathways" className="btn ss-btn-primary">
                  Choose a pathway <i className="bi bi-arrow-right-short" aria-hidden="true" />
                </a>
                <button type="button" className="btn ss-btn-outline" onClick={onCheckStatus}>
                  <i className="bi bi-search" aria-hidden="true" /> Check application status
                </button>
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <aside className="ss-hero-panel" aria-label="Current application intake">
                <div className="ss-panel-content">
                  <span>Applications open</span>
                  <strong>Physical and Virtual Academy</strong>
                  <p>Choose the pathway that best matches your qualifications, availability and preferred training format.</p>
                </div>
                <div className="ss-metric-row" aria-label="Application overview">
                  <div>
                    <strong>{pathways.length}</strong>
                    <span>Pathways</span>
                  </div>
                  <div>
                    <strong>{openPathways.length}</strong>
                    <span>Open now</span>
                  </div>
                  <div>
                    <strong>5–7 min</strong>
                    <span>Estimated time</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="ss-before-apply-section py-5" aria-labelledby="before-apply-title">
        <div className="container">
          <div className="ss-before-apply-card">
            <div>
              <span className="ss-small-label dark">Before you apply</span>
              <h2 id="before-apply-title">A clear and accessible application journey</h2>
              <p>
                Select a pathway, review and sign the consent form, complete the Jurat step if translation or explanation support was needed, then continue to the Application. Eligibility is checked as you progress.
              </p>
            </div>
            <div className="ss-before-apply-steps" role="list">
              <div role="listitem"><span>1</span><strong>Select a pathway</strong><small>Choose the training pathway that best matches your goals.</small></div>
              <div role="listitem"><span>2</span><strong>Consent and Jurat</strong><small>Review consent first, then complete the Jurat step where applicable.</small></div>
              <div role="listitem"><span>3</span><strong>Complete the Application</strong><small>Eligible applicants receive the next-step instructions after submission.</small></div>
            </div>
          </div>
        </div>
      </section>

      <section id="pathways" className="ss-pathway-section py-5" aria-labelledby="pathways-title">
        <div className="container">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
            <div>
              <span className="ss-small-label dark">Choose your pathway</span>
              <h2 id="pathways-title" className="ss-section-title display-6">Select a Digital Futures pathway</h2>
            </div>
            <span className="ss-count-badge">{pathways.length} pathways</span>
          </div>

          {pathwayMessage && (
            <div className="alert ss-alert-warning" role="alert">
              <i className="bi bi-info-circle" aria-hidden="true" /> {pathwayMessage}
            </div>
          )}

          <div className="row g-4">
            {pathways.map((pathway) => (
              <div key={pathway.id} className="col-12 col-lg-4">
                <PathwayCard pathway={pathway} onSelect={onPathwaySelect} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
