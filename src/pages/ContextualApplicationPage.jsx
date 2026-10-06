import { useEffect, useRef, useState } from "react";
import { selectChoiceOnEnter } from "../utils/formUtils";
import axios from "axios";
import "./CountrySelection.css";
import ApplicationConfirmation from "../components/ApplicationConfirmation";
import ElectronicSignature from "../components/ElectronicSignature";
import RegistrationWizard from "../components/RegistrationWizard";
import RightsContactsPanel from "../components/RightsContactsPanel";
import { API_BASE_URL } from "../config/api";
import {
  PROGRAMME_COUNTRIES,
  buildContactSnapshot,
  getConsentContactCountries,
} from "../utils/countryContext";

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameOption(value, expected) {
  return String(value || "").trim().toLowerCase() === String(expected || "").trim().toLowerCase();
}

function containsOther(value) {
  if (Array.isArray(value)) {
    return value.some((item) => String(item || "").toLowerCase().startsWith("other"));
  }
  return String(value || "").toLowerCase().startsWith("other");
}

function getApplicationFlowState() {
  return window.history.state?.digitalFuturesApplicationFlow || null;
}

function writeApplicationFlowState(pathwayId, phase, step = 0, mode = "push") {
  const currentState = window.history.state && typeof window.history.state === "object"
    ? window.history.state
    : {};
  const nextState = {
    ...currentState,
    digitalFutures: true,
    digitalFuturesApplicationFlow: {
      pathwayId,
      phase,
      step: Math.max(0, Number(step) || 0),
    },
  };

  if (mode === "replace") {
    window.history.replaceState(nextState, "", window.location.href);
  } else {
    window.history.pushState(nextState, "", window.location.href);
  }
}

function ConsentOption({ questionCode, questionText, options, value, onChange }) {
  return (
    <fieldset className="border-0 p-0 mb-4">
      <legend className="fs-6 fw-semibold mb-3">{questionText}</legend>
      <div className="d-grid gap-2">
        {(options || []).map((option, index) => {
          const id = `${questionCode}-${index}`;
          return (
            <label key={option} htmlFor={id} className={`ss-option-pill ${value === option ? "selected" : ""}`}>
              <input
                id={id}
                type="radio"
                name={questionCode}
                value={option}
                checked={value === option}
                onChange={() => onChange({ questionCode }, option)}
              />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function MultiSelectOptions({ questionCode, options, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];

  return (
    <div className="ss-checkbox-list" role="group">
      {(options || []).map((option, index) => {
        const id = `${questionCode}-${index}`;
        return (
          <label key={option} htmlFor={id} className="ss-checkbox-item">
            <input
              id={id}
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => {
                const next = selected.includes(option)
                  ? selected.filter((item) => item !== option)
                  : [...selected, option];
                onChange({ questionCode }, next);
              }}
            />
            <span>{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function ContactValue({ value }) {
  const text = String(value || "To be confirmed");
  return text.includes("@")
    ? <a className="ss-contact-value" href={`mailto:${text}`}>{text}</a>
    : <span className="ss-contact-value">{text}</span>;
}

function ConsentCountryContacts({ consent, residenceCountry, type }) {
  const countries = getConsentContactCountries({ detectedCountry: "", residenceCountry });
  const contacts = buildContactSnapshot(consent, countries);
  const isSafeguarding = type === "safeguarding";

  return (
    <div className="border rounded-4 mb-4 bg-light ss-consent-contact-list">
      {contacts.map((row) => (
        <div key={`${type}-${row.country}`} className="ss-consent-contact-row">
          <strong>{row.country}</strong>
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
  onStartNewApplication,
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
  const [entryStage, setEntryStage] = useState(() => answers.COUNTRY ? "consent" : "country");
  const [editingConsent, setEditingConsent] = useState(false);
  const [consentDocument, setConsentDocument] = useState(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentLoadError, setConsentLoadError] = useState("");
  const [entryError, setEntryError] = useState("");
  const focusedStageRef = useRef(null);
  const supportRequestId = useRef(null);
  const [supportSending, setSupportSending] = useState(false);
  const [supportSaved, setSupportSaved] = useState(null);
  const [supportError, setSupportError] = useState("");
  const [requestContact, setRequestContact] = useState(false);

  function moveToFlowStage(phase, step = 0, { replace = false } = {}) {
    if (phase === "application") {
      onStepChange?.(Math.max(0, Number(step) || 0));
    }

    setEditingConsent(false);
    setEntryStage(phase);
    setEntryError("");
    writeApplicationFlowState(
      selectedPathway.id,
      phase,
      step,
      replace ? "replace" : "push"
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function moveToApplicationStep(step) {
    const nextStep = Math.max(0, Number(step) || 0);
    onStepChange?.(nextStep);
    writeApplicationFlowState(selectedPathway.id, "application", nextStep, "push");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function moveBackOneFlowStep() {
    window.history.back();
  }

  useEffect(() => {
    function handleApplicationHistory(event) {
      const flow = event.state?.digitalFuturesApplicationFlow;
      if (!flow || flow.pathwayId !== selectedPathway.id) return;

      setEditingConsent(false);
      setEntryError("");

      if (flow.phase === "application") {
        setEntryStage("application");
        onStepChange?.(Math.max(0, Number(flow.step) || 0));
      } else if (["country", "consent", "assistance"].includes(flow.phase)) {
        setEntryStage(flow.phase);
      }

      window.scrollTo({ top: 0, behavior: "auto" });
    }

    window.addEventListener("popstate", handleApplicationHistory);
    return () => window.removeEventListener("popstate", handleApplicationHistory);
  }, [onStepChange, selectedPathway.id]);

  useEffect(() => {
    const flow = getApplicationFlowState();
    const expectedStep = entryStage === "application" ? Math.max(0, Number(currentStep) || 0) : 0;

    if (
      !flow ||
      flow.pathwayId !== selectedPathway.id ||
      flow.phase !== entryStage ||
      Number(flow.step || 0) !== expectedStep
    ) {
      writeApplicationFlowState(
        selectedPathway.id,
        entryStage,
        expectedStep,
        "replace"
      );
    }
  }, [currentStep, entryStage, selectedPathway.id]);

  useEffect(() => {
    let active = true;

    async function loadConsent() {
      try {
        setConsentLoading(true);
        setConsentLoadError("");
        const response = await axios.get(`${API_BASE_URL}/api/consents/current`, {
          params: { pathway: selectedPathway.id },
        });
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
  }, [selectedPathway.id]);

  function setHiddenAnswer(questionCode, value) {
    onAnswerChange({ questionCode }, value);
    setEntryError("");
  }

  const consentDecision = answers.REGISTRATION_CONSENT;
  const consentGranted = sameOption(consentDecision, consentDocument?.consentGrantedOption);
  const consentDenied = sameOption(consentDecision, consentDocument?.consentDeniedOption);
  const consentSupportRequested = Boolean(
    consentDocument?.supportRequestOption &&
    sameOption(consentDecision, consentDocument.supportRequestOption)
  );

  const applicantSignatureComplete = Boolean(
    answers.CONSENT_SIGNATURE_METHOD && answers.CONSENT_SIGNATURE_DATA
  );
  const applicantConsentFieldsComplete = Boolean(
    answers.CONSENT_NAME_ID_CODE?.trim() &&
    answers.CONSENT_SIGNED_DATE &&
    applicantSignatureComplete
  );
  const consentVersionMatches = Boolean(consentDocument?.version) &&
    answers.CONSENT_VERSION === consentDocument.version;
  const consentSignedComplete = consentGranted && applicantConsentFieldsComplete && consentVersionMatches;

  const completedSelf = answers.CONSENT_COMPLETED_SELF;
  const assistanceRequired = sameOption(completedSelf, consentDocument?.assistanceRequiredOption);
  const assistanceSelf = sameOption(completedSelf, consentDocument?.assistanceSelfOption);

  const assistanceRelationshipComplete = Boolean(
    answers.CONSENT_ASSISTANT_RELATIONSHIP &&
    (!containsOther(answers.CONSENT_ASSISTANT_RELATIONSHIP) ||
      answers.CONSENT_ASSISTANT_RELATIONSHIP_OTHER?.trim())
  );
  const assistanceTypeComplete = Boolean(
    Array.isArray(answers.CONSENT_ASSISTANCE_TYPES) &&
    answers.CONSENT_ASSISTANCE_TYPES.length > 0 &&
    (!containsOther(answers.CONSENT_ASSISTANCE_TYPES) ||
      answers.CONSENT_ASSISTANCE_TYPE_OTHER?.trim())
  );
  const assistantSignatureComplete = Boolean(
    answers.CONSENT_ASSISTANT_SIGNATURE_METHOD &&
    answers.CONSENT_ASSISTANT_SIGNATURE_DATA
  );
  const assistanceDetailsComplete = Boolean(
    answers.CONSENT_ASSISTANT_NAME?.trim() &&
    assistanceRelationshipComplete &&
    assistanceTypeComplete &&
    answers.CONSENT_ASSISTANCE_LANGUAGE?.trim() &&
    assistantSignatureComplete
  );
  const assistanceComplete = assistanceSelf || (assistanceRequired && assistanceDetailsComplete);
  const consentComplete = consentSignedComplete && assistanceComplete;
  const entryComplete = entryStage === "application" && consentComplete;

  const residenceCountry = answers.COUNTRY || "";

  const accessibleStage = submitResult || consentLoading || !consentDocument
    ? null
    : (!entryComplete || editingConsent)
      ? entryStage
      : "application";

  useEffect(() => {
    if (!accessibleStage || focusedStageRef.current === accessibleStage) return undefined;
    focusedStageRef.current = accessibleStage;
    const headingId =
      accessibleStage === "country"
        ? "df-country-step-title"
        : accessibleStage === "consent" || accessibleStage === "assistance"
          ? "df-preapplication-step-title"
          : "application-title";

    const frame = window.requestAnimationFrame(() => {
      const heading = document.getElementById(headingId);
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [accessibleStage]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (editingConsent || !consentDocument) return;

    if (!answers.COUNTRY) {
      setEntryStage("country");
      return;
    }

    if (answers.ENTRY_STAGE === "application" && consentComplete) {
      setEntryStage("application");
      return;
    }

    if (answers.ENTRY_STAGE === "assistance" && consentSignedComplete) {
      setEntryStage("assistance");
    }
  }, [
    answers.COUNTRY,
    answers.ENTRY_STAGE,
    consentComplete,
    consentSignedComplete,
    consentDocument,
    editingConsent,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function continueFromCountry() {
    if (!PROGRAMME_COUNTRIES.includes(residenceCountry)) {
      setEntryError("Please select your country of residence before continuing.");
      return;
    }

    moveToFlowStage("consent");
  }

  function continueFromConsent() {
    if (!consentDocument?.version || !consentGranted) {
      setEntryError("Please provide consent before continuing.");
      return;
    }

    if (!answers.CONSENT_NAME_ID_CODE?.trim() || !applicantSignatureComplete) {
      setEntryError("Please complete your full name and electronic signature before continuing.");
      return;
    }

    const signedDate = answers.CONSENT_SIGNED_DATE || localDateString();
    const contactCountries = getConsentContactCountries({
      detectedCountry: "",
      residenceCountry,
    });
    const snapshot = buildContactSnapshot(consentDocument, contactCountries);

    onAnswerChange({ questionCode: "CONSENT_VERSION" }, consentDocument.version);
    onAnswerChange({ questionCode: "CONSENT_SIGNED_DATE" }, signedDate);
    onAnswerChange({ questionCode: "CONSENT_CONTACT_CONTEXT" }, residenceCountry || "ALL");
    onAnswerChange({ questionCode: "CONSENT_CONTACTS_AT_SIGNING" }, JSON.stringify(snapshot));
    onAnswerChange({ questionCode: "ENTRY_STAGE" }, "assistance");
    moveToFlowStage("assistance");
  }

  function continueFromAssistance() {
    if (!completedSelf) {
      setEntryError("Please indicate whether you completed the consent section yourself.");
      return;
    }

    if (assistanceRequired && !assistanceDetailsComplete) {
      setEntryError("Please complete all required details for the person who provided assistance.");
      return;
    }

    if (assistanceRequired && !answers.CONSENT_ASSISTANCE_DATE) {
      onAnswerChange({ questionCode: "CONSENT_ASSISTANCE_DATE" }, localDateString());
    }

    onAnswerChange({ questionCode: "ENTRY_STAGE" }, "application");
    moveToFlowStage("application", 0);
  }

  async function saveSupportRequest() {
    if (supportSending) return;
    const fullName = String(answers.CONSENT_SUPPORT_REQUEST_NAME || "").trim();
    const contactNumber = String(answers.CONSENT_SUPPORT_REQUEST_PHONE || "").trim();
    const accommodation = String(answers.CONSENT_SUPPORT_REQUEST_ACCOMMODATION || "").trim();
    if (fullName.length < 2 || fullName.length > 150 || !/^\+?\d{7,15}$/.test(contactNumber) || accommodation.length > 2000 || !requestContact) {
      setSupportError("Please enter your full name, a valid contact number (7–15 digits), and confirm that you want us to contact you. Accommodation details must be no more than 2,000 characters.");
      return;
    }
    setSupportSending(true);
    setSupportError("");
    try {
      if (!supportRequestId.current) supportRequestId.current = window.crypto.randomUUID();
      const response = await axios.post(`${API_BASE_URL}/api/consents/support-requests`, {
        requestId: supportRequestId.current,
        fullName, contactNumber, accommodation,
        country: residenceCountry,
        pathway: selectedPathway.id,
        requestContact,
      });
      setSupportSaved({ reference: response.data.reference });
    } catch (error) {
      setSupportError(error.response?.data?.message || "We could not confirm that your request was saved. Please try again.");
    } finally {
      setSupportSending(false);
    }
  }

  function handleSupportPhoneChange(value) {
    const digits = String(value || "").replace(/\D/g, "");
    setHiddenAnswer("CONSENT_SUPPORT_REQUEST_PHONE", digits);
    // A mobile number is also what links an incomplete application to its portal draft.
    onAnswerChange({ questionCode: "CONTACT_NUMBER" }, digits);
  }

  if (submitResult) {
    return (
      <ApplicationConfirmation
        result={submitResult}
        selectedPathway={selectedPathway}
        onStartNewApplication={onStartNewApplication || onBackToPathways}
        onCheckStatus={onCheckStatus}
        onTakeSkillsTest={onTakeSkillsTest}
      />
    );
  }

  if (entryStage !== "country" && (loadingQuestions || consentLoading)) {
    return (
      <main id="main-content" tabIndex="-1" className="container py-5">
        <section className="ss-loading-card text-center" aria-live="polite">
          <div className="spinner-border" role="status" aria-hidden="true" />
          <h1>Loading {selectedPathway.title} application...</h1>
          <p>Please wait while we prepare the application.</p>
        </section>
      </main>
    );
  }

  if (entryStage !== "country" && (consentLoadError || !consentDocument)) {
    return (
      <main id="main-content" tabIndex="-1" className="container py-5">
        <section className="ss-section-card mx-auto" style={{ maxWidth: "800px" }}>
          <h1>Consent form unavailable</h1>
          <p>{consentLoadError || "The consent form could not be loaded."}</p>
          <button type="button" className="btn ss-btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (!entryComplete || editingConsent) {
    const showCountry = entryStage === "country";
    const showAssistance = entryStage === "assistance";

    if (showCountry) {
      return (
        <main id="main-content" tabIndex="-1" className="ss-country-page df-country-simple">
          <section className="container py-5">
            <div className="ss-country-panel mx-auto">
              <div className="ss-country-copy">
                <h1 id="df-country-step-title" tabIndex="-1">SELECT YOUR COUNTRY OF RESIDENCE</h1>
              </div>

              <div className="ss-country-select-wrap">
                <label className="visually-hidden" htmlFor="country-of-residence">
                  Country of residence
                </label>
                <select
                  id="country-of-residence"
                  className="form-select form-select-lg"
                  value={residenceCountry}
                  onChange={(event) => {
                    onAnswerChange({ questionCode: "COUNTRY" }, event.target.value);
                    setEntryError("");
                  }}
                  aria-required="true"
                >
                  <option value="">Country of residence</option>
                  {PROGRAMME_COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              {entryError && (
                <div className="alert ss-alert-error mt-3" role="alert">
                  <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {entryError}
                </div>
              )}

              <div className="ss-country-actions">
                <button
                  type="button"
                  className="btn ss-btn-primary"
                  onClick={continueFromCountry}
                  disabled={!residenceCountry}
                >
                  Continue <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </main>
      );
    }

    return (
      <main id="main-content" tabIndex="-1" onKeyDown={selectChoiceOnEnter}>
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
              {residenceCountry && (
                <button
                  type="button"
                  className="btn btn-sm ss-country-context-button"
                  onClick={() => {
                    setEntryStage("country");
                    setEntryError("");
                  }}
                >
                  <i className="bi bi-geo-alt" aria-hidden="true" /> {residenceCountry} · Change
                </button>
              )}
            </div>
            <h1>{selectedPathway.title} application</h1>
            <p>
              {showAssistance
                ? "Please confirm whether you completed the consent section yourself or received assistance."
                : "Please read the participant application consent information carefully before deciding."}
            </p>
          </div>
        </section>

        <section className="container py-5">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-9">
              {showAssistance ? (
                <article className="ss-section-card">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
                    <div>
                      <span className="ss-small-label dark">Consent · Step 2 of 2 · Assistance</span>
                      <h2 className="mt-2" id="df-preapplication-step-title" tabIndex="-1">
                        {consentDocument.assistanceStepTitle}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm ss-btn-outline"
                      onClick={moveBackOneFlowStep}
                    >
                      Back to consent
                    </button>
                  </div>

                  <ConsentOption
                    questionCode="CONSENT_COMPLETED_SELF"
                    questionText={consentDocument.assistanceQuestion}
                    options={consentDocument.assistanceOptions}
                    value={completedSelf}
                    onChange={onAnswerChange}
                  />

                  {assistanceRequired && (
                    <div className="border rounded-4 p-4 mb-4 bg-light">
                      <p>{consentDocument.assistanceIntro}</p>
                      <p className="fw-semibold">By signing below, I confirm that:</p>
                      <ul>
                        {consentDocument.assistanceConfirmationBullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>

                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-semibold" htmlFor="consent-assistant-name">
                            Full name (required field)
                          </label>
                          <input
                            id="consent-assistant-name"
                            className="form-control"
                            type="text"
                            value={answers.CONSENT_ASSISTANT_NAME || ""}
                            onChange={(event) => setHiddenAnswer("CONSENT_ASSISTANT_NAME", event.target.value)}
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold" htmlFor="consent-assistant-relationship">
                            Relationship to the applicant (required field)
                          </label>
                          <select
                            id="consent-assistant-relationship"
                            className="form-select"
                            value={answers.CONSENT_ASSISTANT_RELATIONSHIP || ""}
                            onChange={(event) => setHiddenAnswer("CONSENT_ASSISTANT_RELATIONSHIP", event.target.value)}
                          >
                            <option value="">Select one option</option>
                            {consentDocument.relationshipOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>

                        {containsOther(answers.CONSENT_ASSISTANT_RELATIONSHIP) && (
                          <div className="col-12">
                            <label className="form-label fw-semibold" htmlFor="consent-assistant-relationship-other">
                              Other relationship, please specify (required field)
                            </label>
                            <input
                              id="consent-assistant-relationship-other"
                              className="form-control"
                              type="text"
                              value={answers.CONSENT_ASSISTANT_RELATIONSHIP_OTHER || ""}
                              onChange={(event) => setHiddenAnswer("CONSENT_ASSISTANT_RELATIONSHIP_OTHER", event.target.value)}
                            />
                          </div>
                        )}

                        <div className="col-12">
                          <fieldset>
                            <legend className="fs-6 fw-semibold">Type of assistance provided (select all that apply)</legend>
                            <MultiSelectOptions
                              questionCode="CONSENT_ASSISTANCE_TYPES"
                              options={consentDocument.assistanceTypeOptions}
                              value={answers.CONSENT_ASSISTANCE_TYPES}
                              onChange={onAnswerChange}
                            />
                          </fieldset>
                        </div>

                        {containsOther(answers.CONSENT_ASSISTANCE_TYPES) && (
                          <div className="col-12">
                            <label className="form-label fw-semibold" htmlFor="consent-assistance-other">
                              Other assistance, please specify (required field)
                            </label>
                            <input
                              id="consent-assistance-other"
                              className="form-control"
                              type="text"
                              value={answers.CONSENT_ASSISTANCE_TYPE_OTHER || ""}
                              onChange={(event) => setHiddenAnswer("CONSENT_ASSISTANCE_TYPE_OTHER", event.target.value)}
                            />
                          </div>
                        )}

                        <div className="col-12">
                          <label className="form-label fw-semibold" htmlFor="consent-assistance-language">
                            Language or communication method used (required field)
                          </label>
                          <input
                            id="consent-assistance-language"
                            className="form-control"
                            type="text"
                            placeholder="e.g. Swahili, Hausa or sign language"
                            value={answers.CONSENT_ASSISTANCE_LANGUAGE || ""}
                            onChange={(event) => setHiddenAnswer("CONSENT_ASSISTANCE_LANGUAGE", event.target.value)}
                          />
                        </div>

                        <div className="col-12">
                          <ElectronicSignature
                            label="Signature"
                            method={answers.CONSENT_ASSISTANT_SIGNATURE_METHOD || "DRAWN"}
                            value={answers.CONSENT_ASSISTANT_SIGNATURE_DATA || ""}
                            onChange={(method, value) => {
                              setHiddenAnswer("CONSENT_ASSISTANT_SIGNATURE_METHOD", method);
                              setHiddenAnswer("CONSENT_ASSISTANT_SIGNATURE_DATA", value);
                            }}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold" htmlFor="consent-assistance-date">
                            Date (automatically generated)
                          </label>
                          <input
                            id="consent-assistance-date"
                            className="form-control"
                            type="date"
                            value={answers.CONSENT_ASSISTANCE_DATE || localDateString()}
                            readOnly
                            aria-readonly="true"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {entryError && <div className="alert ss-alert-error" role="alert">{entryError}</div>}

                  <button type="button" className="btn ss-btn-primary" onClick={continueFromAssistance}>
                    Continue to main application <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                </article>
              ) : (
                <article className="ss-section-card">
                  <div className="mb-4">
                    <span className="ss-small-label dark">Consent · Step 1 of 2</span>
                    <h2 className="mt-2" id="df-preapplication-step-title" tabIndex="-1">
                      {consentDocument.introductionTitle}
                    </h2>
                  </div>

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

                  <details className="df-consent-details mt-4">
                    <summary>{consentDocument.rightsTitle}</summary>
                    <div className="df-consent-details-body">
                      <p>{consentDocument.rightsIntro}</p>
                      <ConsentCountryContacts
                        consent={consentDocument}
                        residenceCountry={residenceCountry}
                        type="safeguarding"
                      />
                      <p>
                        {consentDocument.speakUpPrefix}
                        <a href={consentDocument.speakUpUrl} target="_blank" rel="noreferrer">
                          {consentDocument.speakUpUrl}
                        </a>
                      </p>
                    </div>
                  </details>

                  <details className="df-consent-details mt-3">
                    <summary>{consentDocument.questionsTitle}</summary>
                    <div className="df-consent-details-body">
                      <p>{consentDocument.questionsIntro}</p>
                      <ConsentCountryContacts
                        consent={consentDocument}
                        residenceCountry={residenceCountry}
                        type="questions"
                      />
                    </div>
                  </details>

                  <hr className="my-4" />
                  <h2>{consentDocument.consentTitle}</h2>
                  <p>{consentDocument.consentIntro}</p>
                  <p className="fw-semibold">{consentDocument.consentLead}</p>
                  <ul>{consentDocument.consentBullets.map((item) => <li key={item}>{item}</li>)}</ul>

                  <ConsentOption
                    questionCode="REGISTRATION_CONSENT"
                    questionText={consentDocument.consentQuestion}
                    options={consentDocument.consentOptions}
                    value={consentDecision}
                    onChange={onAnswerChange}
                  />

                  {consentDenied && (
                    <div className="alert ss-alert-error" role="alert">
                      <h3 className="h5">Consent is required to continue</h3>
                      <p>If you do not consent, the programme cannot process your application or enrol you in the programme.</p>
                      <button type="button" className="btn ss-btn-outline" onClick={onBackToPathways}>
                        Back to pathways
                      </button>
                    </div>
                  )}

                  {consentSupportRequested && (
                    <div className="border rounded-4 p-4 bg-light">
                      {supportSaved ? (
                        <div role="status" aria-live="polite">
                          <h3 className="h5">Your request has been saved</h3>
                          <p>Someone from the programme will contact you using the number you provided to explain the information and answer your questions.</p>
                          <p>You have not given programme consent or submitted an application. You can return to decide after speaking with the team.</p>
                          <p className="small">Request reference: {supportSaved.reference}</p>
                          <button type="button" className="btn ss-btn-primary" onClick={onBackToPathways}>Back to pathways</button>
                        </div>
                      ) : (
                        <fieldset disabled={supportSending} className="border-0 p-0 m-0">
                      <h3 className="h5">Request an explanation before deciding</h3>
                      <p>{consentDocument.supportRequestInstruction}</p>
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-semibold" htmlFor="consent-support-name">Full name (required field)</label>
                          <input
                            id="consent-support-name"
                            aria-required="true"
                            className="form-control"
                            type="text"
                            value={answers.CONSENT_SUPPORT_REQUEST_NAME || ""}
                            onChange={(event) => setHiddenAnswer("CONSENT_SUPPORT_REQUEST_NAME", event.target.value)}
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold" htmlFor="consent-support-phone">Contact number (required field)</label>
                          <input
                            id="consent-support-phone"
                            aria-required="true"
                            className="form-control"
                            type="tel"
                            inputMode="numeric"
                            value={answers.CONSENT_SUPPORT_REQUEST_PHONE || ""}
                            onChange={(event) => handleSupportPhoneChange(event.target.value)}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold" htmlFor="consent-support-accommodation">
                            Any reasonable accommodation requirements
                          </label>
                          <textarea
                            id="consent-support-accommodation"
                            className="form-control"
                            rows={3}
                            value={answers.CONSENT_SUPPORT_REQUEST_ACCOMMODATION || ""}
                            onChange={(event) => setHiddenAnswer("CONSENT_SUPPORT_REQUEST_ACCOMMODATION", event.target.value)}
                          />
                        </div>
                      </div>
                      <label className="d-flex gap-2 align-items-start mt-3">
                        <input type="checkbox" className="mt-1" checked={requestContact} onChange={(event) => setRequestContact(event.target.checked)} />
                        <span>I agree that the programme team may use these details to contact me about this request. This does not give consent to participate in the programme.</span>
                      </label>
                      {supportError && <div className="alert ss-alert-error mt-3" role="alert">{supportError}</div>}
                      <button type="button" className="btn ss-btn-primary mt-3" onClick={saveSupportRequest} disabled={supportSending}>
                        {supportSending ? "Saving request…" : "Save contact request"}
                      </button>
                        </fieldset>
                      )}
                    </div>
                  )}

                  {consentGranted && (
                    <div className="border-top pt-4 mt-4">
                      <div className="row g-3 mb-3">
                        <div className="col-12 col-md-8">
                          <label className="form-label fw-semibold" htmlFor="consent-name">Full name (required field)</label>
                          <input
                            type="text"
                            id="consent-name"
                            className="form-control"
                            value={answers.CONSENT_NAME_ID_CODE || ""}
                            onChange={(event) => setHiddenAnswer("CONSENT_NAME_ID_CODE", event.target.value)}
                          />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label fw-semibold" htmlFor="consent-date">Date (automatically generated)</label>
                          <input
                            type="date"
                            id="consent-date"
                            className="form-control"
                            value={answers.CONSENT_SIGNED_DATE || localDateString()}
                            readOnly
                            aria-readonly="true"
                          />
                        </div>
                      </div>

                      <ElectronicSignature
                        label="Signature"
                        method={answers.CONSENT_SIGNATURE_METHOD || "DRAWN"}
                        value={answers.CONSENT_SIGNATURE_DATA || ""}
                        onChange={(method, value) => {
                          setHiddenAnswer("CONSENT_SIGNATURE_METHOD", method);
                          setHiddenAnswer("CONSENT_SIGNATURE_DATA", value);
                        }}
                      />

                      {entryError && <div className="alert ss-alert-error mt-3" role="alert">{entryError}</div>}

                      <button type="button" className="btn ss-btn-primary mt-4" onClick={continueFromConsent}>
                        Next <i className="bi bi-arrow-right" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </article>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex="-1" className="df-application-page">
      <section className="df-application-compact-header" aria-labelledby="application-title">
        <div className="container">
          <div className="df-application-compact-row">
            <div>
              <button
                type="button"
                className="ss-simple-back mb-2"
                onClick={onBackToPathways}
              >
                <i className="bi bi-arrow-left" aria-hidden="true" /> Back to pathways
              </button>
              <span className="ss-small-label dark">Digital Futures Participant Application</span>
              <h1 id="application-title" tabIndex="-1">{selectedPathway.title}</h1>
              <p>Complete one page at a time. Each page is checked before you continue.</p>
            </div>
            <div className="df-application-header-actions">
              <button
                type="button"
                className="btn btn-sm ss-btn-outline"
                onClick={() => moveToFlowStage("country")}
              >
                <i className="bi bi-geo-alt" aria-hidden="true" /> {residenceCountry} · Change
              </button>
              <button
                type="button"
                className="btn btn-sm ss-btn-outline"
                onClick={() => {
                  setEditingConsent(true);
                  setEntryStage("consent");
                  writeApplicationFlowState(selectedPathway.id, "consent", 0, "push");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <i className="bi bi-shield-check" aria-hidden="true" /> Consent
              </button>
            </div>
          </div>
        </div>
      </section>

      <details className="df-floating-support">
        <summary>
          <i className="bi bi-life-preserver" aria-hidden="true" />
          <span>Help &amp; support</span>
          <i className="bi bi-chevron-left df-floating-support-chevron" aria-hidden="true" />
        </summary>
        <div className="df-floating-support-panel">
          <div className="df-floating-support-heading">
            <div>
              <span className="ss-small-label dark">{residenceCountry}</span>
              <h2>Help &amp; support</h2>
            </div>
          </div>
          <RightsContactsPanel
            consent={consentDocument}
            residenceCountry={residenceCountry}
            compact
          />
        </div>
      </details>

      <section className="container-fluid px-3 px-lg-4 py-4 py-lg-5">
        <div className="df-application-main-clean">
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
              onNavigateStep={moveToApplicationStep}
              onBackStep={moveBackOneFlowStep}
            />
        </div>
      </section>
    </main>
  );
}

export default ContextualApplicationPage;


