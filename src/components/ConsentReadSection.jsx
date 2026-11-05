// One part of a consent notice. People confirm each part before the consent decision unlocks.
function ConsentReadSection({ sectionKey, index, title, isOpen, isRead, onToggle, onMarkRead, isLast, children }) {
  const bodyId = `df-consent-read-${sectionKey}`;

  return (
    <section className={`df-consent-read ${isRead ? "is-read" : ""} ${isOpen ? "is-open" : ""}`}>
      <h3 className="df-consent-read-title">
        <button type="button" aria-expanded={isOpen} aria-controls={bodyId} onClick={onToggle}>
          <span className="df-consent-read-marker" aria-hidden="true">
            {isRead ? <i className="bi bi-check-lg" /> : index + 1}
          </span>
          <span className="df-consent-read-label">{title}</span>
          <span className="df-consent-read-state">{isRead ? "Read" : "Not read yet"}</span>
          <i className={`bi ${isOpen ? "bi-chevron-up" : "bi-chevron-down"}`} aria-hidden="true" />
        </button>
      </h3>
      {isOpen && (
        <div id={bodyId} className="df-consent-details-body">
          {children}
          {!isRead && (
            <button type="button" className="btn ss-btn-primary btn-sm mt-2" onClick={onMarkRead}>
              <i className="bi bi-check2" aria-hidden="true" /> {isLast ? "I have read this section" : "I have read this section, show the next one"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default ConsentReadSection;
