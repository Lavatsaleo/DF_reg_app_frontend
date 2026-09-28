import { useEffect, useState } from "react";
import axios from "axios";
import ApplicationConfirmation from "../components/ApplicationConfirmation";
import ElectronicSignature from "../components/ElectronicSignature";
import FormProgress from "../components/FormProgress";
import RegistrationWizard from "../components/RegistrationWizard";
import { API_BASE_URL } from "../config/api";

const CONSENT_INFORMATION_QUESTION = {
  questionCode: "CONSENT_INFORMATION_READ",
  questionText: "I have read and understood this information",
  responseType: "BOOLEAN",
  required: true,
  options: ["Yes", "No"],
};

const CONSENT_PARTICIPATION_QUESTION = {
  questionCode: "REGISTRATION_CONSENT",
  questionText: "I agree to take part in this questionnaire",
  responseType: "BOOLEAN",
  required: true,
  options: ["Yes", "No"],
};

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
      editQuestionCode: "TRAINING_AVAILABILITY",
    };
  }

  const age = calculateAge(answers.DATE_OF_BIRTH);
  if (age !== null && (age < 18 || age > 33)) {
    return {
      title: "You do not meet the Physical Academy age requirement",
      message: "Physical Academy applicants must be between 18 and 33 years old at the time of application.",
      recommendation: "You can return to the pathway options to review other opportunities that may be available.",
      editQuestionCode: "DATE_OF_BIRTH",
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
      editQuestionCode: "EDUCATION_LEVEL",
    };
  }

  if (answers.HAS_DISABILITY === "No") {
    return {
      title: "You do not meet the Physical Academy eligibility requirement",
      message: "The Physical Academy is currently designed for applicants who identify as persons with disabilities.",
      recommendation: "Please return to the pathway options to review other Digital Futures opportunities.",
      editQuestionCode: "HAS_DISABILITY",
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
  const [juratConfirmed, setJuratConfirmed] = useState(() => Boolean(
    answers.CONSENT_VERSION || answers.CONSENT_INFORMATION_READ || answers.REGISTRATION_CONSENT
  ));
  const [consentDocument, setConsentDocument] = useState(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentLoadError, setConsentLoadError] = useState("");
  const [consentError, setConsentError] = useState("");
  const [juratError, setJuratError] = useState("");
  const sectionEntries = Object.entries(groupedQuestions);

  useEffect(() => {
    let active = true;

    async function loadConsent() {
      try {
        setConsentLoading(true);
        setConsentLoadError("");
        const response = await axios.get(`${API_BASE_URL}/api/consents/current`);
        if (active) setConsentDocument(response.data?.consent || null);
      } catch (error) {
        console.error("Failed to load consent form", error);
        if (active) setConsentLoadError("Unable to load the consent form. Please try again.");
      } finally {
        if (active) setConsentLoading(false);
      }
    }

    loadConsent();
    return () => { active = false; };
  }, []);

  function setHiddenAnswer(questionCode, value) {
    onAnswerChange({ questionCode }, value);
    setConsentError("");
    setJuratError("");
  }

  const consentRead = answers.CONSENT_INFORMATION_READ;
  const consentParticipate = answers.REGISTRATION_CONSENT;
  const consentDenied = consentRead === "No" || consentParticipate === "No";
  const juratRequired = answers.JURAT_REQUIRED === "Yes";
  const consentVersionMatches = Boolean(consentDocument?.version) && answers.CONSENT_VERSION === consentDocument.version;
  const applicantSignatureComplete = Boolean(answers.CONSENT_SIGNATURE_METHOD && answers.CONSENT_SIGNATURE_DATA);
  const applicantConsentFieldsComplete = Boolean(
    answers.CONSENT_NAME_ID_CODE &&
    answers.CONSENT_SIGNED_DATE &&
    applicantSignatureComplete
  );
  const juratCoreComplete = Boolean(
    answers.JURAT_INTERPRETER_NAME &&
    answers.JURAT_INTERPRETER_ADDRESS &&
    answers.JURAT_LANGUAGE &&
    answers.JURAT_SIGNATURE_METHOD &&
    answers.JURAT_INTERPRETER_SIGNATURE
  );
  const juratComplete = answers.JURAT_REQUIRED === "No" || Boolean(juratRequired && juratCoreComplete && answers.JURAT_DATE);
  const consentComplete = consentRead === "Yes" &&
    consentParticipate === "Yes" &&
    juratComplete &&
    applicantConsentFieldsComplete &&
    consentVersionMatches;
  const showJurat = !juratConfirmed && !consentComplete;
  const showConsent = !showJurat && (!consentComplete || editingConsent);
  const eligibilityBlock = consentComplete && !editingConsent ? getPhysicalEligibilityBlock(answers) : null;

  function continueFromJurat() {
    if (!answers.JURAT_REQUIRED) {
      setJuratError("Please indicate whether someone translated or explained this Application to you.");
      return;
    }

    if (juratRequired && !juratCoreComplete) {
      setJuratError("Please complete all Jurat interpreter details and the interpreter electronic signature.");
      return;
    }

    if (juratRequired && !answers.JURAT_DATE) {
      setHiddenAnswer("JURAT_DATE", localDateString());
    }

    setJuratConfirmed(true);
    setJuratError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continueFromConsent() {
    if (consentRead !== "Yes" || consentParticipate !== "Yes") {
      setConsentError("Consent is required before you can continue to the Application.");
      return;
    }

    if (!answers.CONSENT_NAME_ID_CODE) {
      setConsentError("Please enter your Name.");
      return;
    }

    if (!applicantSignatureComplete) {
      setConsentError("Please provide your electronic signature.");
      return;
    }

    setHiddenAnswer("CONSENT_VERSION", consentDocument.version);
    if (!answers.CONSENT_SIGNED_DATE) setHiddenAnswer("CONSENT_SIGNED_DATE", localDateString());
    setEditingConsent(false);
    setConsentError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  if (loadingQuestions || consentLoading) {
    return (
      <main id="main-content" tabIndex="-1" className="container py-5">
        <section className="ss-loading-card text-center" aria-live="polite">
          <div className="spinner-border" role="status" aria-hidden="true" />
          <h1>Loading {selectedPathway.title} Application...</h1>
          <p>Please wait while we prepare the Application and consent form.</p>
        </section>
      </main>
    );
  }

  if (consentLoadError || !consentDocument) {
    return (
      <main id="main-content" tabIndex="-1" className="container py-5">
        <section className="ss-section-card mx-auto" style={{ maxWidth: "800px" }}>
          <h1>Consent form unavailable</h1>
          <p>{consentLoadError || "The consent form could not be loaded."}</p>
          <button type="button" className="btn ss-btn-primary" onClick={() => window.location.reload()}>Try again</button>
        </section>
      </main>
    );
  }

  if (showJurat) {
    return (
      <main id="main-content" tabIndex="-1">
        <section className="ss-form-hero" aria-labelledby="jurat-title">
          <div className="container">
            <button type="button" className="btn ss-btn-outline mb-4" onClick={onBackToPathways}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> Back to pathways
            </button>
            <span className="ss-small-label light">Digital Futures Programme</span>
            <h1 id="jurat-title">Physical Academy Application</h1>
            <p>Before opening the consent form, please tell us whether the Application needs to be translated or explained to you.</p>
          </div>
        </section>

        <section className="container py-5">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-9">
              <article className="ss-section-card">
                <h2>{consentDocument.juratTitle}</h2>
                <p>{consentDocument.juratWhen}</p>
                <ConsentOption
                  question={{
                    questionCode: "JURAT_REQUIRED",
                    questionText: "Did you require someone to translate or explain this Application to you?",
                    options: ["Yes", "No"],
                  }}
                  value={answers.JURAT_REQUIRED}
                  onChange={onAnswerChange}
                />

                {juratRequired && (
                  <div className="border rounded-4 p-4 mb-4 bg-light">
                    <p className="fw-semibold">{consentDocument.juratClause}</p>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Interpreter name *</label>
                        <input className="form-control" type="text" value={answers.JURAT_INTERPRETER_NAME || ""} onChange={(event) => setHiddenAnswer("JURAT_INTERPRETER_NAME", event.target.value)} />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Interpreter address *</label>
                        <input className="form-control" type="text" value={answers.JURAT_INTERPRETER_ADDRESS || ""} onChange={(event) => setHiddenAnswer("JURAT_INTERPRETER_ADDRESS", event.target.value)} />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">Name of language / dialect *</label>
                        <input className="form-control" type="text" value={answers.JURAT_LANGUAGE || ""} onChange={(event) => setHiddenAnswer("JURAT_LANGUAGE", event.target.value)} />
                      </div>
                      <div className="col-12">
                        <ElectronicSignature
                          label="Signature of Interpreter"
                          method={answers.JURAT_SIGNATURE_METHOD || "DRAWN"}
                          value={answers.JURAT_INTERPRETER_SIGNATURE || ""}
                          onChange={(method, value) => {
                            setHiddenAnswer("JURAT_SIGNATURE_METHOD", method);
                            setHiddenAnswer("JURAT_INTERPRETER_SIGNATURE", value);
                          }}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Date *</label>
                        <input className="form-control" type="date" value={answers.JURAT_DATE || localDateString()} onChange={(event) => setHiddenAnswer("JURAT_DATE", event.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {juratError && <div className="alert ss-alert-error" role="alert">{juratError}</div>}

                {answers.JURAT_REQUIRED && (
                  <button type="button" className="btn ss-btn-primary" onClick={continueFromJurat}>
                    Continue to Consent <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                )}
              </article>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (showConsent) {
    return (
      <main id="main-content" tabIndex="-1">
        <section className="ss-form-hero" aria-labelledby="consent-title">
          <div className="container">
            <button
              type="button"
              className="btn ss-btn-outline mb-4"
              onClick={() => {
                setJuratConfirmed(false);
                setEditingConsent(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <i className="bi bi-arrow-left" aria-hidden="true" /> Back to Jurat
            </button>
            <span className="ss-small-label light">Digital Futures Programme</span>
            <h1 id="consent-title">Physical Academy Application</h1>
            <p>Please read the consent form carefully before signing and continuing to the Application.</p>
          </div>
        </section>

        <section className="container py-5">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-9">
              <article className="ss-section-card">
                <h2>{consentDocument.introductionTitle}</h2>
                {consentDocument.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

                <h2 className="h4 mt-4">{consentDocument.purposeTitle}</h2>
                {consentDocument.purpose.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {consentDocument.informationLinks.map((item) => (
                  <p key={item.url}>
                    {item.before}
                    <a href={item.url} target="_blank" rel="noreferrer">{item.label}</a>
                    {item.between}
                    <a href={item.secondUrl} target="_blank" rel="noreferrer">{item.secondLabel}</a>
                  </p>
                ))}

                <h2 className="h4 mt-4">{consentDocument.rightsTitle}</h2>
                <p>
                  {consentDocument.rights[0]}
                  <a href={consentDocument.speakUpUrl} target="_blank" rel="noreferrer">{consentDocument.speakUpUrl}</a>
                </p>

                <h2 className="h4 mt-4">{consentDocument.questionsTitle}</h2>
                {consentDocument.questions.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

                <hr className="my-4" />

                <h2>{consentDocument.consentTitle}</h2>
                <p>{consentDocument.consentIntro}</p>
                <ul>
                  {consentDocument.consentBullets.map((item) => <li key={item}>{item}</li>)}
                </ul>

                <ConsentOption question={CONSENT_INFORMATION_QUESTION} value={consentRead} onChange={onAnswerChange} />
                <ConsentOption question={CONSENT_PARTICIPATION_QUESTION} value={consentParticipate} onChange={onAnswerChange} />

                {consentDenied ? (
                  <div className="alert ss-alert-error" role="alert">
                    <h3 className="h5">Consent is required to continue</h3>
                    <p>We cannot continue with your Application unless you provide consent.</p>
                    <button type="button" className="btn ss-btn-primary" onClick={() => setEditingConsent(true)}>Edit consent</button>
                  </div>
                ) : consentRead === "Yes" && consentParticipate === "Yes" ? (
                  <div className="border-top pt-4 mt-4">
                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-8">
                        <label className="form-label fw-semibold">Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={answers.CONSENT_NAME_ID_CODE || ""}
                          onChange={(event) => setHiddenAnswer("CONSENT_NAME_ID_CODE", event.target.value)}
                          placeholder="Enter your name"
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold">Date *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={answers.CONSENT_SIGNED_DATE || localDateString()}
                          onChange={(event) => setHiddenAnswer("CONSENT_SIGNED_DATE", event.target.value)}
                        />
                      </div>
                    </div>

                    <ElectronicSignature
                      label="Signature (if applicable)"
                      method={answers.CONSENT_SIGNATURE_METHOD || "DRAWN"}
                      value={answers.CONSENT_SIGNATURE_DATA || ""}
                      onChange={(method, value) => {
                        setHiddenAnswer("CONSENT_SIGNATURE_METHOD", method);
                        setHiddenAnswer("CONSENT_SIGNATURE_DATA", value);
                      }}
                    />

                    {consentError && <div className="alert ss-alert-error mt-3" role="alert">{consentError}</div>}

                    <button type="button" className="btn ss-btn-primary mt-4" onClick={continueFromConsent}>
                      Continue to Application <i className="bi bi-arrow-right" aria-hidden="true" />
                    </button>
                  </div>
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

  if (eligibilityBlock) {
    return (
      <main id="main-content" tabIndex="-1" className="container py-5">
        <section className="ss-section-card mx-auto" style={{ maxWidth: "760px" }}>
          <span className="ss-small-label dark">Physical Academy eligibility</span>
          <h1>{eligibilityBlock.title}</h1>
          <p>{eligibilityBlock.message}</p>
          <div className="alert alert-info">{eligibilityBlock.recommendation}</div>
          <div className="d-flex flex-wrap gap-3">
            <button type="button" className="btn ss-btn-primary" onClick={onBackToPathways}>Choose another pathway</button>
            <button
              type="button"
              className="btn ss-btn-outline"
              onClick={() => {
                setHiddenAnswer(eligibilityBlock.editQuestionCode, "");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
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
              <button type="button" className="btn btn-sm ss-btn-outline" onClick={() => setEditingConsent(true)}>
                <i className="bi bi-pencil" aria-hidden="true" /> Review or edit consent
              </button>
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
              onAnswerChange={onAnswerChange}
              onMultiSelectChange={onMultiSelectChange}
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