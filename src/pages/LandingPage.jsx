import { pathways } from "../data/pathways";
import PathwayCard from "../components/PathwayCard";
import HeroBanner from "../components/HeroBanner";
import "./LandingHero.css";

function LandingPage({ pathwayMessage, onPathwaySelect, onCheckStatus }) {
  return (
    <main id="main-content" tabIndex="-1" className="df-home-page df-home-clean">
      <HeroBanner onCheckStatus={onCheckStatus} />

      <section id="pathways" className="df-clean-pathway-section" aria-labelledby="pathways-title" tabIndex="-1">
        <div className="container">
          <div className="df-clean-pathway-heading">
            <div>
              <span className="df-eyebrow">Training pathways</span>
              <h2 id="pathways-title">Choose the pathway that is right for you</h2>
              <p>
                Compare the options at a glance, then choose the pathway that best matches your career goals, qualifications, availability and preferred learning format. You can apply for one pathway only.
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
    </main>
  );
}

export default LandingPage;
