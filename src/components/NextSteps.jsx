// "What happens next": where the applicant is in the Digital Futures journey and what comes after.
// Review times are set in data/programmeTimelines.js once the programme team confirms them.
import { PROGRAMME_TIMELINES } from "../data/programmeTimelines";

const STEPS = [
  { key: "applied", label: "Application submitted" },
  { key: "skills-test", label: "Basic IT skills test", academiesOnly: true },
  { key: "committee", label: "Selection committee review" },
  { key: "registration", label: "Participant registration (if selected)" },
  { key: "verification", label: "Verification of your details and documents" },
  { key: "onboarding", label: "Onboarding and start of training" },
];

const NEXT_TEXT = {
  "skills-test": () =>
    PROGRAMME_TIMELINES.committeeDecision
      ? `The selection committee now reviews your application and test result together. We expect to email you the decision ${PROGRAMME_TIMELINES.committeeDecision}.`
      : "The selection committee now reviews your application and test result together. We will email you as soon as a decision is made.",
  registration: () =>
    PROGRAMME_TIMELINES.verification
      ? `The programme team now checks your details and documents. We expect to contact you ${PROGRAMME_TIMELINES.verification} with your onboarding instructions and training dates.`
      : "The programme team now checks your details and documents, then emails you your onboarding instructions and training dates.",
};

// done: the key of the step the applicant has just completed.
function NextSteps({ done, pathway }) {
  const steps = STEPS.filter((step) => !(step.academiesOnly && pathway === "DIGITAL_ENTREPRENEURSHIP"));
  const doneIndex = steps.findIndex((step) => step.key === done);
  const remaining = steps.length - doneIndex - 1;

  return (
    <section className="ss-next-steps" aria-labelledby="next-steps-title">
      <h2 id="next-steps-title" className="h5">What happens next</h2>
      {NEXT_TEXT[done] && <p>{NEXT_TEXT[done]()}</p>}
      <ol className="ss-next-steps-list">
        {steps.map((step, index) => {
          const state = index <= doneIndex ? "done" : index === doneIndex + 1 ? "next" : "later";
          return (
            <li key={step.key} className={`is-${state}`}>
              <span className="ss-next-steps-marker" aria-hidden="true">
                {state === "done" ? <i className="bi bi-check-lg" /> : index + 1}
              </span>
              <span>
                {step.label}
                <span className="visually-hidden">{state === "done" ? " (done)" : state === "next" ? " (next step)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="ss-next-steps-footnote">
        {remaining > 0
          ? `${remaining} ${remaining === 1 ? "step" : "steps"} to go. `
          : ""}
        We email you at every step, so check your inbox and spam or junk folder. You can also use Check status at any time.
      </p>
    </section>
  );
}

export default NextSteps;
