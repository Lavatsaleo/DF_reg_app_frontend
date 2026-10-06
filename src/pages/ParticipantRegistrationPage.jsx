import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ElectronicSignature from "../components/ElectronicSignature";
import QuestionField from "../components/QuestionField";
import { API_BASE_URL } from "../config/api";
import { isQuestionVisible } from "../utils/formUtils";

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function containsOther(value) {
  if (Array.isArray(value)) {
    return value.some((item) => String(item || "").toLowerCase().startsWith("other"));
  }
  return String(value || "").toLowerCase().startsWith("other");
}

function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function formatPathway(pathway) {
  if (pathway === "PHYSICAL_ACADEMY") return "Physical Academy";
  if (pathway === "VIRTUAL_ACADEMY") return "Virtual Academy";
  return pathway || "Digital Futures";
}

function pipeQuestionText(question, answers) {
  const periodMap = {
    Monthly: "month",
    Weekly: "week",
    Daily: "day",
  };
  const period = periodMap[answers.M3_7] || "period selected in M3.7";
  return String(question.questionText || "").replaceAll("[period from M3.7]", period);
}

function ConsentOption({ name, options, value, onChange }) {
  return (
    <fieldset className="border-0 p-0 mb-4">
      <legend className="fs-6 fw-semibold mb-3">Do you consent to the collection and use of your information as described above?</legend>
      <div className="d-grid gap-2">
        {(options || []).map((option, index) => {
          const id = `${name}-${index}`;
          return (
            <label key={option} htmlFor={id} className={`ss-option-pill ${value === option ? "selected" : ""}`}>
              <input
                id={id}
                type="radio"
                name={name}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function AssistanceMultiSelect({ options, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];

  return (
    <div className="ss-checkbox-list" role="group">
      {(options || []).map((option, index) => {
        const id = `pr-assistance-${index}`;
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
                onChange(next);
              }}
            />
            <span>{option}</span>
          </label>
        );
      })}
    </div>
  );
}

const MISSING_INVITATION_MESSAGE =
  "Please open the Participant Registration form using the secure link sent to your email address.";

function ParticipantRegistrationPage({ initialToken = "", onBackHome, onCheckStatus }) {
  const [loading, setLoading] = useState(Boolean(initialToken));
  const [loadError, setLoadError] = useState(() =>
    initialToken ? "" : MISSING_INVITATION_MESSAGE
  );
  const [formData, setFormData] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [stage, setStage] = useState("consent");
  const [activeModule, setActiveModule] = useState(0);
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const headingRef = useRef(null);

  const [consent, setConsent] = useState({
    decision: "",
    fullName: "",
    signedDate: localDateString(),
    signatureMethod: "DRAWN",
    signatureData: "",
    completedSelf: "",
    assistantName: "",
    assistantRelationship: "",
    assistantRelationshipOther: "",
    assistanceTypes: [],
    assistanceTypeOther: "",
    assistanceLanguage: "",
    assistantSignatureMethod: "DRAWN",
    assistantSignatureData: "",
    assistanceDate: localDateString(),
    supportName: "",
    supportPhone: "",
    supportAccommodation: "",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setLoadError("");

        const response = await axios.get(
          `${API_BASE_URL}/api/participant-registration/invite/${encodeURIComponent(initialToken)}`
        );

        if (!active) return;

        const data = response.data || {};
        setFormData(data.form || null);
        setApplicant(data.applicant || null);
        setInvitation(data.invitation || null);
        setAlreadySubmitted(Boolean(data.alreadySubmitted));

        const fullName = [data.applicant?.firstName, data.applicant?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        setConsent((current) => ({
          ...current,
          fullName: current.fullName || fullName,
        }));

        if (data.alreadySubmitted) setStage("submitted");
      } catch (error) {
        if (!active) return;
        setLoadError(
          error.response?.data?.message ||
            "Unable to load the participant registration form. Please check the invitation link and try again."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    if (!initialToken) {
      return () => {
        active = false;
      };
    }

    load();

    return () => {
      active = false;
    };
  }, [initialToken]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [stage, activeModule]);

  const modules = useMemo(() => formData?.modules || [], [formData]);
  const questions = useMemo(() => formData?.questions || [], [formData]);
  const currentModule = modules[activeModule] || null;

  const currentQuestions = useMemo(() => {
    if (!currentModule) return [];
    return questions.filter(
      (question) =>
        question.section === currentModule.title &&
        isQuestionVisible(question, answers)
    );
  }, [questions, currentModule, answers]);

  function handleAnswerChange(question, value) {
    setAnswers((current) => ({
      ...current,
      [question.questionCode]: value,
    }));
    setErrors((current) => {
      if (!current[question.questionCode]) return current;
      const next = { ...current };
      delete next[question.questionCode];
      return next;
    });
  }

  function handleMultiSelectChange(question, option) {
    setAnswers((current) => {
      const existing = Array.isArray(current[question.questionCode])
        ? current[question.questionCode]
        : [];

      let next;
      if (question.metadata?.exclusiveOptions?.includes(option)) {
        next = existing.includes(option) ? [] : [option];
      } else {
        next = existing.includes(option)
          ? existing.filter((item) => item !== option)
          : [
              ...existing.filter(
                (item) => !question.metadata?.exclusiveOptions?.includes(item)
              ),
              option,
            ];
      }

      return {
        ...current,
        [question.questionCode]: next,
      };
    });

    setErrors((current) => {
      if (!current[question.questionCode]) return current;
      const next = { ...current };
      delete next[question.questionCode];
      return next;
    });
  }

  function handleFileChange(question, file) {
    setFiles((current) => ({
      ...current,
      [question.documentField]: file || null,
    }));
    setErrors((current) => {
      if (!current[question.questionCode]) return current;
      const next = { ...current };
      delete next[question.questionCode];
      return next;
    });
  }

  function validateConsent() {
    const consentDefinition = formData?.consent;
    if (!consentDefinition) return "Consent information is unavailable.";

    if (consent.decision !== consentDefinition.consentGrantedOption) {
      return "Please provide consent before continuing to the registration questions.";
    }

    if (!consent.fullName.trim() || !consent.signatureData) {
      return "Please complete your full name and electronic signature.";
    }

    if (!consent.completedSelf) {
      return "Please indicate whether you completed the consent section yourself.";
    }

    if (consent.completedSelf === consentDefinition.assistanceRequiredOption) {
      if (
        !consent.assistantName.trim() ||
        !consent.assistantRelationship ||
        consent.assistanceTypes.length === 0 ||
        !consent.assistanceLanguage.trim() ||
        !consent.assistantSignatureData
      ) {
        return "Please complete all required details for the person who provided assistance.";
      }

      if (
        containsOther(consent.assistantRelationship) &&
        !consent.assistantRelationshipOther.trim()
      ) {
        return "Please specify the other relationship.";
      }

      if (
        containsOther(consent.assistanceTypes) &&
        !consent.assistanceTypeOther.trim()
      ) {
        return "Please specify the other type of assistance.";
      }
    }

    return "";
  }

  function continueFromConsent() {
    const message = validateConsent();
    if (message) {
      setSubmitMessage(message);
      return;
    }

    setSubmitMessage("");
    setStage("form");
    setActiveModule(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitSupportRequest() {
    if (!consent.supportName.trim() || !consent.supportPhone.trim()) {
      setSupportMessage(
        "Please provide your full name and contact number so programme staff can contact you."
      );
      return;
    }

    try {
      setSupportSubmitting(true);
      setSupportMessage("");

      const response = await axios.post(
        `${API_BASE_URL}/api/participant-registration/invite/${encodeURIComponent(initialToken)}/support-request`,
        {
          fullName: consent.supportName,
          contactNumber: consent.supportPhone,
          accommodation: consent.supportAccommodation,
        }
      );

      setSupportMessage(
        response.data?.message ||
          "Your request has been recorded. Programme staff will contact you."
      );
    } catch (error) {
      setSupportMessage(
        error.response?.data?.message ||
          "Unable to save your support request. Please try again."
      );
    } finally {
      setSupportSubmitting(false);
    }
  }

  function validateModule() {
    const nextErrors = {};

    for (const question of currentQuestions) {
      if (!question.required) continue;

      if (question.responseType === "FILE") {
        if (!files[question.documentField]) {
          nextErrors[question.questionCode] = "This document is required.";
        }
        continue;
      }

      const value = answers[question.questionCode];
      if (isEmpty(value)) {
        nextErrors[question.questionCode] = "This question is required.";
      }
    }

    if (
      Array.isArray(answers.M3_5) &&
      answers.M3_5.includes("None of the above") &&
      answers.M3_5.length > 1
    ) {
      nextErrors.M3_5 =
        "None of the above cannot be selected together with another option.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => {
        const firstCode = Object.keys(nextErrors)[0];
        const card = document.getElementById(`${firstCode}-registration-card`);
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
        // Focus the first invalid control so its error (linked by aria-describedby) is read out.
        const control = card?.querySelector("input:not([type=hidden]), select, textarea, button");
        control?.focus({ preventScroll: true });
      });
      return false;
    }

    return true;
  }

  function continueModule() {
    if (!validateModule()) return;

    if (activeModule < modules.length - 1) {
      setActiveModule((value) => value + 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStage("review");
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function previousModule() {
    if (activeModule === 0) {
      setStage("consent");
      return;
    }
    setActiveModule((value) => Math.max(0, value - 1));
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitRegistration() {
    try {
      setSubmitting(true);
      setSubmitMessage("");

      const payload = new FormData();
      payload.append("responses", JSON.stringify(answers));
      payload.append(
        "consent",
        JSON.stringify({
          decision: consent.decision,
          fullName: consent.fullName,
          signedDate: consent.signedDate,
          signatureMethod: consent.signatureMethod,
          signatureData: consent.signatureData,
          completedSelf: consent.completedSelf,
          assistantName: consent.assistantName,
          assistantRelationship: consent.assistantRelationship,
          assistantRelationshipOther: consent.assistantRelationshipOther,
          assistanceTypes: consent.assistanceTypes,
          assistanceTypeOther: consent.assistanceTypeOther,
          assistanceLanguage: consent.assistanceLanguage,
          assistantSignatureMethod: consent.assistantSignatureMethod,
          assistantSignatureData: consent.assistantSignatureData,
          assistanceDate: consent.assistanceDate,
        })
      );

      Object.entries(files).forEach(([field, file]) => {
        if (file) payload.append(field, file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/participant-registration/invite/${encodeURIComponent(initialToken)}/submit`,
        payload
      );

      setSubmittedResult(response.data || {});
      setStage("submitted");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const data = error.response?.data;
      const nextErrors = {};

      (data?.missingQuestions || []).forEach((item) => {
        nextErrors[item.questionCode] = "This question is required.";
      });
      (data?.invalidQuestions || []).forEach((item) => {
        nextErrors[item.questionCode] = item.message;
      });

      setErrors(nextErrors);
      setSubmitMessage(
        data?.message ||
          "Unable to submit the participant registration form. Please review the form and try again."
      );

      if (Object.keys(nextErrors).length > 0) {
        const firstCode = Object.keys(nextErrors)[0];
        const firstQuestion = questions.find(
          (question) => question.questionCode === firstCode
        );
        const moduleIndex = modules.findIndex(
          (module) => module.title === firstQuestion?.section
        );

        if (moduleIndex >= 0) {
          setActiveModule(moduleIndex);
          setStage("form");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main id="main-content" tabIndex="-1" className="container py-5">
        <section className="ss-loading-card text-center" aria-live="polite">
          <div className="spinner-border" role="status" aria-hidden="true" />
          <h1>Loading participant registration...</h1>
          <p>Please wait while we verify your secure invitation.</p>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main id="main-content" tabIndex="-1" className="container py-5">
        <section className="ss-section-card mx-auto" style={{ maxWidth: "780px" }}>
          <span className="ss-small-label dark">Participant Registration</span>
          <h1 tabIndex="-1" ref={headingRef}>Unable to open registration form</h1>
          <div className="alert ss-alert-error" role="alert">{loadError}</div>
          <button type="button" className="btn ss-btn-outline" onClick={onBackHome}>
            Back to home
          </button>
        </section>
      </main>
    );
  }

  if (stage === "submitted" || alreadySubmitted) {
    return (
      <main id="main-content" tabIndex="-1" className="ss-confirmation-page">
        <section className="ss-confirmation-hero">
          <div className="container py-5">
            <div className="ss-confirmation-card eligible mx-auto" style={{ maxWidth: "900px" }}>
              <div className="ss-confirmation-icon" aria-hidden="true">
                <i className="bi bi-check2-circle" />
              </div>
              <span className="ss-small-label dark">Participant registration submitted</span>
              <h1 tabIndex="-1" ref={headingRef}>Thank you. Your registration form has been received.</h1>
              <p className="ss-confirmation-lead">
                Your Participant Registration &amp; Baseline Survey is now pending verification by the programme team.
              </p>
              <div className="ss-confirmation-grid" role="list">
                <div className="ss-confirmation-detail" role="listitem">
                  <span>Participant</span>
                  <strong>{applicant?.firstName} {applicant?.lastName}</strong>
                </div>
                <div className="ss-confirmation-detail" role="listitem">
                  <span>Pathway</span>
                  <strong>{formatPathway(applicant?.pathway)}</strong>
                </div>
                <div className="ss-confirmation-detail" role="listitem">
                  <span>Application reference</span>
                  <strong>{applicant?.applicationReference || "Not available"}</strong>
                </div>
                <div className="ss-confirmation-detail" role="listitem">
                  <span>Status</span>
                  <strong>Registration completed - pending verification</strong>
                </div>
              </div>
              {submittedResult?.documentsUploaded !== undefined && (
                <p className="mt-3 mb-0">
                  Documents uploaded: <strong>{submittedResult.documentsUploaded}</strong>
                </p>
              )}
              <div className="ss-confirmation-actions mt-4">
                <button type="button" className="btn ss-btn-primary" onClick={onCheckStatus}>
                  Check application status
                </button>
                <button type="button" className="btn ss-btn-outline" onClick={onBackHome}>
                  Return to home
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const consentDefinition = formData?.consent;
  const supportRequested =
    consent.decision === consentDefinition?.supportRequestOption;
  const consentGranted =
    consent.decision === consentDefinition?.consentGrantedOption;
  const assistanceRequired =
    consent.completedSelf === consentDefinition?.assistanceRequiredOption;

  if (stage === "consent") {
    return (
      <main id="main-content" tabIndex="-1">
        <section className="ss-form-hero">
          <div className="container">
            <span className="ss-small-label light">Digital Futures · Participant Registration</span>
            <h1 tabIndex="-1" ref={headingRef}>Participant Registration &amp; Baseline Survey</h1>
            <p>
              {applicant?.firstName ? `Hello ${applicant.firstName}. ` : ""}
              This secure form is linked to your approved {formatPathway(applicant?.pathway)} application.
            </p>
          </div>
        </section>

        <section className="container py-5">
          <article className="ss-section-card mx-auto" style={{ maxWidth: "960px" }}>
            <span className="ss-small-label dark">Consent</span>
            <h2>{consentDefinition?.introductionTitle}</h2>
            {(consentDefinition?.introduction || []).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <h3 className="h5 mt-4">{consentDefinition?.whatThisFormInvolvesTitle}</h3>
            {(consentDefinition?.whatThisFormInvolves || []).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <h3 className="h5 mt-4">{consentDefinition?.whyWeCollectTitle}</h3>

            <h3 className="h5 mt-4">{consentDefinition?.howWeProtectTitle}</h3>
            {(consentDefinition?.howWeProtect || []).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <p className="mb-1">For more detail, see:</p>
            <ul>
              {(consentDefinition?.dataProtectionLinks || []).map((item) => (
                <li key={item.url}>
                  <a href={item.url} target="_blank" rel="noreferrer">{item.label}</a>
                </li>
              ))}
            </ul>

            <details className="df-consent-details mt-4">
              <summary>{consentDefinition?.rightsTitle}</summary>
              <div className="df-consent-details-body">
                <ul>
                  {(consentDefinition?.rights || []).map((item) => <li key={item}>{item}</li>)}
                </ul>
                <p>{consentDefinition?.rightsClosing}</p>
              </div>
            </details>

            <details className="df-consent-details mt-3">
              <summary>{consentDefinition?.safetyTitle}</summary>
              <div className="df-consent-details-body">
                {(consentDefinition?.safety || []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                <p>
                  <a href={consentDefinition?.speakUpUrl} target="_blank" rel="noreferrer">
                    {consentDefinition?.speakUpUrl}
                  </a>
                </p>
              </div>
            </details>

            <details className="df-consent-details mt-3">
              <summary>{consentDefinition?.questionsTitle}</summary>
              <div className="df-consent-details-body">
                <p>{consentDefinition?.questions}</p>
              </div>
            </details>

            <hr className="my-4" />
            <h2>{consentDefinition?.consentTitle}</h2>
            <p>{consentDefinition?.consentIntro}</p>
            <p className="fw-semibold">{consentDefinition?.consentLead}</p>
            <ul>
              {(consentDefinition?.consentBullets || []).map((item) => <li key={item}>{item}</li>)}
            </ul>

            <ConsentOption
              name="participant-registration-consent"
              options={consentDefinition?.consentOptions}
              value={consent.decision}
              onChange={(decision) => {
                setConsent((current) => ({ ...current, decision }));
                setSubmitMessage("");
                setSupportMessage("");
              }}
            />

            {consent.decision === consentDefinition?.consentDeniedOption && (
              <div className="alert ss-alert-error" role="alert">
                If you do not consent, the participant registration form cannot proceed.
              </div>
            )}

            {supportRequested && (
              <section className="border rounded-4 p-4 bg-light">
                <h3 className="h5">Request an explanation before deciding</h3>
                <p>{consentDefinition?.supportRequestInstruction}</p>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold" htmlFor="pr-support-name">Full name</label>
                    <input
                      id="pr-support-name"
                      className="form-control"
                      value={consent.supportName}
                      onChange={(event) =>
                        setConsent((current) => ({ ...current, supportName: event.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold" htmlFor="pr-support-phone">Contact number</label>
                    <input
                      id="pr-support-phone"
                      className="form-control"
                      type="tel"
                      value={consent.supportPhone}
                      onChange={(event) =>
                        setConsent((current) => ({ ...current, supportPhone: event.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold" htmlFor="pr-support-accommodation">
                      Any reasonable accommodation requirements
                    </label>
                    <textarea
                      id="pr-support-accommodation"
                      className="form-control"
                      rows={3}
                      value={consent.supportAccommodation}
                      onChange={(event) =>
                        setConsent((current) => ({ ...current, supportAccommodation: event.target.value }))
                      }
                    />
                  </div>
                </div>
                {supportMessage && (
                  <div className="alert ss-alert-info mt-3 mb-0" role="status">{supportMessage}</div>
                )}
                <button
                  type="button"
                  className="btn ss-btn-primary mt-3"
                  disabled={supportSubmitting}
                  onClick={submitSupportRequest}
                >
                  {supportSubmitting ? "Saving request..." : "Request programme support"}
                </button>
              </section>
            )}

            {consentGranted && (
              <section className="border-top pt-4 mt-4">
                <div className="row g-3">
                  <div className="col-12 col-md-8">
                    <label className="form-label fw-semibold" htmlFor="pr-consent-name">
                      Full name (required field)
                    </label>
                    <input
                      id="pr-consent-name"
                      className="form-control"
                      value={consent.fullName}
                      onChange={(event) =>
                        setConsent((current) => ({ ...current, fullName: event.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold" htmlFor="pr-consent-date">
                      Date (automatically generated)
                    </label>
                    <input
                      id="pr-consent-date"
                      className="form-control"
                      type="date"
                      value={consent.signedDate}
                      readOnly
                    />
                  </div>
                  <div className="col-12">
                    <ElectronicSignature
                      label="Signature"
                      method={consent.signatureMethod}
                      value={consent.signatureData}
                      onChange={(method, value) =>
                        setConsent((current) => ({
                          ...current,
                          signatureMethod: method,
                          signatureData: value,
                        }))
                      }
                    />
                  </div>
                </div>

                <fieldset className="border-0 p-0 mt-4">
                  <legend className="fs-6 fw-semibold">
                    {consentDefinition?.assistanceQuestion}
                  </legend>
                  <div className="d-grid gap-2">
                    {(consentDefinition?.assistanceOptions || []).map((option, index) => {
                      const id = `pr-completed-self-${index}`;
                      return (
                        <label key={option} htmlFor={id} className={`ss-option-pill ${consent.completedSelf === option ? "selected" : ""}`}>
                          <input
                            id={id}
                            type="radio"
                            name="pr-completed-self"
                            checked={consent.completedSelf === option}
                            onChange={() =>
                              setConsent((current) => ({ ...current, completedSelf: option }))
                            }
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {assistanceRequired && (
                  <section className="border rounded-4 p-4 mt-4 bg-light">
                    <h3 className="h5">{consentDefinition?.assistanceStepTitle}</h3>
                    <p>{consentDefinition?.assistanceIntro}</p>
                    <p className="fw-semibold">I confirm that:</p>
                    <ul>
                      {(consentDefinition?.assistanceConfirmationBullets || []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-semibold" htmlFor="pr-assistant-name">
                          Full name
                        </label>
                        <input
                          id="pr-assistant-name"
                          className="form-control"
                          value={consent.assistantName}
                          onChange={(event) =>
                            setConsent((current) => ({ ...current, assistantName: event.target.value }))
                          }
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold" htmlFor="pr-assistant-relationship">
                          Relationship to the applicant
                        </label>
                        <select
                          id="pr-assistant-relationship"
                          className="form-select"
                          value={consent.assistantRelationship}
                          onChange={(event) =>
                            setConsent((current) => ({ ...current, assistantRelationship: event.target.value }))
                          }
                        >
                          <option value="">Select one option</option>
                          {(consentDefinition?.relationshipOptions || []).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      {containsOther(consent.assistantRelationship) && (
                        <div className="col-12">
                          <label className="form-label fw-semibold" htmlFor="pr-assistant-relationship-other">
                            Other relationship, please specify
                          </label>
                          <input
                            id="pr-assistant-relationship-other"
                            className="form-control"
                            value={consent.assistantRelationshipOther}
                            onChange={(event) =>
                              setConsent((current) => ({ ...current, assistantRelationshipOther: event.target.value }))
                            }
                          />
                        </div>
                      )}
                      <div className="col-12">
                        <p className="form-label fw-semibold mb-2">Type of assistance provided</p>
                        <AssistanceMultiSelect
                          options={consentDefinition?.assistanceTypeOptions}
                          value={consent.assistanceTypes}
                          onChange={(assistanceTypes) =>
                            setConsent((current) => ({ ...current, assistanceTypes }))
                          }
                        />
                      </div>
                      {containsOther(consent.assistanceTypes) && (
                        <div className="col-12">
                          <label className="form-label fw-semibold" htmlFor="pr-assistance-other">
                            Other assistance, please specify
                          </label>
                          <input
                            id="pr-assistance-other"
                            className="form-control"
                            value={consent.assistanceTypeOther}
                            onChange={(event) =>
                              setConsent((current) => ({ ...current, assistanceTypeOther: event.target.value }))
                            }
                          />
                        </div>
                      )}
                      <div className="col-12">
                        <label className="form-label fw-semibold" htmlFor="pr-assistance-language">
                          Language/communication method e.g. Swahili, Hausa, Sign language etc
                        </label>
                        <input
                          id="pr-assistance-language"
                          className="form-control"
                          value={consent.assistanceLanguage}
                          onChange={(event) =>
                            setConsent((current) => ({ ...current, assistanceLanguage: event.target.value }))
                          }
                        />
                      </div>
                      <div className="col-12">
                        <ElectronicSignature
                          label="Signature"
                          method={consent.assistantSignatureMethod}
                          value={consent.assistantSignatureData}
                          onChange={(method, value) =>
                            setConsent((current) => ({
                              ...current,
                              assistantSignatureMethod: method,
                              assistantSignatureData: value,
                            }))
                          }
                        />
                      </div>
                      <div className="col-12 col-md-5">
                        <label className="form-label fw-semibold" htmlFor="pr-assistance-date">
                          Date (automatically generated)
                        </label>
                        <input
                          id="pr-assistance-date"
                          className="form-control"
                          type="date"
                          value={consent.assistanceDate}
                          readOnly
                        />
                      </div>
                    </div>
                  </section>
                )}

                {submitMessage && (
                  <div className="alert ss-alert-error mt-4" role="alert">{submitMessage}</div>
                )}

                <button type="button" className="btn ss-btn-primary mt-4" onClick={continueFromConsent}>
                  Continue to registration questions
                </button>
              </section>
            )}
          </article>
        </section>
      </main>
    );
  }

  if (stage === "review") {
    return (
      <main id="main-content" tabIndex="-1">
        <section className="ss-form-hero">
          <div className="container">
            <span className="ss-small-label light">Final step</span>
            <h1 tabIndex="-1" ref={headingRef}>Review and submit</h1>
            <p>Please confirm that you have completed all five modules and uploaded the required documents.</p>
          </div>
        </section>
        <section className="container py-5">
          <article className="ss-section-card mx-auto" style={{ maxWidth: "900px" }}>
            <h2>Participant registration summary</h2>
            <div className="ss-status-summary-grid mt-4" role="list">
              <div role="listitem">
                <span>Participant</span>
                <strong>{applicant?.firstName} {applicant?.lastName}</strong>
              </div>
              <div role="listitem">
                <span>Pathway</span>
                <strong>{formatPathway(applicant?.pathway)}</strong>
              </div>
              <div role="listitem">
                <span>Modules completed</span>
                <strong>{modules.length}</strong>
              </div>
              <div role="listitem">
                <span>Documents ready</span>
                <strong>{Object.values(files).filter(Boolean).length}</strong>
              </div>
            </div>

            <div className="alert alert-info mt-4" role="note">
              After submission, the programme team will verify your registration details and supporting documents. You will not be able to submit this form a second time using the same invitation.
            </div>

            {submitMessage && (
              <div className="alert ss-alert-error" role="alert">{submitMessage}</div>
            )}

            <div className="d-flex flex-wrap gap-3">
              <button
                type="button"
                className="btn ss-btn-outline"
                onClick={() => {
                  setStage("form");
                  setActiveModule(modules.length - 1);
                }}
              >
                Back to form
              </button>
              <button
                type="button"
                className="btn ss-btn-primary"
                disabled={submitting}
                onClick={submitRegistration}
              >
                {submitting ? "Submitting..." : "Submit Participant Registration"}
              </button>
            </div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex="-1">
      <section className="ss-form-hero">
        <div className="container">
          <span className="ss-small-label light">Participant Registration · Step {activeModule + 1} of {modules.length}</span>
          <h1 tabIndex="-1" ref={headingRef}>{currentModule?.title}</h1>
          {currentModule?.intro && <p>{currentModule.intro}</p>}
        </div>
      </section>

      <section className="container py-5">
        <div className="row g-4">
          <div className="col-12 col-xl-9">
            <section className="ss-section-card">
              {currentModule?.note && (
                <div className="alert alert-info" role="note">{currentModule.note}</div>
              )}

              <div className="row g-4">
                {currentQuestions.map((question) => {
                  const labelId = `${question.questionCode}-registration-label`;
                  const helpId = question.helpText
                    ? `${question.questionCode}-registration-help`
                    : undefined;
                  const errorId = `${question.questionCode}-registration-error`;
                  const error = errors[question.questionCode];
                  const questionText = pipeQuestionText(question, answers);
                  const wide = ["MULTI_SELECT", "FILE"].includes(question.responseType) ||
                    question.questionCode === "M3_15";

                  return (
                    <div key={question.questionCode} className={wide ? "col-12" : "col-12 col-lg-6"}>
                      <div
                        id={`${question.questionCode}-registration-card`}
                        className={`ss-question-card h-100 ${wide ? "wide" : ""} ${error ? "has-error" : ""}`}
                      >
                        <label className="form-label" id={labelId} htmlFor={question.questionCode}>
                          <span>{questionText}</span>
                          {question.required ? (
                            <strong className="ss-required-chip">Required</strong>
                          ) : (
                            <em className="ss-optional-chip">Optional</em>
                          )}
                        </label>

                        {question.helpText && (
                          <p id={helpId} className="ss-question-help">{question.helpText}</p>
                        )}

                        {question.questionCode === "M3_15" && (
                          <div className="border rounded-3 p-3 mb-3 bg-light" aria-label="Step ladder from 1 poorest to 10 richest">
                            <div className="d-flex justify-content-between small">
                              <strong>1 · Poorest</strong>
                              <span>2</span><span>3</span><span>4</span><span>5</span>
                              <span>6</span><span>7</span><span>8</span><span>9</span>
                              <strong>10 · Richest</strong>
                            </div>
                          </div>
                        )}

                        {question.responseType === "FILE" ? (
                          <>
                            <input
                              id={question.questionCode}
                              className={`form-control ${error ? "is-invalid" : ""}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              aria-labelledby={labelId}
                              aria-describedby={[helpId, error ? errorId : null].filter(Boolean).join(" ") || undefined}
                              aria-invalid={error ? "true" : "false"}
                              aria-required={question.required ? "true" : "false"}
                              onChange={(event) =>
                                handleFileChange(question, event.target.files?.[0] || null)
                              }
                            />
                            <small className="d-block text-muted mt-2">
                              One file only. PDF, JPG or PNG. Maximum 10 MB.
                            </small>
                            {files[question.documentField] && (
                              <small className="d-block mt-2">
                                Selected: <strong>{files[question.documentField].name}</strong>
                              </small>
                            )}
                          </>
                        ) : (
                          <QuestionField
                            question={{ ...question, questionText }}
                            value={answers[question.questionCode]}
                            answers={answers}
                            error={error}
                            labelId={labelId}
                            helpId={helpId}
                            errorId={errorId}
                            onAnswerChange={handleAnswerChange}
                            onMultiSelectChange={handleMultiSelectChange}
                          />
                        )}

                        {error && (
                          <div id={errorId} className="invalid-feedback d-block">
                            {error}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="d-flex flex-wrap justify-content-between gap-3 mt-4 pt-4 border-top">
                <button type="button" className="btn ss-btn-outline" onClick={previousModule}>
                  {activeModule === 0 ? "Back to consent" : "Previous module"}
                </button>
                <button type="button" className="btn ss-btn-primary" onClick={continueModule}>
                  {activeModule === modules.length - 1 ? "Review registration" : "Continue"}
                </button>
              </div>
            </section>
          </div>

          <div className="col-12 col-xl-3">
            <aside className="ss-help-card">
              <span className="ss-small-label dark">Registration progress</span>
              <ol className="mb-0">
                {modules.map((module, index) => (
                  <li key={module.title} className={index === activeModule ? "fw-semibold" : ""}>
                    {module.title.replace(/^Module \d+:\s*/, "")}
                  </li>
                ))}
              </ol>
              {invitation?.expiresAt && (
                <p className="small mt-3 mb-0">
                  This secure invitation remains valid until {new Date(invitation.expiresAt).toLocaleDateString()}.
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ParticipantRegistrationPage;
