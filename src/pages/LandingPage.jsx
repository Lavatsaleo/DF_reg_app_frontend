import { pathways } from "../data/pathways";
import PathwayCard from "../components/PathwayCard";
import ProgrammePartnership from "../components/ProgrammePartnership";
import heroPerson from "../assets/hero-person.webp";
import programmePartners from "../assets/programme-partners.webp";

function LandingPage({ pathwayMessage, onPathwaySelect, onCheckStatus }) {
  const openPathways = pathways.filter((pathway) => pathway.status === "open");
  const upcomingPathways = pathways.filter((pathway) => pathway.status !== "open");

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

              <div className="df-clean-partnership">
                <ProgrammePartnership />
              </div>
            </div>

            <div className="df-clean-hero-media" aria-label="Digital Futures participant">
              <div className="df-photo-shape df-photo-shape-teal" aria-hidden="true" />
              <div className="df-photo-frame">
                <img src={heroPerson} alt="Digital Futures participant" />
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

      <section className="df-programme-partners" aria-labelledby="programme-partners-title">
        <div className="container">
          <div className="df-programme-partners-inner">
            <div>
              <span className="df-eyebrow">Working together</span>
              <h2 id="programme-partners-title">Programme partners</h2>
            </div>
            <img
              src={programmePartners}
              alt="Digital Futures programme partner logos"
              className="df-programme-partner-strip"
            />
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
                Choose an open pathway below. You will review consent and the Jurat step before continuing to the Application.
              </p>
            </div>
          </div>

          {pathwayMessage && (
            <div className="alert ss-alert-warning" role="alert">
              <i className="bi bi-info-circle" aria-hidden="true" /> {pathwayMessage}
            </div>
          )}

          <div className="row g-4 df-open-pathways">
            {openPathways.map((pathway) => (
              <div key={pathway.id} className="col-12 col-lg-6">
                <PathwayCard pathway={pathway} onSelect={onPathwaySelect} simplified />
              </div>
            ))}
          </div>

          {upcomingPathways.length > 0 && (
            <div className="df-coming-soon-bar" aria-label="Upcoming Digital Futures pathways">
              <div className="df-coming-soon-copy">
                <span className="df-coming-soon-kicker">Coming soon</span>
                <strong>{upcomingPathways.map((pathway) => pathway.title).join(", ")}</strong>
                <small>More Digital Futures opportunities will be added as applications open.</small>
              </div>
              <span className="df-coming-soon-status">Not yet open</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
