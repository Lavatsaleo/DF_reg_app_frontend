import FormSection from "./FormSection";

const SECTION_META = {
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
    intro: "Provide your identity, contact, age and demographic details. Applicants must be 18 to 33 years old at the point of registration.",
  },
  "Training Commitment": {
    icon: "bi-calendar-check",
    caption: "Training availability",
    intro: "Confirm that you are available for the expected training period before continuing.",
  },
  "Age and Demographics": {
    icon: "bi-person-lines-fill",
    caption: "Age and household profile",
    intro: "Applicants must be 18 to 33 years old at the point of registration. If you know your birth year, only eligible years are shown; if you are not sure, enter your age at last birthday.",
  },
  "Education and Training": {
    icon: "bi-mortarboard",
    caption: "Education background and training availability",
    intro: "Confirm your availability for the expected training period, then tell us about your education and any training you are currently undertaking. For the Physical Academy pathway, applicants must have completed at least a Bachelor’s degree and be available for the full training period.",
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

function getSectionMeta(title) {
  return SECTION_META[title] || {
    icon: "bi-ui-checks-grid",
    caption: "Quick application step",
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
    intro: sourceMetadata.sectionIntro ?? (title.startsWith("Section ") ? "" : fallbackMeta.intro),
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
          <h2 id={headingId}>{title}</h2>
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
            disabled={index === 0}
          >
            <i className="bi bi-arrow-left" aria-hidden="true" /> Previous
          </button>

          <button type="button" className="btn ss-btn-primary" onClick={onContinue}>
            Save &amp; continue <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default WizardSection;
