import FormSection from "./FormSection";

const SECTION_META = {
  "Eligibility check": {
    icon: "bi-person-check",
    caption: "Check your eligibility before completing the full form",
    intro:
      "Answer these questions first. We will check any explicit eligibility requirements before you move on.",
  },
  "Eligibility Check": {
    icon: "bi-person-check",
    caption: "Quick eligibility check",
    intro: "Start with the questions that determine whether this pathway is suitable for you. This avoids asking you to complete the full application before eligibility is checked.",
  },
  Location: {
    icon: "bi-geo-alt",
    caption: "Where you are applying from",
    intro: "",
  },
  "Personal Details": {
    icon: "bi-person-badge",
    caption: "Identity, contact, age and household details",
    intro: "Provide your identity, contact and demographic details. The age range is shown alongside the date-of-birth question.",
  },
  "Training Commitment": {
    icon: "bi-calendar-check",
    caption: "Training availability",
    intro: "Confirm that you are available for the expected training period before continuing.",
  },
  "Age and Demographics": {
    icon: "bi-person-lines-fill",
    caption: "Age and household profile",
    intro: "Enter your date of birth as accurately as possible. The pathway's age range is shown beside the question.",
  },
  "Education and Training": {
    icon: "bi-mortarboard",
    caption: "Education background and training availability",
    intro: "Tell us about the education and training you have completed.",
  },
  "Disability and Support": {
    icon: "bi-universal-access-circle",
    caption: "Eligibility and accessibility support",
    intro: "These answers help the system run the first screening and help the team plan reasonable accommodation support.",
  },
  "Digital Access": {
    icon: "bi-laptop",
    caption: "Online learning readiness",
    intro: "These questions appear only for the Virtual Academy pathway.",
  },
  Application: {
    icon: "bi-ui-checks",
    caption: "Motivation and project awareness",
    intro: "Tell us how you heard about the project and why the training is important for your goals.",
  },
  "Employment Status and Career Goals": {
    icon: "bi-briefcase",
    caption: "Work status and aspirations",
    intro: "Share your current employment situation and the type of work or business pathway you are aiming for.",
  },
  "Trusted Contact": {
    icon: "bi-telephone-forward",
    caption: "Backup contact for follow-up",
    intro: "Provide a trusted contact in case the project team cannot reach you on your own number.",
  },
  "Final Step": {
    icon: "bi-check2-square",
    caption: "Source and consent",
    intro: "Finish with how you heard about the project and confirm consent so we can process the application.",
  },
  Consent: {
    icon: "bi-check2-square",
    caption: "Confirm consent",
    intro: "Consent is required before submission. It is not used as an eligibility score.",
  },
  "Consent and Submission": {
    icon: "bi-check2-square",
    caption: "Final confirmation",
    intro: "Confirm consent so that the project team can process and review your application.",
  },
};

// Current questionnaire sections, keyed by their name without the "Section N:" prefix.
const QUESTIONNAIRE_SECTION_META = {
  "eligibility criteria": { title: "Education & support", icon: "bi-mortarboard", caption: "Your studies and any support you need to take part" },
  "training pathway selection": { icon: "bi-signpost-split", caption: "Your training pathway" },
  "personal & contact details": { icon: "bi-person-badge", caption: "Your name, identity and how we can contact you" },
  "education": { icon: "bi-mortarboard", caption: "Your qualifications" },
  "disability, accessibility & health": { icon: "bi-universal-access-circle", caption: "Your disability and the support you need to take part" },
  "prior engagement with sightsavers": { icon: "bi-people", caption: "Any earlier Sightsavers programmes you have joined" },
  "motivation & training readiness": { icon: "bi-lightbulb", caption: "Why you are applying and when you can start" },
  "access to device, internet and electricity": { icon: "bi-laptop", caption: "Your equipment for online learning" },
};

function getSectionMeta(title) {
  const key = String(title || "").replace(/^Section\s+\d+\s*:\s*/i, "").replace(/\.$/, "").trim().toLowerCase();
  const questionnaireMeta = QUESTIONNAIRE_SECTION_META[key];

  return SECTION_META[title] || (questionnaireMeta && { ...questionnaireMeta, intro: "" }) || {
    icon: "bi-ui-checks-grid",
    caption: "",
    intro: "Complete this step, then continue. Required fields are checked before you move forward.",
  };
}

function WizardSection({
  index,
  title,
  questions,
  status,
  isActive,
  answers,
  errors,
  onPrevious,
  onContinue,
  disableContinue = false,
  onAnswerChange,
  onMultiSelectChange,
}) {
  const panelId = `wizard-section-panel-${index}`;
  const headingId = `wizard-section-heading-${index}`;
  const fallbackMeta = getSectionMeta(title);
  const sourceMetadata = questions.find(
    (question) => question.metadata?.sectionIntro || question.metadata?.sectionNotice
  )?.metadata || {};
  const sectionMeta = {
    ...fallbackMeta,
    intro: title === "Eligibility check"
      ? fallbackMeta.intro
      : sourceMetadata.sectionIntro ?? (title.startsWith("Section ") ? "" : fallbackMeta.intro),
    notice: sourceMetadata.sectionNotice || "",
  };
  return (
    <section className={`ss-wizard-section ss-survey-section ${isActive ? "active" : ""} ${status}`}>
      <header className="ss-survey-section-header">
        <span className="ss-wizard-step-number" aria-hidden="true">
          <i className={`bi ${sectionMeta.icon}`} />
        </span>
        <div>
          <span className="ss-small-label dark">Application section</span>
          <h2 id={headingId}>{sectionMeta.title || title.replace(/^Section\s+\d+\s*:\s*/i, "").replace(/\.$/, "")}</h2>
          {sectionMeta.caption && <p>{sectionMeta.caption}</p>}
        </div>
      </header>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        className="ss-wizard-section-panel show"
      >
        {sectionMeta.intro && (
          <div className="ss-wizard-section-intro">
            <p>{sectionMeta.intro}</p>
          </div>
        )}

        {sectionMeta.notice && (
          <div className="alert alert-info" role="note">
            {sectionMeta.notice}
          </div>
        )}

        <FormSection
          section={title}
          questions={questions}
          answers={answers}
          errors={errors}
          hideHeader
          onAnswerChange={onAnswerChange}
          onMultiSelectChange={onMultiSelectChange}
        />

        <div className="ss-wizard-actions">
          <button
            type="button"
            className="btn ss-btn-outline"
            onClick={onPrevious}
          >
            <i className="bi bi-arrow-left" aria-hidden="true" /> {index === 0 ? "Back" : "Previous"}
          </button>

          <button
            type="button"
            className="btn ss-btn-primary"
            onClick={onContinue}
            disabled={disableContinue}
          >
            Save &amp; continue <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default WizardSection;
