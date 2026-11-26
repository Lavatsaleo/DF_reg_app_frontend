// The wheelchair photo was replaced because its off-shoulder dress does not suit the cultural context in
// Northern Nigeria (Nigeria review, November 2026). This photo is framed wide enough to show the whole head
// and shoulders in the half-screen panel.
import heroPhoto from "../assets/hero-slide-hat.webp";

// "About Digital Futures" is the first thing a visitor sees (donor content review, November 2026):
// what the programme is and what it offers, beside the photo, with one main next step.
const OFFERS = [
  { icon: "bi-mortarboard", text: "Training in computer and business skills" },
  { icon: "bi-universal-access", text: "Support for your disability" },
  { icon: "bi-people", text: "A mentor to guide and advise you" },
  { icon: "bi-award", text: "A certificate when you finish" },
];

function HeroBanner({ onCheckStatus, onContinueApplication }) {
  return (
    <section className="df-hero-band theme-teal" aria-labelledby="digital-futures-title">
      <div className="df-hero-band-bg" aria-hidden="true">
        <span className="df-hero-band-layer theme-teal is-active" />
      </div>

      <div className="container">
        <p className="df-hero-eyebrow">About Digital Futures</p>
        <h1 id="digital-futures-title" className="df-hero-band-title">
          Free computer and digital skills training for young people with disabilities
        </h1>
      </div>

      <div className="df-hero-band-body">
        <div className="container">
          <div className="df-hero-band-copy">
            <p className="df-hero-band-intro">
              Digital Futures is a training programme run by Sightsavers. It is for young
              people with disabilities who live in Ghana, Kenya, Nigeria or Zambia.
            </p>
            <p className="df-hero-band-intro">
              You learn skills for using computers and the internet at work. These skills can help you get a job, or
              start or grow your own business.
            </p>

            <ul className="df-hero-offers">
              {OFFERS.map((offer) => (
                <li key={offer.text}>
                  <i className={`bi ${offer.icon}`} aria-hidden="true" /> {offer.text}
                </li>
              ))}
            </ul>

            <p className="df-hero-free">
              <i className="bi bi-shield-check" aria-hidden="true" />
              <span><strong>It is free.</strong> You never pay anything to apply, to train or to get your certificate.</span>
            </p>

            <div className="df-hero-actions">
              <a className="btn ss-btn-primary df-hero-action" href="#eligibility">
                Find out if you can apply <i className="bi bi-arrow-down" aria-hidden="true" />
              </a>
            </div>

            <div className="df-hero-links">
              <span>Already applied?</span>
              <button type="button" className="df-hero-link" onClick={onCheckStatus}>Check your application status</button>
              <button type="button" className="df-hero-link" onClick={onContinueApplication}>Continue my application</button>
            </div>
          </div>
        </div>

        <div className="df-hero-photo">
          <figure className="df-hero-slide-photo">
            <img
              src={heroPhoto}
              alt="Smiling young woman in a bucket hat and a white T-shirt, in a training room"
              aria-describedby="df-hero-photo-disclaimer"
              fetchPriority="high"
            />
          </figure>
        </div>
      </div>

      {/* Required on Digital Futures promotional images (programme team, November 2026). */}
      <div className="container">
        <p id="df-hero-photo-disclaimer" className="df-hero-photo-disclaimer">
          Content promoting Digital Futures includes participants of other Sightsavers inclusion projects.
        </p>
      </div>
    </section>
  );
}

export default HeroBanner;
