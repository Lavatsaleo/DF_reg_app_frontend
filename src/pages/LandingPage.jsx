import { pathways } from "../data/pathways";
import PathwayCard from "../components/PathwayCard";
import ProgrammePartnership from "../components/ProgrammePartnership";

function LandingPage({ pathwayMessage, onPathwaySelect, onCheckStatus }) {
  const openPathways = pathways.filter((pathway) => pathway.status === "open");

  return (
    <main id="main-content" tabIndex="-1" className="df-home-page">
      <section className="df-home-hero" aria-labelledby="digital-futures-title">
        <div className="container">
          <div className="df-hero-grid">
            <div className="df-hero-copy">
              <span className="df-eyebrow">Digital Futures application portal</span>
              <h1 id="digital-futures-title" className="df-hero-title">
                Apply to <span>Digital Futures.</span>
              </h1>
              <p className="df-hero-intro">
                Choose a training pathway and complete your application through an accessible portal with clear eligibility checks, secure consent and guided next steps.
              </p>

              <div className="df-hero-actions">
                <a href="#pathways" className="btn ss-btn-primary">
                  Choose a pathway <i className="bi bi-arrow-right" aria-hidden="true" />
                </a>
                <button type="button" className="btn ss-btn-outline" onClick={onCheckStatus}>
                  <i className="bi bi-search" aria-hidden="true" /> Check application
                </button>
              </div>

              <ProgrammePartnership />
            </div>

            <div className="df-hero-visual" aria-label="Digital Futures applications currently open">
              <div className="df-shape df-shape-teal" aria-hidden="true" />
              <div className="df-shape df-shape-orange" aria-hidden="true" />
              <div className="df-triangle-stack" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>

              <div className="df-intake-card">
                <span className="df-intake-label">Applications open</span>
                <h2>Physical and Virtual Academy</h2>
                <p>Select the pathway that best matches your qualifications, availability and preferred training format.</p>
                <div className="df-intake-stats" aria-label="Application overview">
                  <div><strong>{openPathways.length}</strong><span>Open now</span></div>
                  <div><strong>5–7 min</strong><span>Estimated time</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="df-journey-section" aria-labelledby="before-apply-title">
        <div className="container">
          <div className="df-section-heading">
            <span className="df-eyebrow">Before you apply</span>
            <h2 id="before-apply-title">A clear application journey</h2>
            <p>Complete each stage in order. Your progress is saved so you can return to the Application if needed.</p>
          </div>

          <div className="df-journey-grid" role="list">
            <article role="listitem" className="df-journey-card">
              <span className="df-step-number">01</span>
              <h3>Select a pathway</h3>
              <p>Choose the training pathway that best matches your goals and circumstances.</p>
            </article>
            <article role="listitem" className="df-journey-card">
              <span className="df-step-number">02</span>
              <h3>Consent and Jurat</h3>
              <p>Review and sign the consent information, then complete the Jurat step where applicable.</p>
            </article>
            <article role="listitem" className="df-journey-card">
              <span className="df-step-number">03</span>
              <h3>Complete the Application</h3>
              <p>Answer the required questions and submit once you have reviewed your information.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="pathways" className="df-pathway-section" aria-labelledby="pathways-title">
        <div className="container">
          <div className="df-section-heading df-pathway-heading">
            <div>
              <span className="df-eyebrow">Choose your pathway</span>
              <h2 id="pathways-title">Digital Futures pathways</h2>
              <p>Review the options below and start the pathway that is currently open to you.</p>
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
