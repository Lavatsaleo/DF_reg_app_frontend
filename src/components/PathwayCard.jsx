function PathwayCard({ pathway, onSelect, simplified = false }) {
  const isOpen = pathway.status === "open";

  return (
    <article className={`ss-pathway-card df-clean-pathway-card h-100 ${!isOpen ? "is-disabled" : ""}`}>
      <div className="df-clean-pathway-topline">
        <div className="ss-pathway-icon" aria-hidden="true">
          <i className={`bi ${pathway.icon} df-pathway-glyph`} />
        </div>
        <span className={`ss-status-badge ${isOpen ? "open" : "soon"}`}>
          {isOpen ? "Accepting applications" : "Coming soon"}
        </span>
      </div>

      <span className="ss-small-label">{pathway.tag}</span>
      {/* One word per line, so "Virtual Academy" lines up with the other two-line titles. */}
      <h3 className="df-pathway-title">
        {pathway.title.split(" ").map((word) => <span key={word}>{word}</span>)}
      </h3>
      <p className="df-clean-pathway-description">{pathway.description}</p>

      {!simplified && (
        <ul className="ss-highlight-list">
          {pathway.highlights.map((highlight) => (
            <li key={highlight}>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className={`btn w-100 mt-auto ${isOpen ? "ss-btn-primary" : "ss-btn-muted"}`}
        onClick={() => onSelect(pathway)}
        disabled={!isOpen}
      >
        {isOpen ? (
          <>Apply for {pathway.title} <i className="bi bi-arrow-right" aria-hidden="true" /></>
        ) : (
          `${pathway.title} not yet available`
        )}
      </button>
    </article>
  );
}

export default PathwayCard;
