import { useState } from "react";
import ApplicationConfirmation from "../components/ApplicationConfirmation";
import FormProgress from "../components/FormProgress";
import RegistrationWizard from "../components/RegistrationWizard";

const CONSENT_INFORMATION_QUESTION = {
  questionCode: "CONSENT_INFORMATION_READ",
  questionText: "I have read and understood this information.",
  responseType: "BOOLEAN",
  required: true,
  options: ["Yes", "No"],
};

const CONSENT_PARTICIPATION_QUESTION = {
  questionCode: "REGISTRATION_CONSENT",
  questionText: "I agree to take part in this questionnaire.",
  responseType: "BOOLEAN",
  required: true,
  options: ["Yes", "No"],
};

function calculateAge(dateValue) {
  if (!dateValue) return null;
  const dob = new Date(dateValue);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

function getPhysicalEligibilityBlock(answers) {
  if (answers.TRAINING_AVAILABILITY === "No") {
    return {
      title: "The Physical Academy may not be the right pathway for you",
      message: "The Physical Academy requires full availability for the entire 9-month training period.",
      recommendation: "Please return to the pathway options and explore another Digital Futures pathway that may better match your availability.",
    };
  }

  const age = calculateAge(answers.DATE_OF_BIRTH);
  if (age !== null && (age < 18 || age > 33)) {
    return {
      title: "You do not meet the Physical Academy age requirement",
      message: "Physical Academy applicants must be between 18 and 33 years old at the time of application.",
      recommendation: "You can return to the pathway options to review other opportunities that may be available.",
    };
  }

  if (answers.EDUCATION_LEVEL && !["Bachelor’s degree", "Postgraduate"].includes(answers.EDUCATION_LEVEL)) {
    const recommendation = answers.EDUCATION_LEVEL === "Diploma"
      ? "Based on your education level, you may wish to explore the Virtual Academy when applications are available."
      : "Please return to the pathway options to explore another Digital Futures pathway that may better match your profile.";

    return {
      title: "You do not meet the Physical Academy education requirement",
      message: "The Physical Academy requires a completed Bachelor’s degree or Postgraduate qualification.",
      recommendation,
    };
  }

  if (answers.HAS_DISABILITY === "No") {
    return {
      title: "You do not meet the Physical Academy eligibility requirement",
      message: "The Physical Academy is currently designed for applicants who identify as persons with disabilities.",
      recommendation: "Please return to the pathway options to review other Digital Futures opportunities.",
    };
  }

  return null;
}

function ConsentOption({ question, value, onChange }) {
  return (
    <fieldset className="border-0 p-0 mb-4">
      <legend className="fs-6 fw-semibold mb-3">{question.questionText}</legend>
      <div className="d-flex flex-wrap gap-3">
        {question.options.map((option) => (
          <label key={option} className={`ss-option-pill ${value === option ? "selected" : ""}`}>
            <input
              type="radio"
              name={question.questionCode}
              value={option}
              checked={value === option}
              onChange={() => onChange(question, option)}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RegistrationPage({
  selectedPathway,
  groupedQuestions,
  answers,
  documents,
  documentType,
  loadingQuestions,
  submitting,
  submitResult,
  errorMessage,
  fieldErrors,
  formProgress,
  draftLastSavedAt,
  draftReference,
  draftSaveStatus,
  draftSaveMessage,
  currentStep,
  onBackToPathways,
  onCheckStatus,
  onTakeSkillsTest,
  onAnswerChange,
  onMultiSelectChange,
  onSubmit,
  onValidateQuestions,
  onDocumentsChange,
  onDocumentTypeChange,
  onClearDraft,
  onStepChange,
}) {
  const [editingConsent, setEditingConsent] = useState(false);
  const [editingEligibility, setEditingEligibility] = useState(false);
  const sectionEntries = Object.entries(groupedQuestions);
  const consentRead = answers.CONSENT_INFORMATION_READ;
  const consentParticipate = answers.REGISTRATION_CONSENT;
  const consentDenied = consentRead === "No" || consentParticipate === "No";
  const consentComplete = consentRead === "Yes" && consentParticipate === "Yes";
  const showConsent = !consentComplete || editingConsent;
  const eligibilityBlock = consentComplete ? getPhysicalEligibilityBlock(answers) : null;

  function handleApplicationAnswerChange(question, value) {
    setEditingEligibility(false);
    onAnswerChange(question, value);
  }

  function handleApplicationMultiSelectChange(question, option) {
    setEditingEligibility(false);
    onMultiSelectChange(question, option);
  }

  if (submitResult) {
    return (
      <ApplicationConfirmation
        result={submitResult}
        selectedPathway={selectedPathway}
        onStartNewApplication={onBackToPathways}
        onCheckStatus={onCheckStatus}
        onTakeSkillsTest={onTakeSkillsTest}
      />
    );
  }

  if (loadingQuestions) {
    return (
      <main id="main-content" tabIndex="-1" className="container py-5">
        <section className="ss-loading-card text-center" aria-live="polite">
          <div className="spinner-border" role="status" aria-hidden="true" />
          <h1>Loading {selectedPathway.title} Application...</h1>
          <p>Please wait while we prepare the application.</p>
        </section>
      </main>
    );
  }

  if (showConsent) {
    return (
      <main id="main-content" tabIndex="-1">
        <section className="ss-form-hero" aria-labelledby="consent-title">
          <div className="container">
            <button type="button" className="btn ss-btn-outline mb-4" onClick={onBackToPathways}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> Back to pathways
            </button>
            <span className="ss-small-label light">Digital Futures Programme</span>
            <h1 id="consent-title">Physical Academy Application</h1>
            <p>Please read the participant information and provide consent before starting the Application.</p>
          </div>
        </section>

        <section className="container py-5">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-9">
              <article className="ss-section-card">
                <span className="ss-small-label dark">Introduction and consent</span>
                <h2>About this Application</h2>
                <p>
                  The Digital Futures programme collects and analyses participants’ information to improve programme activities and ensure they have a positive impact. Sightsavers values your privacy and is committed to protecting your personal data.
                </p>
                <p>
                  We will collect your data for eligibility assessment, selection into the programme and feedback for programme improvement. This may include your name, location, age, sex, contact details and other relevant information. There is no payment or application fee. Your information will be kept private, secure and shared only with approved project partners and data processors.
                </p>
                <p>
                  Taking part is voluntary. You may ask us to delete your information at any time. You have the right to access, correct, delete, restrict or object to the use of your personal data, or request its transfer.
                </p>
                <p>
                  If you have safeguarding concerns, please contact the relevant Country Safeguarding Lead or use the Sightsavers Speak Up platform. For questions about the Application, contact the relevant MEL or Programme Manager.
                </p>

                <div className="alert alert-light border mt-4">
                  <strong>By proceeding, you confirm that:</strong>
                  <ul className="mb-0 mt-2">
                    <li>you have read and understood this information, or had it explained to you;</li>
                    <li>you have had the opportunity to ask questions;</li>
                    <li>you understand that taking part is voluntary and you may stop at any time; and</li>
                    <li>you agree to take part in the Application.</li>
                  </ul>
                </div>

                <ConsentOption question={CONSENT_INFORMATION_QUESTION} value={consentRead} onChange={onAnswerChange} />
                <ConsentOption question={CONSENT_PARTICIPATION_QUESTION} value={consentParticipate} onChange={onAnswerChange} />

                {consentDenied ? (
                  <div className="alert ss-alert-error" role="alert">
                    <h3 className="h5">Consent is required to continue</h3>
                    <p className="mb-3">We cannot continue with your Application unless you provide consent.</p>
                    <button type="button" className="btn ss-btn-primary" onClick={() => setEditingConsent(true)}>
                      Edit consent
                    </button>
                  </div>
                ) : consentComplete ? (
                  <button type="button" className="btn ss-btn-primary" onClick={() => setEditingConsent(false)}>
                    Continue to Application <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                ) : (
                  <p className="text-muted mb-0">Please answer both consent questions to continue.</p>
                )}
              </article>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (eligibilityBlock && !editingEligibility) {
    return (
      <main id="main-content" tabIndex="-1" className="container py-5">
        <section className="ss-section-card mx-auto" style={{ maxWidth: "760px" }}>
          <span className="ss-small-label dark">Physical Academy eligibility</span>
          <h1>{eligibilityBlock.title}</h1>
          <p>{eligibilityBlock.message}</p>
          <div className="alert alert-info">{eligibilityBlock.recommendation}</div>
          <div className="d-flex flex-wrap gap-3">
            <button type="button" className="btn ss-btn-primary" onClick={onBackToPathways}>
              Choose another pathway
            </button>
            <button type="button" className="btn ss-btn-outline" onClick={() => setEditingEligibility(true)}>
              Edit my answer
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex="-1">
      <section className="ss-form-hero" aria-labelledby="application-title">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-8">
              <button type="button" className="btn ss-btn-outline mb-4" onClick={onBackToPathways}>
                <i className="bi bi-arrow-left" aria-hidden="true" /> Back to pathways
              </button>
              <span className="ss-small-label light">Digital Futures Participant Application</span>
              <h1 id="application-title">{selectedPathway.title} Application</h1>
              <p>Complete the required fields carefully. Eligibility is checked as you progress through the Application.</p>
            </div>

            <div className="col-12 col-lg-4">
              <div className="ss-selected-card" aria-label={`Selected pathway is ${selectedPathway.title}`}>
                <span>Selected pathway</span>
                <strong>{selectedPathway.title}</strong>
                <small>9-month Physical Academy</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="row g-4 align-items-start">
          <div className="col-12 col-xl-8">
            <RegistrationWizard
              selectedPathway={selectedPathway}
              groupedQuestions={groupedQuestions}
              answers={answers}
              documents={documents}
              documentType={documentType}
              submitting={submitting}
              submitResult={submitResult}
              errorMessage={errorMessage}
              fieldErrors={fieldErrors}
              formProgress={formProgress}
              draftLastSavedAt={draftLastSavedAt}
              draftReference={draftReference}
              draftSaveStatus={draftSaveStatus}
              draftSaveMessage={draftSaveMessage}
              currentStep={currentStep}
              onAnswerChange={handleApplicationAnswerChange}
              onMultiSelectChange={handleApplicationMultiSelectChange}
              onSubmit={onSubmit}
              onValidateQuestions={onValidateQuestions}
              onDocumentsChange={onDocumentsChange}
              onDocumentTypeChange={onDocumentTypeChange}
              onClearDraft={onClearDraft}
              onStepChange={onStepChange}
            />
          </div>

          <div className="col-12 col-xl-4">
            <div className="ss-sticky-panel">
              <FormProgress progress={formProgress} sectionCount={sectionEntries.length} submitting={submitting} />

              <div className="ss-help-card mt-4">
                <span className="ss-small-label dark">Submit only once</span>
                <p className="mb-0">Do not create another Application using the same email address or phone number.</p>
              </div>

              <div className="ss-help-card mt-4">
                <span className="ss-small-label dark">Need help?</span>
                <p className="mb-0">Use the accessibility tools above to increase text size, switch contrast, reduce movement or read the page aloud.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default RegistrationPage;
