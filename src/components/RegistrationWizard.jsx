import { useEffect, useMemo, useRef, useState } from "react";
import ResultAlert from "./ResultAlert";
import ReviewApplication from "./ReviewApplication";
import WizardSection from "./WizardSection";

function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function getSectionStatus(questions, answers, errors, isActive) {
  const hasErrors = questions.some((question) => errors?.[question.questionCode]);
  if (hasErrors) return "needs_attention";

  const requiredQuestions = questions.filter((question) => question.required);
  const answeredRequired = requiredQuestions.filter((question) => !isEmpty(answers[question.questionCode]));
  const answeredAny = questions.some((question) => !isEmpty(answers[question.questionCode]));

  if (requiredQuestions.length > 0 && answeredRequired.length === requiredQuestions.length) return "complete";
  if (requiredQuestions.length === 0 && answeredAny) return "complete";
  if (isActive || answeredAny) return "in_progress";
  return "not_started";
}

function RegistrationWizard({
  selectedPathway,
  groupedQuestions,
  answers,
  documents,
  submitting,
  submitResult,
  errorMessage,
  fieldErrors,
  draftSaveStatus,
  currentStep = 0,
  onAnswerChange,
  onMultiSelectChange,
  onSubmit,
  onValidateQuestions,
  onClearDraft,
  onStepChange,
}) {
  const sectionEntries = useMemo(
    () => Object.entries(groupedQuestions).filter(([section]) => section !== "Jurat / Interpreter"),
    [groupedQuestions]
  );
  const reviewStepIndex = sectionEntries.length;
  const totalSteps = sectionEntries.length + 1;
  const [activeStep, setActiveStep] = useState(() => Math.max(0, Number(currentStep) || 0));
  const [announcement, setAnnouncement] = useState("Start with the first section of the application form.");
  const hasAppliedRestoredStep = useRef(false);
  const finalSubmitIntentRef = useRef(false);
  const pendingInvalidFocusRef = useRef(false);
  const reviewErrorFocusRef = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeStep > reviewStepIndex) setActiveStep(0);
  }, [activeStep, reviewStepIndex]);

  useEffect(() => {
    if (hasAppliedRestoredStep.current) return;
    const restoredStep = Math.max(0, Math.min(Number(currentStep) || 0, reviewStepIndex));
    if (restoredStep > 0) {
      hasAppliedRestoredStep.current = true;
      setActiveStep(restoredStep);
    }
  }, [currentStep, reviewStepIndex]);

  useEffect(() => {
    onStepChange?.(activeStep);
  }, [activeStep, onStepChange]);

  useEffect(() => {
    const errorCodes = Object.keys(fieldErrors || {});
    if (errorCodes.length === 0 || sectionEntries.length === 0) return;

    const firstErrorSectionIndex = sectionEntries.findIndex(([, questions]) =>
      questions.some((question) => errorCodes.includes(question.questionCode))
    );

    if (firstErrorSectionIndex >= 0 && activeStep === reviewStepIndex) {
      reviewErrorFocusRef.current = true;
      setActiveStep(firstErrorSectionIndex);
      setAnnouncement("Some questions need attention. The first section with an error is now open.");
    }

    if (pendingInvalidFocusRef.current) {
      pendingInvalidFocusRef.current = false;
      const frame = window.requestAnimationFrame(() => {
        const activeQuestions = sectionEntries[activeStep]?.[1] || [];
        const invalidQuestion = activeQuestions.find((question) => errorCodes.includes(question.questionCode));
        const card = invalidQuestion && document.getElementById(invalidQuestion.questionCode + "-card");
        const control = card?.querySelector('input:not([type="hidden"]), select, textarea, button');
        control?.focus({ preventScroll: true });
        control?.scrollIntoView({ block: "center" });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    // Respond to validation result changes; do not recenter the user on every step selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldErrors, sectionEntries]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!reviewErrorFocusRef.current || activeStep === reviewStepIndex) return undefined;
    reviewErrorFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      const questions = sectionEntries[activeStep]?.[1] || [];
      const firstInvalid = questions.find((question) => fieldErrors?.[question.questionCode]);
      const card = firstInvalid && document.getElementById(firstInvalid.questionCode + "-card");
      const control = card?.querySelector('input:not([type="hidden"]), select, textarea, button');
      control?.focus({ preventScroll: true });
      control?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeStep, reviewStepIndex, fieldErrors, sectionEntries]);

  function goToStep(stepIndex) {
    const nextStep = Math.max(0, Math.min(stepIndex, reviewStepIndex));
    setActiveStep(nextStep);
    onStepChange?.(nextStep);

    window.requestAnimationFrame(() => {
      const buttonId = nextStep === reviewStepIndex ? "wizard-review-button" : `wizard-section-button-${nextStep}`;
      const headingButton = document.getElementById(buttonId);
      headingButton?.focus({ preventScroll: true });
      headingButton?.scrollIntoView({ block: "start" });
    });
  }

  function continueFromSection(index, questions) {
    const isValid = onValidateQuestions(questions);
    if (!isValid) {
      pendingInvalidFocusRef.current = true;
      setAnnouncement("Please complete the highlighted questions before continuing.");
      return;
    }

    const nextStep = Math.min(index + 1, reviewStepIndex);
    setAnnouncement(`Section completed. Moving to step ${nextStep + 1} of ${totalSteps}.`);
    goToStep(nextStep);
  }

  function handleWizardSubmit(event) {
    // An implicit Enter from a field must never submit the full questionnaire.
    if (activeStep !== reviewStepIndex || !finalSubmitIntentRef.current) {
      event.preventDefault();
      finalSubmitIntentRef.current = false;
      setAnnouncement("Your answers are unchanged. Use Continue to complete a section, or Submit Application at the final review.");
      return;
    }

    finalSubmitIntentRef.current = false;
    onSubmit(event);
  }

  function handleFormKeyDown(event) {
    if (event.key !== "Enter" || event.isComposing) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    // Support Enter as an alternative to Space for radio buttons and checkboxes.
    if (target.type === "radio" || target.type === "checkbox") {
      event.preventDefault();
      target.click();
      return;
    }

    // Text-like inputs must not activate the form's default submit button.
    if (!["submit", "button", "reset"].includes(target.type)) event.preventDefault();
  }

  if (sectionEntries.length === 0) {
    return (
      <section className="ss-section-card">
        <div className="ss-empty-state">
          <i className="bi bi-ui-checks" aria-hidden="true" />
          <h2>No questions are currently available</h2>
          <p>The application loaded successfully, but no questions were returned by the backend.</p>
        </div>
      </section>
    );
  }

  const sectionStatuses = sectionEntries.map(([, questions], index) =>
    getSectionStatus(questions, answers, fieldErrors, activeStep === index)
  );

  const currentSectionEntry = sectionEntries[activeStep] || null;

  return (
    <form
      className="ss-form-shell ss-registration-wizard"
      onSubmit={handleWizardSubmit}
      onKeyDown={handleFormKeyDown}
      noValidate
      aria-describedby="registration-form-guidance"
    >
      <p id="registration-form-guidance" className="visually-hidden">
        This is a guided step-by-step application. Complete the current page and use Save and continue to move forward.
      </p>

      <div className="ss-survey-toolbar">
        <div>
          <span className="ss-small-label dark">{selectedPathway.title}</span>
          <strong>{draftSaveStatus === "saving" ? "Saving..." : "Progress saved"}</strong>
        </div>
        <button type="button" className="btn btn-sm ss-link-button" onClick={onClearDraft}>
          Clear draft
        </button>
      </div>

      <nav className="ss-survey-stepper" aria-label="Application sections">
        <ol>
          {sectionEntries.map(([section], index) => {
            const status = sectionStatuses[index];
            const isCurrent = activeStep === index;
            const canOpen = index <= activeStep || status === "complete" || status === "needs_attention";

            return (
              <li key={section} className={`${status} ${isCurrent ? "current" : ""}`}>
                <button
                  id={`wizard-section-button-${index}`}
                  type="button"
                  onClick={() => canOpen && goToStep(index)}
                  disabled={!canOpen}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span className="ss-survey-step-dot" aria-hidden="true">
                    {status === "complete" ? <i className="bi bi-check2" /> : index + 1}
                  </span>
                  <span>{section}</span>
                </button>
              </li>
            );
          })}
          <li className={activeStep === reviewStepIndex ? "current" : ""}>
            <button
              id="wizard-review-button"
              type="button"
              onClick={() => activeStep === reviewStepIndex && goToStep(reviewStepIndex)}
              disabled={activeStep !== reviewStepIndex}
              aria-current={activeStep === reviewStepIndex ? "step" : undefined}
            >
              <span className="ss-survey-step-dot" aria-hidden="true">{reviewStepIndex + 1}</span>
              <span>Review</span>
            </button>
          </li>
        </ol>
      </nav>

      <div className="ss-survey-mobile-progress" aria-live="polite">
        <span>Step {activeStep + 1} of {totalSteps}</span>
        <strong>
          {activeStep === reviewStepIndex
            ? "Review and submit"
            : currentSectionEntry?.[0] || "Application"}
        </strong>
      </div>

      <div className="visually-hidden" aria-live="polite">{announcement}</div>

      {errorMessage && (
        <div className="alert ss-alert-error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {errorMessage}
        </div>
      )}

      <ResultAlert result={submitResult} />

      <div className="ss-survey-page">
        {activeStep < reviewStepIndex && currentSectionEntry ? (
          <WizardSection
            index={activeStep}
            title={currentSectionEntry[0]}
            questions={currentSectionEntry[1]}
            status={sectionStatuses[activeStep]}
            isActive
            answers={answers}
            errors={fieldErrors}
            onToggle={() => {}}
            onPrevious={() => goToStep(activeStep - 1)}
            onContinue={() => continueFromSection(activeStep, currentSectionEntry[1])}
            onAnswerChange={onAnswerChange}
            onMultiSelectChange={onMultiSelectChange}
          />
        ) : (
          <ReviewApplication
            stepNumber={reviewStepIndex + 1}
            totalSteps={totalSteps}
            isActive
            sectionEntries={sectionEntries}
            answers={answers}
            documents={documents || []}
            documentType="OTHER"
            submitting={submitting}
            onToggle={() => {}}
            onPrevious={() => goToStep(reviewStepIndex - 1)}
            onEditSection={goToStep}
            onFinalSubmitIntent={() => { finalSubmitIntentRef.current = true; }}
          />
        )}
      </div>
    </form>
  );
}

export default RegistrationWizard;
