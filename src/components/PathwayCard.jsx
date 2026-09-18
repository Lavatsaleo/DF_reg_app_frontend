import physicalIcon from "../assets/foundation-icon-physical.png";
import virtualIcon from "../assets/foundation-icon-virtual.png";
import entrepreneurshipIcon from "../assets/foundation-icon-entrepreneurship.png";

const PATHWAY_ICONS = {
  PHYSICAL_ACADEMY: physicalIcon,
  VIRTUAL_ACADEMY: virtualIcon,
  DIGITAL_ENTREPRENEURSHIP: entrepreneurshipIcon,
};

function PathwayCard({ pathway, onSelect, simplified = false }) {
  const isOpen = pathway.status === "open";

  return (
    <article className={`ss-pathway-card df-clean-pathway-card h-100 ${!isOpen ? "is-disabled" : ""}`}>
      <div className="df-clean-pathway-topline">
        <div className="ss-pathway-icon" aria-hidden="true">
          <img
            src={PATHWAY_ICONS[pathway.id]}
            alt=""
            className="df-foundation-pathway-icon"
          />
        </div>
        <span className={`ss-status-badge ${isOpen ? "open" : "soon"}`}>
          {isOpen ? "Open" : "Coming soon"}
        </span>
      </div>

      <span className="ss-small-label">{pathway.tag}</span>
      <h3>{pathway.title}</h3>
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
          <>Start application <i className="bi bi-arrow-right" aria-hidden="true" /></>
        ) : (
          "Not yet available"
        )}
      </button>
    </article>
  );
}

export default PathwayCard;
