import { useEffect, useRef, useState } from "react";
import { COMPARE_ROWS, OPEN_COMPARISON_EVENT } from "../data/pathways";
import { COUNTRY_PATHWAY_CONTENT } from "../data/countryPathwayContent";

const ALL = "ALL";
const COUNTRIES = Object.keys(COUNTRY_PATHWAY_CONTENT).sort();

// Country rows replace the general wording with that country's own summary, courses, dates and eligibility.
const COUNTRY_ROWS = [
  { key: "bestFor", label: "Best for you if", icon: "bi-person-heart" },
  { key: "courses", label: "Courses", icon: "bi-mortarboard" },
  { key: "eligibility", label: "Who can apply", icon: "bi-person-check" },
  { key: "dates", label: "Training dates", icon: "bi-calendar-event" },
  { key: "summary", label: "Overview", icon: "bi-compass" },
  { key: "afterYouFinish", label: "After you finish", icon: "bi-signpost-2" },
];

function countryValue(pathway, country, key) {
  if (key === "bestFor" || key === "afterYouFinish") return pathway.compare[key];
  const content = COUNTRY_PATHWAY_CONTENT[country]?.pathways?.[pathway.id];
  if (!content) return "Details coming soon.";
  if (key === "summary") return content.summary;
  if (key === "dates") return content.dates?.[0];
  if (key === "courses") {
    const names = (content.courses || []).map((course) => course.name).filter((name) => name !== "Curriculum overview");
    return names.length ? names : "Digital entrepreneurship curriculum";
  }
  if (key === "eligibility") return content.eligibility;
  return null;
}

function Value({ value }) {
  if (Array.isArray(value)) {
    return (
      <ul className="df-compare-list">
        {value.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  }
  return <p>{value || "—"}</p>;
}

/*
 * Collapsed by default to keep the page calm: one button opens the whole comparison.
 * The button uses aria-expanded/aria-controls, and the panel follows it in reading order.
 */
function PathwayComparison({ pathways, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [country, setCountry] = useState(ALL);
  const headingRef = useRef(null);
  const open = pathways.filter((pathway) => pathway.compare);
  const rows = country === ALL ? COMPARE_ROWS : COUNTRY_ROWS;
  const valueFor = (pathway, key) => (country === ALL ? pathway.compare[key] : countryValue(pathway, country, key));

  useEffect(() => {
    function openFromElsewhere() {
      setIsOpen(true);
      window.requestAnimationFrame(() => {
        headingRef.current?.focus({ preventScroll: true });
        headingRef.current?.scrollIntoView({ block: "start" });
      });
    }
    window.addEventListener(OPEN_COMPARISON_EVENT, openFromElsewhere);
    return () => window.removeEventListener(OPEN_COMPARISON_EVENT, openFromElsewhere);
  }, []);

  return (
    <section id="compare" className="df-compare-section" aria-labelledby="compare-title">
      <div className="container">
        <div className="df-compare-intro">
          <div>
            <h2 id="compare-title" ref={headingRef} tabIndex="-1">Compare the pathways side by side</h2>
            <p>
              See time, courses, education, equipment, support and what happens after you finish, for all pathways or
              for your country.
            </p>
          </div>
          <button
            type="button"
            className="btn ss-btn-outline df-compare-toggle"
            aria-expanded={isOpen}
            aria-controls="df-compare-panel"
            onClick={() => setIsOpen(!isOpen)}
          >
            <i className={`bi ${isOpen ? "bi-chevron-up" : "bi-chevron-down"}`} aria-hidden="true" />{" "}
            {isOpen ? "Hide comparison" : "Show comparison"}
          </button>
        </div>

        <div id="df-compare-panel" hidden={!isOpen}>
          <fieldset className="df-compare-country">
            <legend>Show details for</legend>
            <div className="df-compare-country-options">
              {[ALL, ...COUNTRIES].map((option) => (
                <label key={option} className={country === option ? "is-active" : ""}>
                  <input
                    type="radio"
                    name="df-compare-country"
                    value={option}
                    checked={country === option}
                    onChange={() => setCountry(option)}
                  />
                  {option === ALL ? "All countries" : option}
                </label>
              ))}
            </div>
          </fieldset>

          <p className="visually-hidden" aria-live="polite">
            {isOpen && (country === ALL ? "Showing details for all countries." : `Showing details for ${country}.`)}
          </p>

          {/* Wide screens: a true table, pathways as columns. */}
          <div className="df-compare-table-wrap">
            <table className="df-compare-table">
              <caption className="visually-hidden">
                Pathway comparison{country === ALL ? "" : ` for ${country}`}
              </caption>
              <thead>
                <tr>
                  <td />
                  {open.map((pathway) => (
                    <th key={pathway.id} scope="col">
                      <i className={`bi ${pathway.icon}`} aria-hidden="true" /> {pathway.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">
                      <i className={`bi ${row.icon}`} aria-hidden="true" /> {row.label}
                    </th>
                    {open.map((pathway) => (
                      <td key={pathway.id}><Value value={valueFor(pathway, row.key)} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  {open.map((pathway) => (
                    <td key={pathway.id}>
                      <button type="button" className="btn ss-btn-primary w-100" onClick={() => onSelect(pathway)}>
                        See full details <span className="visually-hidden">for {pathway.title}</span>
                        <i className="bi bi-arrow-right" aria-hidden="true" />
                      </button>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Phones and tablets: one block per pathway, same rows. */}
          <div className="df-compare-stack">
            {open.map((pathway) => (
              <article key={pathway.id} className="df-compare-card" aria-labelledby={`df-compare-${pathway.id}`}>
                <h3 id={`df-compare-${pathway.id}`}>
                  <i className={`bi ${pathway.icon}`} aria-hidden="true" /> {pathway.title}
                </h3>
                <dl>
                  {rows.map((row) => (
                    <div key={row.key} className="df-compare-card-row">
                      <dt><i className={`bi ${row.icon}`} aria-hidden="true" /> {row.label}</dt>
                      <dd><Value value={valueFor(pathway, row.key)} /></dd>
                    </div>
                  ))}
                </dl>
                <button type="button" className="btn ss-btn-primary w-100" onClick={() => onSelect(pathway)}>
                  See full details for {pathway.title} <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PathwayComparison;
