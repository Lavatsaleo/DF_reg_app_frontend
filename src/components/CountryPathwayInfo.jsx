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

function InfoSection({ id, icon, title, children }) {
  return (
    <section className="df-info-section" aria-labelledby={id}>
      <h2 id={id}>
        <i className={`bi ${icon}`} aria-hidden="true" /> {title}
      </h2>
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
      <dl>
        {details.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd><Blocks items={value} /></dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function Actions({ onContinue, onChangeCountry }) {
  return (
    <div className="df-info-actions">
      <button type="button" className="btn ss-btn-primary" onClick={onContinue}>
        Continue to consent check <i className="bi bi-arrow-right" aria-hidden="true" />
      </button>
      <button type="button" className="btn ss-btn-outline" onClick={onChangeCountry}>
        Change country
      </button>
    </div>
  );
}

function CountryPathwayInfo({ pathway, country, onContinue, onChangeCountry, onBackToPathways }) {
  const countryContent = COUNTRY_PATHWAY_CONTENT[country] || { comingSoon: true };
  const content = countryContent.comingSoon ? null : countryContent.pathways?.[pathway.id];

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

      <section className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-xl-9">
            {!content ? (
              <div className="df-info-section df-info-coming-soon" role="status">
                <i className="bi bi-hourglass-split" aria-hidden="true" />
                <div>
                  <h2>Details coming soon</h2>
                  <p>
                    Detailed information about the {pathway.title} in {country}, including courses, training dates
                    and locations, is coming soon. You can still continue with your application.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="df-info-lead">
                  Please read about this pathway in {country} before you apply. It explains the courses, where and
                  when training happens, what support you will receive and who can apply.
                </p>

                {content.learning && (
                  <InfoSection id="info-learning" icon="bi-laptop" title="How you will learn">
                    <Blocks items={content.learning} />
                  </InfoSection>
                )}

                <InfoSection id="info-courses" icon="bi-mortarboard" title="Courses offered in this application cycle">
                  <div className="df-course-list">
                    {content.courses.map((course) => <CourseCard key={course.name} course={course} />)}
                  </div>
                </InfoSection>

                <div className="df-info-grid">
                  <InfoSection id="info-location" icon="bi-geo-alt" title="Where the training takes place">
                    <Blocks items={content.location} />
                  </InfoSection>
                  <InfoSection id="info-dates" icon="bi-calendar-event" title="Training dates">
                    <Blocks items={content.dates} />
                  </InfoSection>
                </div>

                {content.provides && (
                  <InfoSection id="info-provides" icon="bi-gift" title="What the programme covers">
                    <p>If you are selected, you will receive:</p>
                    <ul>{content.provides.map((item) => <li key={item}>{item}</li>)}</ul>
                    {content.expected && (
                      <>
                        <h3>What we ask of you</h3>
                        <ul>{content.expected.map((item) => <li key={item}>{item}</li>)}</ul>
                      </>
                    )}
                  </InfoSection>
                )}

                <InfoSection id="info-eligibility" icon="bi-person-check" title="Eligibility criteria">
                  <p>Applicants must:</p>
                  <ul className="df-check-list">
                    {content.eligibility.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  {content.note && <p className="df-info-note">{content.note}</p>}
                </InfoSection>

                <InfoSection id="info-journey" icon="bi-signpost-split" title="Your application journey">
                  <ol className="df-info-journey">
                    {countryContent.journey.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </InfoSection>

                <InfoSection id="info-faqs" icon="bi-question-circle" title="Frequently asked questions">
                  <div className="df-faq-list">
                    {countryContent.faqs.map((faq) => (
                      <details key={faq.question} className="df-faq">
                        <summary>{faq.question}</summary>
                        <div className="df-faq-answer"><Blocks items={faq.answer} /></div>
                      </details>
                    ))}
                  </div>
                </InfoSection>
              </>
            )}

            <Actions onContinue={onContinue} onChangeCountry={onChangeCountry} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default CountryPathwayInfo;
