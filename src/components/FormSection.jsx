import QuestionField from "./QuestionField";

function FormSection({
  section,
  questions,
  answers,
  errors,
  hideHeader = false,
  onAnswerChange,
  onMultiSelectChange,
}) {
  const sectionId = `section-${section}`.replace(/[^a-zA-Z0-9-_]/g, "-");

  return (
    <section className={hideHeader ? "ss-section-card embedded" : "ss-section-card"} aria-labelledby={sectionId}>
      {!hideHeader && (
        <div className="ss-section-header">
          <div>
            <span className="ss-step-pill">Section</span>
            <h2 id={sectionId}>{section}</h2>
          </div>
          <span className="ss-count-badge">{questions.length} questions</span>
        </div>
      )}

      {hideHeader && <h3 id={sectionId} className="visually-hidden">{section}</h3>}

      <div className="row g-4">
        {questions.map((question) => {
          const error = errors?.[question.questionCode];
          const labelId = `${question.questionCode}-label`;
          const errorId = `${question.questionCode}-error`;

          return (
            <div key={question.questionCode} className="col-12 col-lg-6">
              <div className={`ss-question-card h-100 ${error ? "has-error" : ""}`} id={`${question.questionCode}-card`}>
                <label className="form-label" htmlFor={question.questionCode} id={labelId}>
                  <span>
                    {question.questionNumber}. {question.questionText}
                  </span>
                  {question.required && (
                    <strong aria-label="Required field">*</strong>
                  )}
                </label>

                <QuestionField
                  question={question}
                  value={answers[question.questionCode]}
                  error={error}
                  labelId={labelId}
                  errorId={errorId}
                  onAnswerChange={onAnswerChange}
                  onMultiSelectChange={onMultiSelectChange}
                />

                {error && (
                  <div id={errorId} className="invalid-feedback d-block" role="alert">
                    {error}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default FormSection;
