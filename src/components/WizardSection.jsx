import FormSection from "./FormSection";

function statusLabel(status) {
  if (status === "complete") return "Completed";
  if (status === "needs_attention") return "Needs attention";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

function statusIcon(status) {
  if (status === "complete") return "bi-check2";
  if (status === "needs_attention") return "bi-exclamation-triangle";
  if (status === "in_progress") return "bi-pencil";
  return "bi-circle";
}

function WizardSection({
  index,
  title,
  questions,
  status,
  isActive,
  answers,
  errors,
  onToggle,
  onPrevious,
  onContinue,
  onAnswerChange,
  onMultiSelectChange,
}) {
  const panelId = `wizard-section-panel-${index}`;
  const buttonId = `wizard-section-button-${index}`;
  const describedById = `wizard-section-desc-${index}`;

  return (
    <section className={`ss-wizard-section ${isActive ? "active" : ""} ${status}`}>
      <h2 className="ss-wizard-section-title">
        <button
          id={buttonId}
          type="button"
          className="ss-wizard-section-trigger"
          aria-expanded={isActive}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="ss-wizard-step-number" aria-hidden="true">
            {index + 1}
          </span>
          <span className="ss-wizard-step-copy">
            <span>{title}</span>
            <small id={describedById}>{questions.length} question{questions.length === 1 ? "" : "s"}</small>
          </span>
          <span className={`ss-wizard-status-badge ${status}`}>
            <i className={`bi ${statusIcon(status)}`} aria-hidden="true" />
            {statusLabel(status)}
          </span>
        </button>
      </h2>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`ss-wizard-section-panel ${isActive ? "show" : ""}`}
        hidden={!isActive}
      >
        <div className="ss-wizard-section-intro">
          <p>
            Complete this section, then continue. We will only check the questions in this section before moving you forward.
          </p>
        </div>

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
            Save and continue <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default WizardSection;
