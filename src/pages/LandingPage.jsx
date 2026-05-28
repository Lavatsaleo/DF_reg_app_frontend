import { pathways } from "../data/pathways";
import PathwayCard from "../components/PathwayCard";

function LandingPage({ pathwayMessage, onPathwaySelect, onCheckStatus }) {
  return (
    <main id="main-content" tabIndex="-1">
      <section className="ss-hero">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-12 col-lg-7">
              <span className="ss-hero-badge">
                <i className="bi bi-stars" /> Sightsavers Digital Futures
              </span>
              <h1 className="ss-title mt-4">
                Build digital skills for <span>inclusive futures</span>
              </h1>
              <p className="ss-subtitle mt-4">
                The Digital Futures Project supports young people with disabilities
                to access practical digital skills, employment readiness support,
                and pathway-specific learning opportunities.
              </p>
              <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                <a href="#pathways" className="btn ss-btn-primary">
                  Choose pathway <i className="bi bi-arrow-right-short" />
                </a>
                <button type="button" className="btn ss-btn-outline" onClick={onCheckStatus}>
                  <i className="bi bi-search" aria-hidden="true" /> Check application status
                </button>
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <div className="ss-hero-panel">
                <div className="ss-ring-graphic" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="ss-panel-content">
                  <span>Registration</span>
                  <strong>Open</strong>
                  <p>Physical Academy workflow</p>
                </div>
                <div className="ss-metric-row">
                  <div>
                    <strong>3</strong>
                    <span>Pathways</span>
                  </div>
                  <div>
                    <strong>1</strong>
                    <span>Open now</span>
                  </div>
                  <div>
                    <strong>24/7</strong>
                    <span>Online access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pathways" className="ss-pathway-section py-5">
        <div className="container">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
            <div>
              <span className="ss-small-label dark">Choose your pathway</span>
              <h2 className="ss-section-title display-6">Select a Digital Futures pathway</h2>
            </div>
            <span className="ss-count-badge">3 pathways</span>
          </div>

          {pathwayMessage && (
            <div className="alert ss-alert-warning" role="alert">
              <i className="bi bi-info-circle" /> {pathwayMessage}
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
