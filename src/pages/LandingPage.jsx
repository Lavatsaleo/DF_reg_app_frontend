import { pathways } from "../data/pathways";
import PathwayCard from "../components/PathwayCard";
import PathwayComparison from "../components/PathwayComparison";
import PathwayFinder from "../components/PathwayFinder";
import HeroBanner from "../components/HeroBanner";
import "./LandingHero.css";
import "./LandingSections.css";

// Page order follows the questions a first-time visitor asks (donor content review, November 2026):
// what is this (About, in the hero) → am I eligible → how do I apply → how do the pathways compare →
// choose a pathway. The pathway cards come last, so everything is known before anyone starts.
// To avoid overload, each section leads with a short answer; longer detail is one click away
// ("Help me choose", "What is included" on each card, the collapsed comparison, each pathway's details page).

const ELIGIBILITY = [
  { icon: "bi-person-check", text: <>You are a <strong>person with a disability</strong></> },
  { icon: "bi-geo-alt", text: <>You <strong>live in Ghana, Kenya, Nigeria or Zambia</strong></> },
  { icon: "bi-calendar3", text: <>You are aged <strong>18 to 33</strong>, or <strong>18 to 45</strong> for Digital Entrepreneurship</> },
  { icon: "bi-phone", text: <>You can <strong>use a smartphone or computer</strong></> },
  { icon: "bi-journal-check", text: <>You have the <strong>minimum education</strong> for your pathway</> },
  { icon: "bi-hourglass-split", text: <>You can <strong>take part for the whole training</strong> (places cannot be deferred)</> },
];

const JOURNEY = [
  { title: "Choose a pathway", text: "Read the details and eligibility for your country." },
  { title: "Apply online", text: "Give your consent and fill in the application form." },
  { title: "IT skills test", text: "A short online test, if you meet the eligibility criteria." },
  { title: "Interview", text: "A remote interview with the programme team." },
  { title: "Join your pathway", text: "If you are selected, we email you the start date and next steps." },
];

function LandingPage({ privacyNotice, onDismissPrivacyNotice, pathwayMessage, onPathwaySelect, onCheckStatus, onContinueApplication }) {
  return (
    <main id="main-content" tabIndex="-1" className="df-home-page df-home-clean">
      {privacyNotice && (
        <div className="container pt-3">
          <div className="alert ss-alert-info df-privacy-notice" role="status">
            <i className="bi bi-shield-lock" aria-hidden="true" />
            <p className="mb-0">{privacyNotice}</p>
            <button type="button" className="btn btn-sm ss-link-button" onClick={onDismissPrivacyNotice}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      <HeroBanner onCheckStatus={onCheckStatus} onContinueApplication={onContinueApplication} />

      <section id="eligibility" className="df-landing-section df-eligibility-section" aria-labelledby="eligibility-title" tabIndex="-1">
        <div className="container df-split">
          <div className="df-section-heading">
            <span className="df-eyebrow">Who can apply</span>
            <h2 id="eligibility-title">Is this programme for you?</h2>
            <p>You can apply if all of these are true:</p>
          </div>
          <ul className="df-eligibility-list">
            {ELIGIBILITY.map((item, index) => (
              <li key={index}>
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="next-steps" className="df-landing-section df-journey-section" aria-labelledby="journey-title" tabIndex="-1">
        <div className="container df-split">
          <div className="df-section-heading">
            <span className="df-eyebrow">How to apply</span>
            <h2 id="journey-title">What happens after you apply</h2>
            <p>Applying takes about 10 to 15 minutes. These are the steps from start to finish.</p>
          </div>
          <ol className="df-landing-journey">
            {JOURNEY.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <PathwayComparison pathways={pathways} onSelect={onPathwaySelect} />

      <section id="pathways" className="df-clean-pathway-section" aria-labelledby="pathways-title" tabIndex="-1">
        <div className="container">
          <div className="df-clean-pathway-heading df-split-heading">
            <div>
              <span className="df-eyebrow">Training pathways</span>
              <h2 id="pathways-title">Three ways to take part</h2>
            </div>
            <p>
              You can apply for <strong>one pathway only</strong>. Selecting a pathway shows its full details first:
              your application only starts when you choose to continue.
            </p>
          </div>

          {pathwayMessage && (
            <div className="alert ss-alert-warning" role="alert">
              <i className="bi bi-info-circle" aria-hidden="true" /> {pathwayMessage}
            </div>
          )}

          <PathwayFinder pathways={pathways} onSelect={onPathwaySelect} />

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
