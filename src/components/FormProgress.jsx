function FormProgress({ progress, sectionCount, submitting }) {
  return (
    <aside className="ss-progress-card">
      <div className="d-flex align-items-center justify-content-between gap-3">
        <div>
          <span className="ss-small-label dark">Progress</span>
          <h3>Registration completion</h3>
        </div>
        <div className="ss-progress-ring" aria-label={`${progress.percentage}% complete`}>
          {progress.percentage}%
        </div>
      </div>

      <div className="progress ss-progress-bar mt-3" role="progressbar" aria-valuenow={progress.percentage} aria-valuemin="0" aria-valuemax="100">
        <div className="progress-bar" style={{ width: `${progress.percentage}%` }} />
      </div>

      <div className="ss-progress-grid mt-3">
        <div>
          <strong>{progress.completedRequired}</strong>
          <span>Required answered</span>
        </div>
        <div>
          <strong>{progress.totalRequired}</strong>
          <span>Required total</span>
        </div>
        <div>
          <strong>{sectionCount}</strong>
          <span>Sections</span>
        </div>
        <div>
          <strong>{progress.visibleQuestions}</strong>
          <span>Visible questions</span>
        </div>
      </div>

      <div className="ss-progress-note mt-3">
        <i className="bi bi-info-circle" />
        <span>
          Fields marked with <strong>*</strong> are required. Hidden questions are not submitted.
        </span>
      </div>

      {submitting && (
        <div className="ss-progress-note mt-2">
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span>Submitting your registration...</span>
        </div>
      )}
    </aside>
  );
}

export default FormProgress;
