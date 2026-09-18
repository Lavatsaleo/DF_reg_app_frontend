import { pathways } from "../data/pathways";
import PathwayCard from "../components/PathwayCard";
import heroPerson from "../assets/hero-person.webp";
import secondaryLogoLockup from "../assets/digital-futures-secondary-logo-lockup.png";

function LandingPage({ pathwayMessage, onPathwaySelect, onCheckStatus }) {
  const openPathways = pathways.filter((pathway) => pathway.status === "open");

  return (
    <main id="main-content" tabIndex="-1" className="df-home-page df-home-clean">
      <section className="df-clean-hero" aria-labelledby="digital-futures-title">
        <div className="container">
          <div className="df-clean-hero-grid">
            <div className="df-clean-hero-copy">
              <span className="df-eyebrow">Digital Futures application portal</span>
              <h1 id="digital-futures-title" className="df-clean-hero-title">
                Digital skills.<br />
                <span>Inclusive futures.</span>
              </h1>
              <p className="df-clean-hero-intro">
                Apply for a Digital Futures training pathway through an accessible portal with clear eligibility checks, secure consent and guided next steps.
              </p>

              <div className="df-clean-hero-actions">
                <a href="#pathways" className="btn ss-btn-primary">
                  Choose a pathway <i className="bi bi-arrow-right" aria-hidden="true" />
                </a>
                <button type="button" className="btn ss-btn-outline" onClick={onCheckStatus}>
                  <i className="bi bi-search" aria-hidden="true" /> Check application
                </button>
              </div>

            </div>

            <div className="df-clean-hero-media" aria-label="Digital Futures participant">
              <div className="df-photo-shape df-photo-shape-teal" aria-hidden="true" />
              <div className="df-photo-frame">
                <img src={heroPerson} alt="Person featured in Digital Futures artwork" />
              </div>
              <div className="df-photo-triangles" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="df-open-badge">
                <span>Applications open</span>
                <strong>Physical &amp; Virtual Academy</strong>
                <small>{openPathways.length} pathways open now</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pathways" className="df-clean-pathway-section" aria-labelledby="pathways-title">
        <div className="container">
          <div className="df-clean-pathway-heading">
            <div>
              <span className="df-eyebrow">Choose your pathway</span>
              <h2 id="pathways-title">Start with the pathway that fits you</h2>
              <p>
                Compare the options at a glance, then choose the pathway that best matches your qualifications, availability and preferred learning format.
              </p>
            </div>
          </div>

          {pathwayMessage && (
            <div className="alert ss-alert-warning" role="alert">
              <i className="bi bi-info-circle" aria-hidden="true" /> {pathwayMessage}
            </div>
          )}

          <div className="row g-4 df-open-pathways">
            {pathways.map((pathway) => (
              <div key={pathway.id} className="col-12 col-md-6 col-xl-4">
                <PathwayCard pathway={pathway} onSelect={onPathwaySelect} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="df-programme-partners df-programme-partners-footer" aria-label="Digital Futures partnership">
        <div className="container">
          <img
            src={secondaryLogoLockup}
            alt="In partnership with Mastercard Foundation, ACET, African Disability Forum, International Labour Organization and Sightsavers"
            className="df-secondary-logo-lockup"
          />
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
