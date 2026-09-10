import { useEffect, useState } from "react";
import axios from "axios";
import ApplicationConfirmation from "../components/ApplicationConfirmation";
import ElectronicSignature from "../components/ElectronicSignature";
import FormProgress from "../components/FormProgress";
import RegistrationWizard from "../components/RegistrationWizard";
import RightsContactsPanel from "../components/RightsContactsPanel";
import { API_BASE_URL } from "../config/api";
import {
  buildContactSnapshot,
  getConsentContactCountries,
  requestProgrammeCountry,
} from "../utils/countryContext";

const CONSENT_INFORMATION_QUESTION = {
  questionCode: "CONSENT_INFORMATION_READ",
  questionText: "I have read and understood this information",
  options: ["Yes", "No"],
};

const CONSENT_PARTICIPATION_QUESTION = {
  questionCode: "REGISTRATION_CONSENT",
  questionText: "I agree to take part in this questionnaire",
  options: ["Yes", "No"],
};

const PATHWAY_RULES = {
  PHYSICAL_ACADEMY: {
    duration: "9 months",
    label: "9-month Physical Academy",
    allowedEducation: ["Bachelor’s degree", "Postgraduate"],
    educationMessage: "The Physical Academy requires a completed Bachelor’s degree or Postgraduate qualification.",
    educationRecommendation: "Please return to the pathway options to explore another Digital Futures pathway that may better match your profile.",
  },
  VIRTUAL_ACADEMY: {
    duration: "4 months",
    label: "4-month Virtual Academy",
    allowedEducation: ["Diploma", "Bachelor’s degree", "Postgraduate"],
    educationMessage: "The Virtual Academy requires a completed Diploma, Bachelor’s degree or Postgraduate qualification.",
    educationRecommendation: "Please return to the pathway options to explore another Digital Futures pathway that may better match your profile.",
  },
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

function getPathwayEligibilityBlock(answers, selectedPathway) {
  const rule = PATHWAY_RULES[selectedPathway?.id] || PATHWAY_RULES.PHYSICAL_ACADEMY;

  if (answers.TRAINING_AVAILABILITY === "No") {
    return {
      title: `${selectedPathway.title} may not be the right pathway for you`,
      message: `${selectedPathway.title} requires full availability for the entire ${rule.duration} training period.`,
      recommendation: "Please return to the pathway options and explore another Digital Futures pathway that may better match your availability.",
      editQuestionCode: "TRAINING_AVAILABILITY",
    };
  }

  const age = calculateAge(answers.DATE_OF_BIRTH);
  if (age !== null && (age < 18 || age > 33)) {
    return {
      title: `You do not meet the ${selectedPathway.title} age requirement`,
      message: "Applicants must be between 18 and 33 years old at the time of application.",
      recommendation: "You can return to the pathway options to review other opportunities that may be available.",
      editQuestionCode: "DATE_OF_BIRTH",
    };
  }

  if (answers.EDUCATION_LEVEL && !rule.allowedEducation.includes(answers.EDUCATION_LEVEL)) {
    const recommendation = selectedPathway.id === "PHYSICAL_ACADEMY" && answers.EDUCATION_LEVEL === "Diploma"
      ? "Based on your education level, you may wish to explore the Virtual Academy."
      : rule.educationRecommendation;

    return {
      title: `You do not meet the ${selectedPathway.title} education requirement`,
      message: rule.educationMessage,
      recommendation,
      editQuestionCode: "EDUCATION_LEVEL",
    };
  }

  if (answers.HAS_DISABILITY === "No") {
    return {
      title: `You do not meet the ${selectedPathway.title} eligibility requirement`,
      message: `${selectedPathway.title} is currently designed for applicants who identify as people with disabilities.`,
      recommendation: "Please return to the pathway options to review other Digital Futures opportunities.",
      editQuestionCode: "HAS_DISABILITY",
    };
  }

  return null;
}

function formatJuratClause(template, answers) {
  return String(template || "")
    .replace("[name]", answers.JURAT_INTERPRETER_NAME?.trim() || "[name]")
    .replace("[address]", answers.JURAT_INTERPRETER_ADDRESS?.trim() || "[address]")
    .replace("[name of language]", answers.JURAT_LANGUAGE?.trim() || "[name of language]");
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

function ContactValue({ value }) {
  const text = String(value || "To be confirmed");
  return text.includes("@") ? <a href={`mailto:${text}`}>{text}</a> : <span>{text}</span>;
}

function ConsentCountryContacts({ consent, detectedCountry, type }) {
  const countries = getConsentContactCountries({ detectedCountry });
  const contacts = buildContactSnapshot(consent, countries);
  const isSafeguarding = type === "safeguarding";

  return (
    <div className="border rounded-4 p-3 mb-4 bg-light">
      {contacts.map((row) => (
        <div key={`${type}-${row.country}`} className="mb-2">
          <strong>{row.country}: </strong>
          <ContactValue value={isSafeguarding ? row.safeguarding : row.questions} />
        </div>
      ))}
    </div>
  );
}

function ContextualApplicationPage({
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
  const [entryStage, setEntryStage] = useState("consent");
  const [editingConsent, setEditingConsent] = useState(false);
  const [consentDocument, setConsentDocument] = useState(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentLoadError, setConsentLoadError] = useState("");
  const [entryError, setEntryError] = useState("");
  const [detectedCountry, setDetectedCountry] = useState("");
  const [locationStatus, setLocationStatus] = useState("checking");
  const sectionEntries = Object.entries(groupedQuestions);

  useEffect(() => {
    let active = true;

    async function loadConsent() {
      try {
        setConsentLoading(true);
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

  useEffect(() => {
    let active = true;
    requestProgrammeCountry().then((result) => {
      if (!active) return;
      setDetectedCountry(result.country || "");
      setLocationStatus(result.status || "unavailable");
    });
    return () => { active = false; };
  }, []);

  function setHiddenAnswer(questionCode, value) {
    onAnswerChange({ questionCode }, value);
    setEntryError("");
  }

  const juratRequired = answers.JURAT_REQUIRED === "Yes";
  const juratCoreComplete = Boolean(
    answers.JURAT_INTERPRETER_NAME &&
    answers.JURAT_INTERPRETER_ADDRESS &&
    answers.JURAT_LANGUAGE &&
    answers.JURAT_SIGNATURE_METHOD &&
    answers.JURAT_INTERPRETER_SIGNATURE
  );
  const juratComplete = answers.JURAT_REQUIRED === "No" || Boolean(juratRequired && juratCoreComplete && answers.JURAT_DATE);

  const consentRead = answers.CONSENT_INFORMATION_READ;
  const consentParticipate = answers.REGISTRATION_CONSENT;
  const consentDenied = consentRead === "No" || consentParticipate === "No";
  const applicantSignatureComplete = Boolean(answers.CONSENT_SIGNATURE_METHOD && answers.CONSENT_SIGNATURE_DATA);
  const applicantConsentFieldsComplete = Boolean(
    answers.CONSENT_NAME_ID_CODE &&
    answers.CONSENT_SIGNED_DATE &&
    applicantSignatureComplete
  );
  const consentVersionMatches = Boolean(consentDocument?.version) && answers.CONSENT_VERSION === consentDocument.version;
  const consentComplete = juratComplete &&
    consentRead === "Yes" &&
    consentParticipate === "Yes" &&
    applicantConsentFieldsComplete &&
    consentVersionMatches;

  const residenceCountry = answers.COUNTRY || "";
  const consentContactCountries = consentDocument
    ? getConsentContactCountries({ detectedCountry })
    : [];
  const eligibilityBlock = consentComplete ? getPathwayEligibilityBlock(answers, selectedPathway) : null;

  function continueFromConsent() {
    if (consentRead !== "Yes" || consentParticipate !== "Yes") {
      setEntryError("Consent is required before you can continue to the Application.");
      return;
    }

    if (!answers.CONSENT_NAME_ID_CODE) {
      setEntryError("Please enter your Name.");
      return;
    }

    if (!applicantSignatureComplete) {
      setEntryError("Please provide your electronic signature.");
      return;
    }

    const signedDate = answers.CONSENT_SIGNED_DATE || localDateString();
    const contextCountry = detectedCountry || "ALL";
    const snapshot = buildContactSnapshot(consentDocument, consentContactCountries);

    setHiddenAnswer("CONSENT_VERSION", consentDocument.version);
    setHiddenAnswer("CONSENT_SIGNED_DATE", signedDate);
    setHiddenAnswer("CONSENT_DETECTED_COUNTRY", detectedCountry || "Undetermined");
    setHiddenAnswer("CONSENT_CONTACT_CONTEXT", contextCountry);
    setHiddenAnswer("CONSENT_CONTACTS_AT_SIGNING", JSON.stringify(snapshot));
    setEntryStage("jurat");
    setEntryError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continueFromJurat() {
    if (!answers.JURAT_REQUIRED) {
      setEntryError("Please indicate whether someone translated or explained this Application to you.");
      return;
    }

    if (juratRequired && !juratCoreComplete) {
      setEntryError("Please complete the interpreter details and electronic signature before continuing.");
      return;
    }

    if (juratRequired && !answers.JURAT_DATE) {
      setHiddenAnswer("JURAT_DATE", localDateString());
    }

    setEditingConsent(false);
    setEntryError("");
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
          <h1>Loading {selectedPathway.title} application...</h1>
          <p>Please wait while we prepare the Application.</p>
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

  if (!consentComplete || editingConsent) {
    const showJurat = entryStage === "jurat";

    return (
      <main id="main-content" tabIndex="-1">
        <section className="ss-form-hero">
          <div className="container">
            <button type="button" className="btn ss-btn-outline mb-4" onClick={onBackToPathways}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> Back to pathways
            </button>
            <span className="ss-small-label light">Digital Futures Programme</span>
            <h1>{selectedPathway.title} application</h1>
            <p>{showJurat ? "Consent is complete. Please tell us whether the Application was translated or explained to you." : "Please read the consent information carefully before signing."}</p>
          </div>
        </section>

        <section className="container py-5">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-9">
              {showJurat ? (
                <article className="ss-section-card">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
                    <div>
                      <span className="ss-small-label dark">Step 2 of 2 · Jurat</span>
                      <h2 className="mt-2">{consentDocument.juratTitle}</h2>
                    </div>
                    <button type="button" className="btn btn-sm ss-btn-outline" onClick={() => { setEntryStage("consent"); setEntryError(""); }}>
                      Back to consent
                    </button>
                  </div>
                  <p>{consentDocument.juratWhen}</p>
                  <ConsentOption
                    question={{ questionCode: "JURAT_REQUIRED", questionText: "Did you require someone to translate or explain this Application to you?", options: ["Yes", "No"] }}
                    value={answers.JURAT_REQUIRED}
                    onChange={onAnswerChange}
                  />

                  {juratRequired && (
                    <div className="border rounded-4 p-4 mb-4 bg-light">
                      <p className="fw-semibold">{formatJuratClause(consentDocument.juratClause, answers)}</p>
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
                            label="Signature of interpreter"
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

                  {entryError && <div className="alert ss-alert-error" role="alert">{entryError}</div>}
                  <button type="button" className="btn ss-btn-primary" onClick={continueFromJurat}>
                    Continue to Application <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                </article>
              ) : (
                <article className="ss-section-card">
                  <div className="mb-4">
                    <span className="ss-small-label dark">Step 1 of 2 · Consent</span>
                    <h2 className="mt-2">{consentDocument.introductionTitle}</h2>
                  </div>

                  {locationStatus === "checking" && (
                    <div className="alert alert-info">
                      We are checking your current country so the relevant safeguarding and application contacts can be shown. If your location cannot be confirmed, contacts for all programme countries will be displayed.
                    </div>
                  )}

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
                  <p>{consentDocument.rightsIntro}</p>
                  <ConsentCountryContacts consent={consentDocument} detectedCountry={detectedCountry} type="safeguarding" />
                  <p>
                    {consentDocument.speakUpPrefix}
                    <a href={consentDocument.speakUpUrl} target="_blank" rel="noreferrer">{consentDocument.speakUpUrl}</a>
                  </p>

                  <h2 className="h4 mt-4">{consentDocument.questionsTitle}</h2>
                  <p>{consentDocument.questionsIntro}</p>
                  <ConsentCountryContacts consent={consentDocument} detectedCountry={detectedCountry} type="questions" />

                  {locationStatus !== "checking" && locationStatus !== "detected" && (
                    <div className="alert alert-info">
                      We could not confirm a programme country from your current location, so contacts for all four programme countries are shown.
                    </div>
                  )}

                  <hr className="my-4" />
                  <h2>{consentDocument.consentTitle}</h2>
                  <p>{consentDocument.consentIntro}</p>
                  <ul>{consentDocument.consentBullets.map((item) => <li key={item}>{item}</li>)}</ul>

                  <ConsentOption question={CONSENT_INFORMATION_QUESTION} value={consentRead} onChange={onAnswerChange} />
                  <ConsentOption question={CONSENT_PARTICIPATION_QUESTION} value={consentParticipate} onChange={onAnswerChange} />

                  {consentDenied ? (
                    <div className="alert ss-alert-error" role="alert">
                      <h3 className="h5">Consent is required to continue</h3>
                      <p>We cannot continue with your Application unless you provide consent. You can edit your answer if No was selected by mistake.</p>
                    </div>
                  ) : consentRead === "Yes" && consentParticipate === "Yes" ? (
                    <div className="border-top pt-4 mt-4">
                      <div className="row g-3 mb-3">
                        <div className="col-12 col-md-8">
                          <label className="form-label fw-semibold">Name *</label>
                          <input type="text" className="form-control" value={answers.CONSENT_NAME_ID_CODE || ""} onChange={(event) => setHiddenAnswer("CONSENT_NAME_ID_CODE", event.target.value)} placeholder="Enter your name" />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label fw-semibold">Date *</label>
                          <input type="date" className="form-control" value={answers.CONSENT_SIGNED_DATE || localDateString()} onChange={(event) => setHiddenAnswer("CONSENT_SIGNED_DATE", event.target.value)} />
                        </div>
                      </div>

                      <ElectronicSignature
                        label="Electronic signature *"
                        method={answers.CONSENT_SIGNATURE_METHOD || "DRAWN"}
                        value={answers.CONSENT_SIGNATURE_DATA || ""}
                        onChange={(method, value) => {
                          setHiddenAnswer("CONSENT_SIGNATURE_METHOD", method);
                          setHiddenAnswer("CONSENT_SIGNATURE_DATA", value);
                        }}
                      />

                      {entryError && <div className="alert ss-alert-error mt-3" role="alert">{entryError}</div>}
                      <button type="button" className="btn ss-btn-primary mt-4" onClick={continueFromConsent}>
                        Continue to Jurat <i className="bi bi-arrow-right" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-muted mb-0">Please answer both consent questions to continue.</p>
                  )}
                </article>
              )}
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
          <span className="ss-small-label dark">{selectedPathway.title} eligibility</span>
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

  const pathwayRule = PATHWAY_RULES[selectedPathway.id] || PATHWAY_RULES.PHYSICAL_ACADEMY;

  return (
    <main id="main-content" tabIndex="-1">
      <section className="ss-form-hero" aria-labelledby="application-title">
        <div className="container-fluid px-3 px-xl-5">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-8">
              <button type="button" className="btn ss-btn-outline mb-4" onClick={onBackToPathways}>
                <i className="bi bi-arrow-left" aria-hidden="true" /> Back to pathways
              </button>
              <span className="ss-small-label light">Digital Futures Participant Application</span>
              <h1 id="application-title">{selectedPathway.title} application</h1>
              <p>Complete the required fields carefully. Eligibility is checked as you progress through the Application.</p>
              <button
                type="button"
                className="btn btn-sm ss-btn-outline"
                onClick={() => {
                  setEditingConsent(true);
                  setEntryStage("consent");
                }}
              >
                <i className="bi bi-pencil" aria-hidden="true" /> Review consent and Jurat
              </button>
            </div>
            <div className="col-12 col-lg-4">
              <div className="ss-selected-card">
                <span>Selected pathway</span>
                <strong>{selectedPathway.title}</strong>
                <small>{pathwayRule.label}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-fluid px-3 px-xl-5 py-5">
        <div className="row g-4 align-items-start">
          <div className="col-12 col-xl-3 order-1">
            <div className="position-sticky" style={{ top: "120px" }}>
              <RightsContactsPanel
                consent={consentDocument}
                residenceCountry={residenceCountry}
              />
            </div>
          </div>

          <div className="col-12 col-xl-6 order-2">
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

          <div className="col-12 col-xl-3 order-3">
            <div className="position-sticky" style={{ top: "120px" }}>
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

export default ContextualApplicationPage;
