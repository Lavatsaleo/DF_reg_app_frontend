import { pathways } from "../data/pathways";
import PathwayCard from "../components/PathwayCard";
import ProgrammePartnership from "../components/ProgrammePartnership";
import HeroBanner from "../components/HeroBanner";
import programmePartners from "../assets/programme-partners-3.webp";
import "./LandingHero.css";

function LandingPage({ pathwayMessage, onPathwaySelect, onCheckStatus }) {
  return (
    <main id="main-content" tabIndex="-1" className="df-home-page df-home-clean">
      <HeroBanner pathways={pathways} onPathwaySelect={onPathwaySelect} onCheckStatus={onCheckStatus} />

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

      <section className="df-hero-partners" aria-labelledby="programme-partners-title">
        <div className="container">
          <div className="df-hero-partners-inner">
            <div>
              <span className="df-eyebrow">Working together</span>
              <h2 id="programme-partners-title">Programme partners</h2>
            </div>
            <div className="df-hero-partners-logos">
              <ProgrammePartnership compact />
              <span className="df-hero-partners-divider" aria-hidden="true" />
              <img
                src={programmePartners}
                width="440"
                height="70"
                loading="lazy"
                alt="African Center for Economic Transformation (ACET), African Disability Forum (ADF) and International Labour Organization (ILO)"
                className="df-hero-partners-strip"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
