import { useRef, useState } from "react";
import { COUNTRY_PATHWAY_CONTENT } from "../data/countryPathwayContent";
import "./CountryPathwayInfo.css";

// A string is a paragraph, an array is a bulleted list, and {label, email} is a contact line.
function Blocks({ items = [] }) {
  return items.map((item, index) => {
    if (Array.isArray(item)) {
      return (
        <ul key={index}>
          {item.map((entry) => <li key={entry}>{entry}</li>)}
        </ul>
      );
    }
    if (item && typeof item === "object") {
      return (
        <p key={index}>
          {item.label} <a href={`mailto:${item.email}`}>{item.email}</a>
        </p>
      );
    }
    return <p key={index}>{item}</p>;
  });
}

function InfoBlock({ icon, title, children }) {
  return (
    <section className="df-info-block">
      <h3>
        <i className={`bi ${icon}`} aria-hidden="true" /> {title}
      </h3>
      {children}
    </section>
  );
}

function CourseCard({ course }) {
  const details = [
    ["What you will learn", course.learn],
    ["After the training", course.afterTraining && [course.afterTraining]],
    ["Certification", course.certification && [course.certification]],
    ["Potential careers", course.careers && [course.careers]],
  ].filter(([, value]) => value);

  return (
    <article className="df-course-card">
      <h3>{course.name}</h3>
      {course.description && <p className="df-course-description">{course.description}</p>}
      {details.map(([term, value]) => (
        <details key={term} className="df-course-detail">
          <summary>{term}</summary>
          <div className="df-course-detail-body"><Blocks items={value} /></div>
        </details>
      ))}
    </article>
  );
}

// Tabs follow the WAI-ARIA pattern: arrow keys move between tabs, Tab moves into the panel.
function InfoTabs({ tabs, activeId, onChange }) {
  const buttonsRef = useRef({});

  function handleKeyDown(event, index) {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const step = keys[event.key];
    const nextIndex = step === "first" ? 0 : step === "last" ? tabs.length - 1 : (index + step + tabs.length) % tabs.length;
    const nextId = tabs[nextIndex].id;
    onChange(nextId);
    buttonsRef.current[nextId]?.focus();
  }

  return (
    <div className="df-info-tabs" role="tablist" aria-label="Pathway information">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(element) => { buttonsRef.current[tab.id] = element; }}
          type="button"
          role="tab"
          id={`df-tab-${tab.id}`}
          aria-selected={activeId === tab.id}
          aria-controls={`df-panel-${tab.id}`}
          tabIndex={activeId === tab.id ? 0 : -1}
          className={activeId === tab.id ? "is-active" : ""}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          <i className={`bi ${tab.icon}`} aria-hidden="true" />
          <span>{tab.label}</span>
          {tab.count != null && <span className="df-info-tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

function ActionPanel({ countryContent, onContinue, onChangeCountry }) {
  return (
    <aside className="df-info-aside" aria-labelledby="df-info-next-title">
      <div className="df-info-aside-card">
        <span className="ss-small-label dark">Next step</span>
        <h2 id="df-info-next-title">Ready to apply?</h2>
        <p>Continue to the consent check. It takes about 10 to 15 minutes to complete the full application.</p>
        <button type="button" className="btn ss-btn-primary w-100" onClick={onContinue}>
          Continue to consent check <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
        <button type="button" className="btn ss-btn-outline w-100 mt-2" onClick={onChangeCountry}>
          Change country
        </button>

        {countryContent?.journey?.length > 0 && (
          <details className="df-info-aside-journey">
            <summary>Your application journey ({countryContent.journey.length} steps)</summary>
            <ol className="df-info-journey">
              {countryContent.journey.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </details>
        )}
      </div>
    </aside>
  );
}

function CountryPathwayInfo({ pathway, country, onContinue, onChangeCountry, onBackToPathways }) {
  const countryContent = COUNTRY_PATHWAY_CONTENT[country] || { comingSoon: true };
  const content = countryContent.comingSoon ? null : countryContent.pathways?.[pathway.id];
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = content
    ? [
        { id: "overview", label: "Overview", icon: "bi-compass" },
        { id: "courses", label: content.courses.length === 1 ? "Course" : "Courses", icon: "bi-mortarboard", count: content.courses.length },
        content.provides && { id: "included", label: "What's included", icon: "bi-gift" },
        { id: "eligibility", label: "Who can apply", icon: "bi-person-check" },
        { id: "faqs", label: "FAQs", icon: "bi-question-circle", count: countryContent.faqs.length },
      ].filter(Boolean)
    : [];

  return (
    <main id="main-content" tabIndex="-1" className="df-country-info">
      <section className="ss-form-hero df-entry-hero">
        <div className="container">
          <a
            href="/"
            className="df-back-link d-inline-flex align-items-center gap-2 mb-4"
            onClick={(event) => {
              event.preventDefault();
              onBackToPathways();
            }}
          >
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to pathways
          </a>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span className="ss-small-label light">Digital Futures</span>
            <button type="button" className="btn btn-sm ss-country-context-button" onClick={onChangeCountry}>
              <i className="bi bi-geo-alt" aria-hidden="true" /> {country} · Change
            </button>
          </div>
          <h1 id="df-country-info-title" tabIndex="-1">{pathway.title} in {country}</h1>
          <p>
            {content?.summary || `Read about the ${pathway.title} in ${country} before you start your application.`}
          </p>
        </div>
      </section>

      <section className="container py-4 py-lg-5">
        {!content ? (
          <div className="row justify-content-center">
            <div className="col-12 col-xl-9">
              <div className="df-info-panel df-info-coming-soon" role="status">
                <i className="bi bi-hourglass-split" aria-hidden="true" />
                <div>
                  <h2>Details coming soon</h2>
                  <p>
                    Detailed information about the {pathway.title} in {country}, including courses, training dates
                    and locations, is coming soon. You can still continue with your application.
                  </p>
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <button type="button" className="btn ss-btn-primary" onClick={onContinue}>
                      Continue to consent check <i className="bi bi-arrow-right" aria-hidden="true" />
                    </button>
                    <button type="button" className="btn ss-btn-outline" onClick={onChangeCountry}>
                      Change country
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="df-info-layout">
            <div className="df-info-main">
              <InfoTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

              <div
                className="df-info-panel"
                role="tabpanel"
                id={`df-panel-${activeTab}`}
                aria-labelledby={`df-tab-${activeTab}`}
                tabIndex={0}
              >
                {activeTab === "overview" && (
                  <div className="df-info-overview">
                    {content.learning?.length > 0 && (
                      <InfoBlock icon="bi-laptop" title="How you will learn">
                        <Blocks items={content.learning} />
                      </InfoBlock>
                    )}
                    <div className="df-info-pair">
                      <InfoBlock icon="bi-geo-alt" title="Where the training takes place">
                        <Blocks items={content.location} />
                      </InfoBlock>
                      <InfoBlock icon="bi-calendar-event" title="Training dates">
                        <Blocks items={content.dates} />
                      </InfoBlock>
                    </div>
                  </div>
                )}

                {activeTab === "courses" && (
                  <div className="df-course-list">
                    <p className="df-info-panel-lead">Courses offered in this application cycle. Open each heading to read more.</p>
                    {content.courses.map((course) => <CourseCard key={course.name} course={course} />)}
                  </div>
                )}

                {activeTab === "included" && content.provides && (
                  <div className="df-info-pair">
                    <InfoBlock icon="bi-gift" title="If you are selected, you will receive">
                      <ul className="df-check-list">{content.provides.map((item) => <li key={item}>{item}</li>)}</ul>
                    </InfoBlock>
                    {content.expected?.length > 0 && (
                      <InfoBlock icon="bi-hand-thumbs-up" title="What we ask of you">
                        <ul className="df-check-list">{content.expected.map((item) => <li key={item}>{item}</li>)}</ul>
                      </InfoBlock>
                    )}
                  </div>
                )}

                {activeTab === "eligibility" && (
                  <InfoBlock icon="bi-person-check" title="Applicants must">
                    <ul className="df-check-list">
                      {content.eligibility.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                    {content.note && <p className="df-info-note">{content.note}</p>}
                  </InfoBlock>
                )}

                {activeTab === "faqs" && (
                  <div className="df-faq-list">
                    {countryContent.faqs.map((faq) => (
                      <details key={faq.question} className="df-faq">
                        <summary>{faq.question}</summary>
                        <div className="df-faq-answer"><Blocks items={faq.answer} /></div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <ActionPanel countryContent={countryContent} onContinue={onContinue} onChangeCountry={onChangeCountry} />
          </div>
        )}
      </section>
    </main>
  );
}

export default CountryPathwayInfo;
