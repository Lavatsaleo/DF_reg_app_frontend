import { useCallback, useEffect, useRef, useState } from "react";
import heroWheelchair from "../assets/hero-slide-wheelchair.webp";
import heroBraids from "../assets/hero-slide-braids.webp";
import heroHat from "../assets/hero-slide-hat.webp";

const ROTATE_MS = 7000;

// Each slide pairs a photo with an open pathway; the theme sets the band's brand gradient.
const SLIDE_ART = {
  PHYSICAL_ACADEMY: {
    image: heroWheelchair,
    alt: "Smiling young woman in a floral dress, seated in her wheelchair outside a training centre",
    theme: "teal",
    // Focal point keeps the face in frame however the photo is cropped to fill its area.
    focus: "50% 30%",
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

function HeroBanner({ pathways, onPathwaySelect, onCheckStatus }) {
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
  const openCount = pathways.filter((pathway) => pathway.status === "open").length;

  return (
    <section className={`df-hero-band theme-${current?.theme || "teal"}`} aria-labelledby="digital-futures-title">
      <div className="df-hero-band-bg" aria-hidden="true">
        {["teal", "sun", "citrus"].map((theme) => (
          <span key={theme} className={`df-hero-band-layer theme-${theme}${current?.theme === theme ? " is-active" : ""}`} />
        ))}
        <span className="df-hero-band-dots" />
        <span className="df-hero-band-ring ring-a" />
        <span className="df-hero-band-ring ring-b" />
        <span className="df-hero-band-triangles">
          <span />
          <span />
          <span />
        </span>
      </div>

      <div className="container df-hero-band-grid">
        <div className="df-hero-band-copy">
          <span className="df-hero-band-eyebrow">Digital Futures application portal</span>
          <h1 id="digital-futures-title" className="df-hero-band-title">
            Digital skills.
            <br />
            <span>Inclusive futures.</span>
          </h1>
          <p className="df-hero-band-intro">
            Apply for a Digital Futures training pathway through an accessible portal with clear eligibility checks, secure consent and guided next steps.
          </p>
          <div className="df-hero-band-actions">
            <a href="#pathways" className="btn df-hero-band-btn-primary">
              Choose a pathway <i className="bi bi-arrow-right" aria-hidden="true" />
            </a>
            <button type="button" className="btn df-hero-band-btn-secondary" onClick={onCheckStatus}>
              <i className="bi bi-search" aria-hidden="true" /> Check application status
            </button>
          </div>
          <p className="df-hero-band-status">
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            Accepting applications · {openCount} {openCount === 1 ? "pathway" : "pathways"} open
          </p>
        </div>

        {count > 0 && (
          <div
            ref={carouselRef}
            className="df-hero-carousel"
            role="region"
            aria-roledescription="carousel"
            aria-label="Training pathways"
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
                    aria-label={`${index + 1} of ${count}: ${pathway.title}`}
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
                    <div className="df-hero-slide-card">
                      <span className="df-hero-slide-tag">{pathway.tag}</span>
                      <h2>{pathway.title}</h2>
                      <p>{pathway.highlights[0]}</p>
                      <button type="button" className="btn ss-btn-primary" onClick={() => onPathwaySelect(pathway)}>
                        Apply for {pathway.title} <i className="bi bi-arrow-right" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {count > 1 && (
              <div className="df-hero-carousel-controls">
                <button type="button" className="df-hero-control" aria-label="Previous pathway" onClick={() => goTo(active - 1)}>
                  <i className="bi bi-chevron-left" aria-hidden="true" />
                </button>
                <div className="df-hero-dots">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.pathway.id}
                      type="button"
                      className={`df-hero-dot${index === active ? " is-active" : ""}${index === active && rotating ? " is-timing" : ""}`}
                      aria-label={`Show ${slide.pathway.title}`}
                      aria-current={index === active ? "true" : undefined}
                      onClick={() => goTo(index)}
                    >
                      <span style={{ animationDuration: `${ROTATE_MS}ms` }} />
                    </button>
                  ))}
                </div>
                <button type="button" className="df-hero-control" aria-label="Next pathway" onClick={() => goTo(active + 1)}>
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
