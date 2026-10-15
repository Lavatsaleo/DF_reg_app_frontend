import { useCallback, useEffect, useRef, useState } from "react";
import heroWheelchair from "../assets/hero-slide-wheelchair.webp";
import heroBraids from "../assets/hero-slide-braids.webp";
import heroHat from "../assets/hero-slide-hat.webp";

const ROTATE_MS = 7000;
const PROGRAMME_COUNTRIES = ["Ghana", "Nigeria", "Kenya", "Zambia"];

// The first and last steps are also the way in: choose a pathway, or check an existing application.
const APPLICATION_JOURNEY = [
  { title: "Choose a pathway", icon: "bi-signpost-split", href: "#pathways" },
  { title: "Check your eligibility", icon: "bi-person-check" },
  { title: "Complete the consent check", icon: "bi-shield-check" },
  { title: "Fill out your application", icon: "bi-pencil-square" },
  { title: "Submit your application", icon: "bi-send-check" },
  { title: "Check your application status", icon: "bi-search", opensStatus: true },
];

function JourneyStep({ step, number, onCheckStatus }) {
  const body = (
    <>
      <span className="df-hero-step-number" aria-hidden="true">{number}</span>
      <span className="df-hero-step-title">{step.title}</span>
      <i className={`bi ${step.href || step.opensStatus ? "bi-arrow-right" : step.icon} df-hero-step-icon`} aria-hidden="true" />
    </>
  );
  if (step.href) return <a className="df-hero-step is-action" href={step.href}>{body}</a>;
  if (step.opensStatus) return <button type="button" className="df-hero-step is-action" onClick={onCheckStatus}>{body}</button>;
  return <div className="df-hero-step">{body}</div>;
}

// Each slide pairs a photo with an open pathway; the theme sets the band's brand gradient.
const SLIDE_ART = {
  PHYSICAL_ACADEMY: {
    image: heroWheelchair,
    alt: "Smiling young woman in a floral dress, seated in her wheelchair outside a training centre",
    theme: "teal",
    // Focal point keeps the face in frame however the photo is cropped to fill its area.
    focus: "58% 30%",
  },
  VIRTUAL_ACADEMY: {
    image: heroBraids,
    alt: "Smiling young woman with long braids, wearing a navy shirt",
    theme: "sun",
    focus: "70% 30%",
  },
  DIGITAL_ENTREPRENEURSHIP: {
    image: heroHat,
    alt: "Smiling woman in a black bucket hat and a white T-shirt",
    theme: "citrus",
    focus: "48% 22%",
  },
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("ss-reduce-motion")
  );
}

function HeroBanner({ pathways, onCheckStatus }) {
  const slides = pathways
    .filter((pathway) => pathway.status === "open" && SLIDE_ART[pathway.id])
    .map((pathway) => ({ pathway, ...SLIDE_ART[pathway.id] }));
  const [active, setActive] = useState(0);
  // Rotation starts only when motion is welcome; the Play button lets anyone opt in.
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [held, setHeld] = useState(false);
  const carouselRef = useRef(null);
  const count = slides.length;
  const rotating = playing && !held && count > 1;

  const goTo = useCallback((index) => setActive(((index % count) + count) % count), [count]);

  useEffect(() => {
    if (!rotating) return undefined;
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % count), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [rotating, active, count]);

  // Switching on Pause Animations from the accessibility menu stops rotation straight away.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains("ss-reduce-motion")) setPlaying(false);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Hovering or moving keyboard focus into the carousel holds the current slide.
  function handleBlur(event) {
    if (!carouselRef.current?.contains(event.relatedTarget)) setHeld(false);
  }

  const current = slides[active] || slides[0];

  return (
    <section className={`df-hero-band theme-${current?.theme || "teal"}`} aria-labelledby="digital-futures-title">
      <div className="df-hero-band-bg" aria-hidden="true">
        {["teal", "sun", "citrus"].map((theme) => (
          <span key={theme} className={`df-hero-band-layer theme-${theme}${current?.theme === theme ? " is-active" : ""}`} />
        ))}
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

            <h2 className="df-hero-journey-title">Your application journey</h2>
            <ol className="df-hero-journey">
              {APPLICATION_JOURNEY.map((step, index) => (
                <li key={step.title}>
                  <JourneyStep step={step} number={index + 1} onCheckStatus={onCheckStatus} />
                </li>
              ))}
            </ol>

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

        {count > 0 && (
          <div
            ref={carouselRef}
            className="df-hero-carousel"
            role="region"
            aria-roledescription="carousel"
            aria-label="Digital Futures participants"
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={handleBlur}
          >
            <div className="df-hero-slides" aria-live={rotating ? "off" : "polite"}>
              {slides.map((slide, index) => {
                const isActive = index === active;
                const { pathway } = slide;
                return (
                  <div
                    key={pathway.id}
                    className={`df-hero-slide${isActive ? " is-active" : ""}`}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Photo ${index + 1} of ${count}`}
                    // Hidden slides leave the tab order and the accessibility tree.
                    inert={!isActive}
                  >
                    <figure className="df-hero-slide-photo">
                      <img
                        src={slide.image}
                        alt={slide.alt}
                        style={{ objectPosition: slide.focus }}
                        fetchPriority={index === 0 ? "high" : "auto"}
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    </figure>
                  </div>
                );
              })}
            </div>

            {count > 1 && (
              <div className="df-hero-carousel-controls">
                <button type="button" className="df-hero-control" aria-label="Previous photo" onClick={() => goTo(active - 1)}>
                  <i className="bi bi-chevron-left" aria-hidden="true" />
                </button>
                <div className="df-hero-dots">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.pathway.id}
                      type="button"
                      className={`df-hero-dot${index === active ? " is-active" : ""}${index === active && rotating ? " is-timing" : ""}`}
                      aria-label={`Show photo ${index + 1}`}
                      aria-current={index === active ? "true" : undefined}
                      onClick={() => goTo(index)}
                    >
                      <span style={{ animationDuration: `${ROTATE_MS}ms` }} />
                    </button>
                  ))}
                </div>
                <button type="button" className="df-hero-control" aria-label="Next photo" onClick={() => goTo(active + 1)}>
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="df-hero-control df-hero-control-play"
                  aria-label={playing ? "Pause slide rotation" : "Start slide rotation"}
                  onClick={() => setPlaying((value) => !value)}
                >
                  <i className={`bi ${playing ? "bi-pause-fill" : "bi-play-fill"}`} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default HeroBanner;
