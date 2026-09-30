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

function getStepperLabel(section) {
  const normalized = String(section || "").replace(/^Section\s+\d+\s*:\s*/i, "").trim();
  const labels = {
    "Training pathway selection": "Training",
    "Personal & contact details": "Personal details",
    "Personal and contact details": "Personal details",
    "Education": "Education",
    "Disability, accessibility & health": "Disability & support",
    "Disability, accessibility and health": "Disability & support",
    "Prior engagement with Sightsavers": "Prior engagement",
    "Motivation & training readiness": "Motivation",
    "Motivation and training readiness": "Motivation",
    "Access to device, internet and electricity": "Digital access",
  };

  return labels[normalized] || normalized;
}

// Source question codes and source sections remain unchanged for API submissions.
// Only the visual survey journey groups the initial checks into a single first page.
const INITIAL_ELIGIBILITY_CODES = [
  "TRAINING_AVAILABILITY",
  "DATE_OF_BIRTH",
  "EDUCATION_LEVEL",
  "EDUCATION_LEVEL_OTHER",
  "HAS_DISABILITY",
  "DISABILITY_TYPE",
  "OTHER_DISABILITY_TYPE",
];

function groupSurveyPages(groupedQuestions) {
  const allQuestions = Object.values(groupedQuestions).flat();
  const byCode = new Map(allQuestions.map((question) => [question.questionCode, question]));
  const firstPageQuestions = INITIAL_ELIGIBILITY_CODES
    .map((code) => byCode.get(code))
    .filter(Boolean);
  const firstPageCodes = new Set(firstPageQuestions.map((question) => question.questionCode));
  const remainingPages = Object.entries(groupedQuestions)
    .filter(([section]) => section !== "Jurat / Interpreter")
    .map(([section, questions]) => [
      section,
      questions.filter((question) => !firstPageCodes.has(question.questionCode)),
    ])
    .filter(([, questions]) => questions.length > 0);

  return firstPageQuestions.length > 0
    ? [["Eligibility check", firstPageQuestions], ...remainingPages]
    : remainingPages;
}

function calculateAge(dateOfBirth) {
  const match = String(dateOfBirth || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > new Date()
  ) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) age -= 1;

  return age;
}

function getEarlyEligibilityFeedback(answers, selectedPathway, questions) {
  const availability = answers.TRAINING_AVAILABILITY;
  const isEntrepreneurship = selectedPathway?.id === "DIGITAL_ENTREPRENEURSHIP";

  if (isEntrepreneurship && availability === "No") {
    return {
      type: "not-eligible",
      title: "You do not meet this pathway's availability requirement.",
      message:
        "Digital Entrepreneurship requires at least 5 hours of study per week for 3 months. You can change your answer if it was entered incorrectly.",
    };
  }

  const birthDateQuestion = questions.find((question) => question.questionCode === "DATE_OF_BIRTH");
  const age = calculateAge(answers.DATE_OF_BIRTH);

  if (birthDateQuestion && age !== null) {
    const min = Number(birthDateQuestion.metadata?.minEligibleAge || 18);
    const max = Number(birthDateQuestion.metadata?.maxEligibleAge || 35);

    if (age < min || age > max) {
      return {
        type: "review",
        title: "Your age needs programme review.",
        message: `This pathway lists ages ${min}–${max}. You may continue, but your application will be flagged for programme review rather than automatically rejected.`,
      };
    }
  }

  if (!isEntrepreneurship && availability === "No") {
    return {
      type: "information",
      title: "Please confirm your training availability.",
      message:
        "This pathway involves nine months of residential training. Check your availability answer before continuing.",
    };
  }

  return null;
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
  onNavigateStep,
  onBackStep,
}) {
  const sectionEntries = useMemo(
    () => groupSurveyPages(groupedQuestions),
    [groupedQuestions]
  );
  const reviewStepIndex = sectionEntries.length;
  const totalSteps = sectionEntries.length + 1;
  const activeStep = Math.max(0, Math.min(Number(currentStep) || 0, reviewStepIndex));
  const [announcement, setAnnouncement] = useState("Start with the first section of the application form.");
  const finalSubmitIntentRef = useRef(false);
  const pendingInvalidFocusRef = useRef(false);
  const reviewErrorFocusRef = useRef(false);

  useEffect(() => {
    const errorCodes = Object.keys(fieldErrors || {});
    if (errorCodes.length === 0 || sectionEntries.length === 0) return;

    const firstErrorSectionIndex = sectionEntries.findIndex(([, questions]) =>
      questions.some((question) => errorCodes.includes(question.questionCode))
    );

    if (firstErrorSectionIndex >= 0 && activeStep === reviewStepIndex) {
      reviewErrorFocusRef.current = true;
      if (onNavigateStep) onNavigateStep(firstErrorSectionIndex);
      else onStepChange?.(firstErrorSectionIndex);
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
  }, [activeStep, fieldErrors, onNavigateStep, onStepChange, reviewStepIndex, sectionEntries]);

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
    if (onNavigateStep) onNavigateStep(nextStep);
    else onStepChange?.(nextStep);

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
  const earlyEligibilityFeedback =
    activeStep === 0 && currentSectionEntry?.[0] === "Eligibility check"
      ? getEarlyEligibilityFeedback(answers, selectedPathway, currentSectionEntry[1])
      : null;

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
        <ol style={{ "--df-step-count": totalSteps }}>
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
                  <span title={section}>{getStepperLabel(section)}</span>
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
        {earlyEligibilityFeedback && (
          <div
            className={`ss-early-eligibility ${earlyEligibilityFeedback.type}`}
            role={earlyEligibilityFeedback.type === "not-eligible" ? "alert" : "status"}
            aria-live="polite"
          >
            <i
              className={`bi ${earlyEligibilityFeedback.type === "not-eligible" ? "bi-exclamation-circle" : "bi-info-circle"}`}
              aria-hidden="true"
            />
            <div>
              <strong>{earlyEligibilityFeedback.title}</strong>
              <p>{earlyEligibilityFeedback.message}</p>
            </div>
          </div>
        )}
        {activeStep < reviewStepIndex && currentSectionEntry ? (
          <WizardSection
            index={activeStep}
            title={currentSectionEntry[0]}
            questions={currentSectionEntry[1]}
            status={sectionStatuses[activeStep]}
            isActive
            answers={answers}
            errors={fieldErrors}
            onPrevious={() => onBackStep ? onBackStep() : goToStep(activeStep - 1)}
            onContinue={() => continueFromSection(activeStep, currentSectionEntry[1])}
            disableContinue={earlyEligibilityFeedback?.type === "not-eligible"}
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
            onPrevious={() => onBackStep ? onBackStep() : goToStep(reviewStepIndex - 1)}
            onEditSection={goToStep}
            onFinalSubmitIntent={() => { finalSubmitIntentRef.current = true; }}
          />
        )}
      </div>
    </form>
  );
}

export default RegistrationWizard;
