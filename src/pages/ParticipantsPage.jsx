import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import {
  PATHWAY_ICONS,
  formatDate,
  formatPathwayLabel,
  formatRelative,
  formatStatusLabel,
  getAvatarColour,
  getInitials,
  getStageMeta,
} from "../utils/participantDisplay";
import "./Participants.css";

const COUNTRIES = ["Kenya", "Nigeria", "Ghana", "Zambia"];
const PATHWAYS = ["PHYSICAL_ACADEMY", "VIRTUAL_ACADEMY", "DIGITAL_ENTREPRENEURSHIP"];
const EMPTY_FILTERS = { search: "", stage: "", country: "", pathway: "", sex: "", disability: "", sort: "newest" };
const PAGE_SIZE = 24;
const VIEW_KEY = "df-participants-view";

function readSavedView() {
  try { return window.localStorage.getItem(VIEW_KEY) === "table" ? "table" : "cards"; } catch { return "cards"; }
}

function Avatar({ name, size = "md" }) {
  return (
    <span className={`pt-avatar is-${size}`} style={{ "--pt-avatar": getAvatarColour(name) }} aria-hidden="true">
      {getInitials(name)}
    </span>
  );
}

function StagePill({ stage, status }) {
  const meta = getStageMeta(stage);
  return (
    <span className={`pt-stage is-${meta.tone}`} title={formatStatusLabel(status)}>
      <i className={`bi ${meta.icon}`} aria-hidden="true" /> {meta.label}
    </span>
  );
}

function ParticipantCard({ participant, onOpen }) {
  const meta = getStageMeta(participant.stage);
  const test = participant.skillsTest;
  return (
    <li className={`pt-card is-${meta.tone}`}>
      <button type="button" className="pt-card-button" onClick={() => onOpen(participant.id)}>
        <span className="pt-card-top">
          <Avatar name={participant.name} />
          <span className="pt-card-identity">
            <span className="pt-card-name">{participant.name}</span>
            <span className="pt-card-code">{participant.participantCode || participant.applicationReference || "No reference yet"}</span>
          </span>
        </span>
        <StagePill stage={participant.stage} status={participant.status} />
        <span className="pt-card-facts">
          <span><i className={`bi ${PATHWAY_ICONS[participant.pathway] || "bi-signpost"}`} aria-hidden="true" /> {formatPathwayLabel(participant.pathway, "Pathway not recorded")}</span>
          <span><i className="bi bi-geo-alt" aria-hidden="true" /> {[participant.region, participant.country].filter(Boolean).join(", ") || "Location not recorded"}</span>
          <span><i className="bi bi-person" aria-hidden="true" /> {[participant.sex, participant.age ? `${participant.age} years` : null].filter(Boolean).join(" · ") || "Not recorded"}</span>
        </span>
        <span className="pt-card-tags">
          {participant.hasDisability && <span className="pt-tag is-teal"><i className="bi bi-universal-access" aria-hidden="true" /> Disability reported</span>}
          {test && test.status !== "IN_PROGRESS" && (
            <span className={`pt-tag ${test.passed ? "is-green" : "is-red"}`}>Test {Math.round(test.percentage)}%</span>
          )}
        </span>
        <span className="pt-card-footer">
          <span>Applied {formatDate(participant.createdAt)}</span>
          <span className="pt-card-open">View profile <i className="bi bi-arrow-right" aria-hidden="true" /></span>
        </span>
      </button>
    </li>
  );
}

function ParticipantTable({ participants, onOpen }) {
  return (
    <div className="pt-table-wrap">
      <table className="pt-table">
        <caption className="visually-hidden">Participants matching the filters</caption>
        <thead>
          <tr>
            <th scope="col">Participant</th>
            <th scope="col">Stage</th>
            <th scope="col">Pathway</th>
            <th scope="col">Location</th>
            <th scope="col">Gender · age</th>
            <th scope="col">Applied</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id}>
              <th scope="row">
                <button type="button" className="pt-table-person" onClick={() => onOpen(p.id)}>
                  <Avatar name={p.name} size="sm" />
                  <span>
                    <span className="pt-table-name">{p.name}</span>
                    <span className="pt-table-code">{p.participantCode || p.applicationReference || "—"}</span>
                  </span>
                </button>
              </th>
              <td><StagePill stage={p.stage} status={p.status} /></td>
              <td>{formatPathwayLabel(p.pathway, "—")}</td>
              <td>{[p.region, p.country].filter(Boolean).join(", ") || "—"}</td>
              <td>{[p.sex, p.age].filter(Boolean).join(" · ") || "—"}</td>
              <td><span className="pt-table-date">{formatDate(p.createdAt)}</span><span className="pt-table-sub">{formatRelative(p.createdAt)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let n = Math.max(1, page - 2); n <= Math.min(totalPages, page + 2); n += 1) pages.push(n);
  return (
    <nav className="pt-pagination" aria-label="Participant pages">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}><i className="bi bi-chevron-left" aria-hidden="true" /> Previous</button>
      <ol>
        {pages[0] > 1 && <li><button type="button" onClick={() => onPage(1)}>1</button></li>}
        {pages[0] > 2 && <li aria-hidden="true" className="pt-ellipsis">…</li>}
        {pages.map((n) => (
          <li key={n}>
            <button type="button" className={n === page ? "is-current" : ""} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)}>
              <span className="visually-hidden">Page </span>{n}
            </button>
          </li>
        ))}
        {pages[pages.length - 1] < totalPages - 1 && <li aria-hidden="true" className="pt-ellipsis">…</li>}
        {pages[pages.length - 1] < totalPages && <li><button type="button" onClick={() => onPage(totalPages)}>{totalPages}</button></li>}
      </ol>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>Next <i className="bi bi-chevron-right" aria-hidden="true" /></button>
    </nav>
  );
}

function ParticipantsPage({ token, staffUser, onOpenParticipant, onSessionExpired }) {
  const isSuperAdmin = staffUser?.role === "ADMIN";
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState(readSavedView);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const resultsRef = useRef(null);

  // Wait until typing pauses before searching.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => (current.search === searchInput.trim() ? current : { ...current, search: searchInput.trim() }));
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      const params = { page, pageSize: PAGE_SIZE };
      Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
      try {
        const response = await axios.get(`${API_BASE_URL}/api/participants`, { params, signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        setData(response.data);
        setLoading(false);
      } catch (requestError) {
        if (axios.isCancel(requestError)) return;
        if (requestError.response?.status === 401) { onSessionExpired(); return; }
        setError(requestError.response?.data?.message || "We could not load participants. Please try again.");
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [filters, page, token, onSessionExpired]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function changeView(next) {
    setView(next);
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* storage unavailable */ }
  }

  function goToPage(next) {
    setPage(next);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearFilters() {
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  const participants = data?.participants || [];
  const hasFilters = Object.entries(filters).some(([key, value]) => key !== "sort" && value);
  const firstShown = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastShown = data ? Math.min(data.total, data.page * data.pageSize) : 0;
  const stageCount = (key) => data?.stages?.find((stage) => stage.key === key)?.count ?? 0;

  return (
    <main id="main-content" className="pt-page">
      <div className="pt-shell">
        <header className="pt-hero">
          <div className="pt-hero-text">
            <p className="pt-eyebrow"><i className="bi bi-people-fill" aria-hidden="true" /> Programme participants</p>
            <h1>Participants</h1>
            <p className="pt-hero-lead">Everyone who has applied to Digital Futures. Open a profile to see their details, every form they completed, test results, committee decisions and documents.</p>
            <p className="pt-scope"><i className="bi bi-globe-africa" aria-hidden="true" /> {isSuperAdmin ? "All four countries" : `${staffUser?.country || "Your country"} only`}</p>
          </div>
          <dl className="pt-hero-stats">
            <div><dt>All participants</dt><dd>{data ? data.allCount.toLocaleString() : "—"}</dd></div>
            <div><dt>Awaiting review</dt><dd>{data ? stageCount("review").toLocaleString() : "—"}</dd></div>
            <div><dt>Selected</dt><dd>{data ? (stageCount("selected") + stageCount("verification")).toLocaleString() : "—"}</dd></div>
            <div><dt>Enrolled</dt><dd>{data ? stageCount("enrolled").toLocaleString() : "—"}</dd></div>
          </dl>
        </header>

        <div className="pt-stage-bar" role="group" aria-label="Filter by stage">
          <button type="button" aria-pressed={!filters.stage} className={!filters.stage ? "is-active" : ""} onClick={() => updateFilter("stage", "")}>
            All <span className="pt-count">{data ? data.allCount : "…"}</span>
          </button>
          {(data?.stages || []).map((stage) => {
            const meta = getStageMeta(stage.key);
            const active = filters.stage === stage.key;
            return (
              <button key={stage.key} type="button" aria-pressed={active} className={`is-${meta.tone} ${active ? "is-active" : ""}`} onClick={() => updateFilter("stage", active ? "" : stage.key)}>
                <span className="pt-dot" aria-hidden="true" /> {meta.label} <span className="pt-count">{stage.count}</span>
              </button>
            );
          })}
        </div>

        <section className="pt-toolbar" aria-label="Search and filters">
          <label className="pt-search">
            <span className="visually-hidden">Search participants</span>
            <i className="bi bi-search" aria-hidden="true" />
            <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by name, phone, email or reference" autoComplete="off" />
          </label>
          <div className="pt-filters">
            {isSuperAdmin && (
              <label><span>Country</span>
                <select className="form-select" value={filters.country} onChange={(event) => updateFilter("country", event.target.value)}>
                  <option value="">All countries</option>
                  {COUNTRIES.map((country) => <option key={country}>{country}</option>)}
                </select>
              </label>
            )}
            <label><span>Pathway</span>
              <select className="form-select" value={filters.pathway} onChange={(event) => updateFilter("pathway", event.target.value)}>
                <option value="">All pathways</option>
                {PATHWAYS.map((pathway) => <option key={pathway} value={pathway}>{formatPathwayLabel(pathway)}</option>)}
              </select>
            </label>
            <label><span>Gender</span>
              <select className="form-select" value={filters.sex} onChange={(event) => updateFilter("sex", event.target.value)}>
                <option value="">All genders</option>
                <option>Female</option>
                <option>Male</option>
              </select>
            </label>
            <label><span>Disability</span>
              <select className="form-select" value={filters.disability} onChange={(event) => updateFilter("disability", event.target.value)}>
                <option value="">Everyone</option>
                <option value="yes">Reported a disability</option>
                <option value="no">No disability reported</option>
              </select>
            </label>
            <label><span>Sort by</span>
              <select className="form-select" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="updated">Recently updated</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
          </div>
        </section>

        <div className="pt-results-bar" ref={resultsRef}>
          <p role="status" aria-live="polite">
            {loading ? "Loading participants…" : data?.total ? <>Showing <strong>{firstShown}–{lastShown}</strong> of <strong>{data.total.toLocaleString()}</strong></> : "No participants match"}
            {hasFilters && !loading && <button type="button" className="pt-clear" onClick={clearFilters}>Clear filters</button>}
          </p>
          <div className="pt-view-toggle" role="group" aria-label="Layout">
            <button type="button" aria-pressed={view === "cards"} onClick={() => changeView("cards")}><i className="bi bi-grid-3x2-gap" aria-hidden="true" /> Cards</button>
            <button type="button" aria-pressed={view === "table"} onClick={() => changeView("table")}><i className="bi bi-list-ul" aria-hidden="true" /> Table</button>
          </div>
        </div>

        {error && <div className="pt-alert" role="alert"><i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> {error}</div>}

        {loading && !data ? (
          <ul className="pt-grid" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <li key={index} className="pt-card is-skeleton"><span /><span /><span /></li>)}
          </ul>
        ) : participants.length === 0 && !error ? (
          <div className="pt-empty">
            <span className="pt-empty-icon" aria-hidden="true"><i className="bi bi-search-heart" /></span>
            <h2>No participants found</h2>
            <p>{hasFilters ? "Try a different search, or clear the filters to see everyone." : "Applications appear here as soon as they are submitted."}</p>
            {hasFilters && <button type="button" className="pt-button is-primary" onClick={clearFilters}>Clear filters</button>}
          </div>
        ) : view === "table" ? (
          <ParticipantTable participants={participants} onOpen={onOpenParticipant} />
        ) : (
          <ul className={`pt-grid ${loading ? "is-loading" : ""}`}>
            {participants.map((participant) => <ParticipantCard key={participant.id} participant={participant} onOpen={onOpenParticipant} />)}
          </ul>
        )}

        {data && <Pagination page={data.page} totalPages={data.totalPages} onPage={goToPage} />}
      </div>
    </main>
  );
}

export default ParticipantsPage;
