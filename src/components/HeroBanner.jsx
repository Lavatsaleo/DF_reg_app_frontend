import heroWheelchair from "../assets/hero-slide-wheelchair.webp";

const PROGRAMME_COUNTRIES = ["Ghana", "Nigeria", "Kenya", "Zambia"];

// One strong photo and two clear actions: start an application, or check an existing one.
function HeroBanner({ onCheckStatus }) {
  return (
    <section className="df-hero-band theme-teal" aria-labelledby="digital-futures-title">
      <div className="df-hero-band-bg" aria-hidden="true">
        <span className="df-hero-band-layer theme-teal is-active" />
      </div>

      <div className="container">
        <h1 id="digital-futures-title" className="df-hero-band-title">
          Build your digital skills and your career in tech
        </h1>
      </div>

      <div className="df-hero-band-body">
        <div className="container">
          <div className="df-hero-band-copy">
            <p className="df-hero-band-intro">
              Apply for a Digital Futures training pathway through an accessible portal with clear eligibility checks, secure consent and guided next steps.
            </p>

            <div className="df-hero-actions">
              <a className="btn ss-btn-primary df-hero-action" href="#pathways">
                Choose a pathway <i className="bi bi-arrow-right" aria-hidden="true" />
              </a>
              <button type="button" className="btn ss-btn-outline df-hero-action" onClick={onCheckStatus}>
                <i className="bi bi-clipboard2-check" aria-hidden="true" /> Check your application status
              </button>
            </div>
            <p className="df-hero-one-pathway">
              <i className="bi bi-info-circle" aria-hidden="true" /> You can apply for one pathway only, so compare them before you start.
            </p>

            <div className="df-hero-about">
              <h2>About Digital Futures</h2>
              <p>
                Digital Futures is an IT skills programme for young people with disabilities in Ghana, Nigeria, Kenya and Zambia. Through this initiative you can develop the skills and certifications to work in the digital economy.
              </p>
              <ul className="df-hero-countries" aria-label="Programme countries">
                {PROGRAMME_COUNTRIES.map((country) => (
                  <li key={country}><i className="bi bi-geo-alt-fill" aria-hidden="true" /> {country}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="df-hero-photo">
          <figure className="df-hero-slide-photo">
            <img
              src={heroWheelchair}
              alt="Smiling young woman in a floral dress, seated in her wheelchair outside a training centre"
              style={{ objectPosition: "58% 30%" }}
              fetchPriority="high"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}

export default HeroBanner;
