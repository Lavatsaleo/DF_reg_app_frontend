import { useEffect, useRef, useState } from "react";
import { PATHWAY_TITLES, QUESTIONS, suggestPathway } from "../data/pathwayFinder";
import { OPEN_COMPARISON_EVENT } from "../data/pathways";

/*
 * "Help me choose": four short questions, one at a time, then a suggested pathway with the reasons.
 * The questions and rules live in data/pathwayFinder.js.
 *
 * Screen readers: each question is a fieldset whose legend receives focus when it appears, so the question
 * and its options are read in order; the result heading receives focus when the result appears.
 */

function PathwayFinder({ pathways, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const focusRef = useRef(null);
  const openButtonRef = useRef(null);
  const hasOpenedRef = useRef(false);

  const isResult = step >= QUESTIONS.length;
  const question = QUESTIONS[step];
  const result = isResult ? suggestPathway(answers) : null;
  const byId = Object.fromEntries(pathways.map((pathway) => [pathway.id, pathway]));

  // Move focus to the new question's legend or to the result heading, so it is read straight away.
  // After closing, focus returns to "Help me choose" so the reader keeps their place.
  useEffect(() => {
    if (isOpen) {
      hasOpenedRef.current = true;
      focusRef.current?.focus();
    } else if (hasOpenedRef.current) {
      openButtonRef.current?.focus();
    }
  }, [isOpen, step]);

  function next() {
    if (!answers[question.id]) {
      setError("Please choose an answer to continue.");
      return;
    }
    setError("");
    setStep(step + 1);
  }

  function restart() {
    setAnswers({});
    setError("");
    setStep(0);
  }

  if (!isOpen) {
    return (
      <div className="df-finder df-finder-closed">
        <div>
          <h3>Not sure which pathway to choose?</h3>
          <p>Answer 4 short questions. We will suggest a pathway that may suit you.</p>
        </div>
        <button ref={openButtonRef} type="button" className="btn ss-btn-primary" onClick={() => setIsOpen(true)}>
          <i className="bi bi-signpost-split" aria-hidden="true" /> Help me choose
        </button>
      </div>
    );
  }

  return (
    <section className="df-finder" aria-label="Pathway finder">
      {!isResult ? (
        <div>
          <p className="df-finder-progress">
            Question {step + 1} of {QUESTIONS.length}
            <span className="df-finder-bar" aria-hidden="true">
              <span style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
            </span>
          </p>
          <fieldset aria-describedby={error ? "df-finder-error" : undefined}>
            <legend ref={focusRef} tabIndex="-1">{question.legend}</legend>
            <div className="df-finder-options">
              {question.options.map((option) => (
                <label key={option.value} className={answers[question.id] === option.value ? "is-selected" : ""}>
                  <input
                    type="radio"
                    name={`df-finder-${question.id}`}
                    value={option.value}
                    checked={answers[question.id] === option.value}
                    onChange={() => {
                      setAnswers({ ...answers, [question.id]: option.value });
                      setError("");
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p id="df-finder-error" className="df-finder-error" role="alert">{error}</p>}
          <div className="df-finder-actions">
            {step > 0 && (
              <button type="button" className="btn ss-btn-outline" onClick={() => { setError(""); setStep(step - 1); }}>
                <i className="bi bi-arrow-left" aria-hidden="true" /> Back
              </button>
            )}
            <button type="button" className="btn ss-btn-primary" onClick={next}>
              {step === QUESTIONS.length - 1 ? "See my suggestion" : "Next"} <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
            <button type="button" className="btn ss-link-button" onClick={() => { restart(); setIsOpen(false); }}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="df-finder-result">
          {result.pathwayId ? (
            <>
              <p className="df-finder-progress">Your suggestion</p>
              <h3 ref={focusRef} tabIndex="-1">
                <i className={`bi ${byId[result.pathwayId]?.icon}`} aria-hidden="true" /> {PATHWAY_TITLES[result.pathwayId]} may suit you best
              </h3>
            </>
          ) : (
            <h3 ref={focusRef} tabIndex="-1">We could not find a clear match</h3>
          )}
          <ul>
            {result.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            {result.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
          {result.alternativeId && (
            <p>You could also look at the <strong>{PATHWAY_TITLES[result.alternativeId]}</strong>.</p>
          )}
          <p className="df-finder-disclaimer">
            This is only a suggestion. Please read the full details for your country before you apply. Later, our team
            may suggest a different pathway for you.
          </p>
          <div className="df-finder-actions">
            {result.pathwayId && byId[result.pathwayId] && (
              <button type="button" className="btn ss-btn-primary" onClick={() => onSelect(byId[result.pathwayId])}>
                See {PATHWAY_TITLES[result.pathwayId]} details <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            )}
            <button type="button" className="btn ss-btn-outline" onClick={() => window.dispatchEvent(new Event(OPEN_COMPARISON_EVENT))}>
              Compare all pathways
            </button>
            <button type="button" className="btn ss-link-button" onClick={restart}>Start again</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default PathwayFinder;
