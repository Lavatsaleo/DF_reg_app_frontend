/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { formatPathwayLabel, formatStatusLabel } from "../utils/displayLabels";
import PasswordFields from "../components/PasswordFields";
import { getPasswordPairProblem } from "../utils/passwordRules";
import "./CommitteeDashboardPage.css";
import "./CommitteeWorkspace.css";

const COUNTRY_OPTIONS = ["Kenya", "Nigeria", "Ghana", "Zambia"];
const SECTION_IDS = ["review", "waiting", "invitations", "selected", "members", "admins"];
const COUNTRY_FILTER_KEY = "df-committee-country-filter";
const OPEN_ASSIGNMENT_STATUSES = ["ASSIGNED", "IN_REVIEW"];

// Status codes read as sentence case ("IN_REVIEW" -> "In review"), never all capitals.
function formatCode(value, fallback) {
  const text = String(value || fallback).replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
const DELIVERY_ATTENTION_STATUSES = ["EMAIL_FAILED", "NOT_CREATED", "PENDING", "EXPIRED"];

function readSectionFromHash() {
  const id = window.location.hash.replace("#", "");
  return SECTION_IDS.includes(id) ? id : "";
}

function readSavedCountryFilter() {
  try {
    return window.localStorage.getItem(COUNTRY_FILTER_KEY) || "";
  } catch {
    return "";
  }
}

function withCountry(path, country) {
  if (!country) return path;
  return `${path}${path.includes("?") ? "&" : "?"}country=${encodeURIComponent(country)}`;
}

// Matches a typed (possibly partial) application reference or participant code, ignoring case and spaces.
function matchesReference(term, ...values) {
  if (!term) return true;
  return values.some((value) => String(value || "").toUpperCase().replace(/\s+/g, "").includes(term));
}

function ReferenceNoMatch({ reference, what, onClear }) {
  return (
    <section className="committee-section-card">
      <div className="committee-empty-state">
        <i className="bi bi-search" aria-hidden="true" />
        <h2>No {what} match “{reference}”</h2>
        <p>Check the reference, try fewer characters, or look in another workspace.</p>
        <button type="button" className="btn committee-small-action" onClick={onClear}>
          Clear reference filter
        </button>
      </div>
    </section>
  );
}

const EMPTY_MEMBER_FORM = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
  role: "MEMBER",
  notes: "",
  createLogin: false,
  password: "",
  confirmPassword: "",
};

const EMPTY_COUNTRY_ADMIN_FORM = {
  fullName: "",
  email: "",
  country: "",
  password: "",
  confirmPassword: "",
};

const REVIEW_DECISIONS = [
  { value: "SELECTED", label: "Selected", icon: "bi-check-circle" },
  { value: "WAITLISTED", label: "Waitlisted", icon: "bi-hourglass-split" },
  { value: "PENDING_VERIFICATION", label: "Pending verification", icon: "bi-shield-exclamation" },
  { value: "NOT_SELECTED", label: "Not selected", icon: "bi-x-circle" },
];

function formatDate(value) {
  if (!value) return "Not available";

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Not available";
  }
}

function formatDecision(value) {
  const found = REVIEW_DECISIONS.find((decision) => decision.value === value);
  return found?.label || formatCode(value, "Pending");
}

function formatYesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not available";
}

function getParticipantReportFileName(scope) {
  const safeScope = String(scope || "selected-participants")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `digital-futures-${safeScope || "selected-participants"}-verification-report.csv`;
}

function csvValue(value) {
  let text = value === null || value === undefined ? "" : String(value);
  // Applicant-entered text starting with = + - @ would run as a formula in Excel; prefix it so it stays text.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadSelectedParticipantsCsv(rows, scope) {
  const headers = [
    "Application reference",
    "Participant code",
    "Full name",
    "Phone",
    "Emergency contact phone",
    "Email",
    "Country",
    "Admin level",
    "District/LGA/Sub-county",
    "Town",
    "Pathway",
    "Disability",
    "Disability type",
    "Support needs",
    "Education level",
    "Employment status",
    "Skills test percentage",
    "Selected by",
    "Reviewed at",
    "Participant registration status",
    "Verification status",
  ];

  const lines = rows.map((row) => [
    row.applicationReference,
    row.participantCode,
    row.fullName,
    row.contactNumber,
    row.alternativeContactNumber,
    row.email,
    row.country,
    row.firstAdminLevel,
    row.districtLevel,
    row.town,
    formatPathwayLabel(row.pathway),
    formatYesNo(row.hasDisability),
    row.disabilityType || row.otherDisabilityType || "",
    row.accessibilityNeeds || "",
    row.educationLevel,
    row.employmentStatus,
    row.skillsTest?.percentage ?? "",
    row.reviewedBy?.fullName || "",
    row.reviewedAt ? formatDate(row.reviewedAt) : "",
    row.participantRegistration?.status || "Not applicable",
    row.verificationStatus || "Pending verification",
  ]);

  const csv = [headers, ...lines].map((line) => line.map(csvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getParticipantReportFileName(scope);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getApplicantSubtitle(applicant) {
  return [
    applicant?.participantCode,
    applicant?.applicationReference,
    formatPathwayLabel(applicant?.pathway),
  ]
    .filter(Boolean)
    .join(" · ");
}

// Readable role names for the "Signed in as" card.
const ROLE_LABELS = {
  ADMIN: "Super Admin",
  COUNTRY_ADMIN: "Country admin",
  COMMITTEE_CHAIRPERSON: "Committee chairperson",
  COMMITTEE_MEMBER: "Committee member",
  VIEWER: "Dashboard user",
};

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const ADMIN_PASSWORD_NOTE =
  "You are choosing this password for someone else. Tell them in person or by phone, never by email or chat. They can choose their own with “Forgot your password?” on the sign-in page.";

function InlineFeedback({ feedback }) {
  if (!feedback?.text) return null;
  const ok = feedback.type === "success";
  return (
    <p className={`cm-feedback ${ok ? "is-ok" : "is-bad"}`} role={ok ? "status" : "alert"}>
      <i className={`bi ${ok ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"}`} aria-hidden="true" />
      <span>{feedback.text}</span>
    </p>
  );
}

function MemberWorkloadCard({ member, canManage, onToggleActive, onSetPassword, onSendReset }) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState(null);
  const passwordToggleRef = useRef(null);
  const hasLogin = member.hasLogin === true;
  const isChair = member.role === "CHAIRPERSON";
  const panelId = `cm-password-${member.id}`;
  const headingId = `cm-member-${member.id}`;

  function closePasswordForm() {
    setShowPasswordForm(false);
    setPassword("");
    setConfirmPassword("");
    passwordToggleRef.current?.focus();
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    const problem = getPasswordPairProblem(password, confirmPassword, member);
    if (problem) {
      setFeedback({ type: "error", text: problem });
      return;
    }
    setBusy("password");
    setFeedback(null);
    const result = await onSetPassword(member.id, password, confirmPassword);
    setBusy("");
    setFeedback({ type: result.ok ? "success" : "error", text: result.message });
    if (result.ok) closePasswordForm();
  }

  async function handleSendReset() {
    setBusy("reset");
    setFeedback(null);
    const result = await onSendReset(member.id);
    setBusy("");
    setFeedback({ type: result.ok ? "success" : "error", text: result.message });
  }

  return (
    <article className={`cm-card ${member.isActive ? "" : "is-inactive"}`} aria-labelledby={headingId}>
      <div className="cm-card-head">
        <span className={`cm-avatar ${isChair ? "is-chair" : ""}`} aria-hidden="true">{getInitials(member.fullName)}</span>
        <div className="cm-identity">
          <h4 id={headingId}>{member.fullName}</h4>
          <p className="cm-email">{member.email}</p>
        </div>
      </div>

      <ul className="cm-tags" aria-label="Member details">
        <li className={`cm-tag ${isChair ? "is-chair" : "is-member"}`}>
          <i className={`bi ${isChair ? "bi-star-fill" : "bi-person-fill"}`} aria-hidden="true" />
          {isChair ? "Chairperson" : "Member"}
        </li>
        <li className={`cm-tag ${hasLogin ? "is-login" : "is-nologin"}`}>
          <i className={`bi ${hasLogin ? "bi-key-fill" : "bi-key"}`} aria-hidden="true" />
          {hasLogin ? "Can sign in" : "No login yet"}
        </li>
        {!member.isActive && (
          <li className="cm-tag is-inactive">
            <i className="bi bi-pause-circle-fill" aria-hidden="true" /> Inactive
          </li>
        )}
      </ul>

      <dl className="cm-stats">
        <div className={member.workload?.pending ? "is-pending" : ""}>
          <dt>Pending</dt>
          <dd>{member.workload?.pending || 0}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>{member.workload?.completed || 0}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{member.workload?.total || 0}</dd>
        </div>
      </dl>

      <InlineFeedback feedback={feedback} />

      {canManage && (
        <div className="cm-actions">
          {hasLogin && (
            <button
              type="button"
              className="btn cm-btn cm-btn-primary"
              onClick={handleSendReset}
              disabled={busy === "reset"}
            >
              <i className="bi bi-envelope-arrow-up" aria-hidden="true" />
              {busy === "reset" ? "Sending..." : "Send reset link"}
              <span className="visually-hidden"> to {member.fullName}</span>
            </button>
          )}
          <button
            ref={passwordToggleRef}
            type="button"
            className={`btn cm-btn ${hasLogin ? "cm-btn-outline" : "cm-btn-primary"}`}
            aria-expanded={showPasswordForm}
            aria-controls={panelId}
            onClick={() => (showPasswordForm ? closePasswordForm() : setShowPasswordForm(true))}
          >
            <i className={`bi ${hasLogin ? "bi-key" : "bi-person-lock"}`} aria-hidden="true" />
            {hasLogin ? "Set new password" : "Create login"}
            <span className="visually-hidden"> for {member.fullName}</span>
          </button>
          <button
            type="button"
            className={`btn cm-btn ${member.isActive ? "cm-btn-danger" : "cm-btn-success"}`}
            onClick={() => onToggleActive(member)}
          >
            <i className={`bi ${member.isActive ? "bi-pause-circle" : "bi-play-circle"}`} aria-hidden="true" />
            {member.isActive ? "Deactivate" : "Activate"}
            <span className="visually-hidden"> {member.fullName}</span>
          </button>
        </div>
      )}

      {canManage && showPasswordForm && (
        <form id={panelId} className="cm-password-panel" onSubmit={handlePasswordSubmit} noValidate>
          <p className="cm-password-title">
            {hasLogin ? `Set a new password for ${member.fullName}` : `Create a login for ${member.fullName}`}
          </p>
          <p className="cm-password-sub">
            They will sign in with <strong>{member.email}</strong>.
            {hasLogin && " Their current password stops working straight away."}
          </p>
          <PasswordFields
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            person={member}
            label="New password"
            confirmLabel="Confirm new password"
            note={ADMIN_PASSWORD_NOTE}
          />
          <div className="cm-password-actions">
            <button type="submit" className="btn cm-btn cm-btn-primary" disabled={busy === "password"}>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              {busy === "password" ? "Saving..." : hasLogin ? "Save new password" : "Create login"}
            </button>
            <button type="button" className="btn cm-btn cm-btn-outline" onClick={closePasswordForm}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

function MembersOverview({ members }) {
  const active = members.filter((member) => member.isActive);
  const pending = members.reduce((sum, member) => sum + (member.workload?.pending || 0), 0);
  const completed = members.reduce((sum, member) => sum + (member.workload?.completed || 0), 0);
  const withoutLogin = active.filter((member) => !member.hasLogin).length;
  const items = [
    { label: "Active members", value: active.length, icon: "bi-people-fill" },
    { label: "Reviews pending", value: pending, icon: "bi-hourglass-split" },
    { label: "Reviews completed", value: completed, icon: "bi-check2-all" },
    { label: "Active without a login", value: withoutLogin, icon: "bi-key", attention: withoutLogin > 0 },
  ];
  return (
    <ul className="cm-overview" aria-label="Committee summary">
      {items.map((item) => (
        <li key={item.label} className={item.attention ? "needs-attention" : ""}>
          <i className={`bi ${item.icon}`} aria-hidden="true" />
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function CommitteeMembersSection({
  members,
  canManage,
  showAddMember,
  onToggleAddMember,
  addMemberForm,
  onToggleActive,
  onSetPassword,
  onSendReset,
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const shown = term
    ? members.filter((member) => `${member.fullName} ${member.email}`.toLowerCase().includes(term))
    : members;

  // Grouped by country; chairpersons first in each group, then by name.
  const groups = [];
  [...shown]
    .sort((a, b) =>
      String(a.country || "").localeCompare(String(b.country || ""))
      || Number(b.role === "CHAIRPERSON") - Number(a.role === "CHAIRPERSON")
      || String(a.fullName).localeCompare(String(b.fullName)))
    .forEach((member) => {
      const country = member.country || "No country";
      let group = groups.find((item) => item.country === country);
      if (!group) {
        group = { country, members: [] };
        groups.push(group);
      }
      group.members.push(member);
    });

  return (
    <section className="committee-section-card cm-section" aria-labelledby="cm-title">
      <div className="cm-section-head">
        <div>
          <span className="ss-small-label dark">Members</span>
          <h2 id="cm-title">Committee workload</h2>
          <p>See who is reviewing, keep assignments balanced and manage sign-in access.</p>
        </div>
        {canManage && (
          <button
            type="button"
            className={`btn ${showAddMember ? "committee-secondary-action" : "committee-primary-action"}`}
            aria-expanded={showAddMember}
            aria-controls="committee-add-member"
            onClick={onToggleAddMember}
          >
            <i className={`bi ${showAddMember ? "bi-x-lg" : "bi-person-plus"}`} aria-hidden="true" />
            {showAddMember ? " Close form" : " Add committee member"}
          </button>
        )}
      </div>

      {canManage && showAddMember && (
        <div id="committee-add-member" className="cw-inline-form">{addMemberForm}</div>
      )}

      {members.length === 0 ? (
        <div className="cm-empty">
          <i className="bi bi-people" aria-hidden="true" />
          <p>No committee members have been added yet.</p>
        </div>
      ) : (
        <>
          <MembersOverview members={members} />

          <div className="cm-search">
            <label htmlFor="cm-search-input">Find a member</label>
            <div className="cm-search-row">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                id="cm-search-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or email address"
                autoComplete="off"
              />
            </div>
            <p className="visually-hidden" role="status" aria-live="polite">
              {term ? `${shown.length} of ${members.length} members shown` : ""}
            </p>
          </div>

          {shown.length === 0 && (
            <p className="cm-empty-text">No members match &ldquo;{query.trim()}&rdquo;.</p>
          )}

          {groups.map((group) => {
            const groupId = `cm-group-${group.country.replace(/\W+/g, "-").toLowerCase()}`;
            return (
              <section key={group.country} className="cm-group" aria-labelledby={groupId}>
                <h3 id={groupId} className="cm-group-title">
                  <i className="bi bi-geo-alt-fill" aria-hidden="true" /> {group.country}
                  <span>{group.members.length} {group.members.length === 1 ? "member" : "members"}</span>
                </h3>
                <div className="cm-grid">
                  {group.members.map((member) => (
                    <MemberWorkloadCard
                      key={member.id}
                      member={member}
                      canManage={canManage}
                      onToggleActive={onToggleActive}
                      onSetPassword={onSetPassword}
                      onSendReset={onSendReset}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </section>
  );
}

function CountryAdminCard({ admin, onSendReset }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const isSso = (admin.authProvider || "LOCAL") === "SSO";

  async function handleSendReset() {
    setBusy(true);
    setFeedback(null);
    const result = await onSendReset(admin.id);
    setBusy(false);
    setFeedback({ type: result.ok ? "success" : "error", text: result.message });
  }

  return (
    <article className={`cm-card cm-admin-card ${admin.isActive ? "" : "is-inactive"}`} aria-labelledby={`ca-${admin.id}`}>
      <div className="cm-card-head">
        <span className="cm-avatar is-admin" aria-hidden="true">{getInitials(admin.fullName)}</span>
        <div className="cm-identity">
          <h4 id={`ca-${admin.id}`}>{admin.fullName}</h4>
          <p className="cm-email">{admin.email}</p>
        </div>
      </div>
      <ul className="cm-tags" aria-label="Admin details">
        <li className="cm-tag is-member"><i className="bi bi-geo-alt-fill" aria-hidden="true" /> {admin.country || "No country"}</li>
        <li className={`cm-tag ${admin.isActive ? "is-login" : "is-inactive"}`}>
          {admin.isActive ? "Active" : "Inactive"}
        </li>
        {admin.lastLoginAt && <li className="cm-tag is-plain">Last signed in {formatDate(admin.lastLoginAt)}</li>}
      </ul>
      <InlineFeedback feedback={feedback} />
      {admin.isActive && !isSso && (
        <div className="cm-actions">
          <button type="button" className="btn cm-btn cm-btn-outline" onClick={handleSendReset} disabled={busy}>
            <i className="bi bi-envelope-arrow-up" aria-hidden="true" />
            {busy ? "Sending..." : "Send reset link"}
            <span className="visually-hidden"> to {admin.fullName}</span>
          </button>
        </div>
      )}
    </article>
  );
}

function AddCountryAdminForm({ adminForm, onChange, onSubmit, submitting, countries, countryAdmins, onSendReset }) {
  return (
    <section className="committee-section-card cm-section" aria-labelledby="ca-title">
      <div className="cm-section-head">
        <div>
          <span className="ss-small-label dark">Country administration</span>
          <h2 id="ca-title">Country admins</h2>
          <p>Country admins add and manage committee members for their own country only.</p>
        </div>
      </div>

      {countryAdmins?.length > 0 ? (
        <div className="cm-grid cm-admin-grid">
          {countryAdmins.map((admin) => (
            <CountryAdminCard key={admin.id} admin={admin} onSendReset={onSendReset} />
          ))}
        </div>
      ) : (
        <p className="cm-empty-text">No country admins have been set up yet.</p>
      )}

      <form className="committee-add-member-card cm-form" onSubmit={onSubmit} noValidate>
        <div>
          <h3>Add a country admin</h3>
          <p>All fields are required.</p>
        </div>

        <div className="committee-form-grid">
          <label>
            Full name
            <input
              type="text"
              value={adminForm.fullName}
              onChange={(event) => onChange("fullName", event.target.value)}
              autoComplete="off"
              required
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              value={adminForm.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="name@example.org"
              autoComplete="off"
              required
            />
          </label>
          <label>
            Country
            <select
              value={adminForm.country}
              onChange={(event) => onChange("country", event.target.value)}
              required
            >
              <option value="">Select country</option>
              {(countries || COUNTRY_OPTIONS).map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </label>
        </div>

        <PasswordFields
          password={adminForm.password}
          confirmPassword={adminForm.confirmPassword}
          onPasswordChange={(value) => onChange("password", value)}
          onConfirmPasswordChange={(value) => onChange("confirmPassword", value)}
          person={adminForm}
          note={ADMIN_PASSWORD_NOTE}
        />

        <div className="committee-form-actions">
          <button type="submit" className="btn committee-primary-action" disabled={submitting}>
            <i className="bi bi-person-gear" aria-hidden="true" /> {submitting ? "Adding..." : "Add country admin"}
          </button>
        </div>
      </form>
    </section>
  );
}

function AddMemberForm({ memberForm, onChange, onSubmit, submitting, countries, canChooseCountry, currentUserCountry }) {
  return (
    <form className="committee-add-member-card cm-form" onSubmit={onSubmit} noValidate>
      <div>
        <span className="ss-small-label dark">Committee setup</span>
        <h3>Add committee member</h3>
        <p>Members added here can receive applicant assignments. Phone number and notes are optional.</p>
      </div>

      <div className="committee-form-grid">
        <label>
          Full name
          <input
            type="text"
            value={memberForm.fullName}
            onChange={(event) => onChange("fullName", event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label>
          Email address
          <input
            type="email"
            value={memberForm.email}
            onChange={(event) => onChange("email", event.target.value)}
            placeholder="name@example.org"
            autoComplete="off"
            required
          />
        </label>
        <label>
          Phone number (optional)
          <input
            type="tel"
            value={memberForm.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            autoComplete="off"
          />
        </label>
        <label>
          Country
          <select
            value={canChooseCountry ? memberForm.country : currentUserCountry || memberForm.country}
            onChange={(event) => onChange("country", event.target.value)}
            disabled={!canChooseCountry}
            required
          >
            <option value="">Select country</option>
            {(countries || COUNTRY_OPTIONS).map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          {!canChooseCountry && currentUserCountry && (
            <small>New members will be created under {currentUserCountry}.</small>
          )}
        </label>
        <label>
          Role
          <select
            value={memberForm.role}
            onChange={(event) => onChange("role", event.target.value)}
          >
            <option value="MEMBER">Member</option>
            <option value="CHAIRPERSON">Chairperson</option>
          </select>
        </label>
      </div>

      <label className="committee-notes-field">
        Notes (optional)
        <textarea
          rows="3"
          value={memberForm.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder="Area of expertise or availability"
        />
      </label>

      <label className="committee-login-check">
        <input
          type="checkbox"
          checked={memberForm.createLogin}
          onChange={(event) => onChange("createLogin", event.target.checked)}
        />
        Let this member sign in to the committee workspace
      </label>

      {memberForm.createLogin && (
        <PasswordFields
          password={memberForm.password}
          confirmPassword={memberForm.confirmPassword}
          onPasswordChange={(value) => onChange("password", value)}
          onConfirmPasswordChange={(value) => onChange("confirmPassword", value)}
          person={memberForm}
          note={ADMIN_PASSWORD_NOTE}
        />
      )}

      <div className="committee-form-actions">
        <button type="submit" className="btn committee-primary-action" disabled={submitting}>
          <i className="bi bi-person-plus" aria-hidden="true" /> {submitting ? "Adding..." : "Add member"}
        </button>
      </div>
    </form>
  );
}

function formatApplicantLocation(applicant) {
  return [
    applicant?.country,
    applicant?.county,
    applicant?.subCounty,
    applicant?.state,
    applicant?.region,
    applicant?.district,
    applicant?.town,
  ].filter(Boolean).join(" · ") || "Not available";
}

function ApplicantMiniProfile({ applicant }) {
  if (!applicant) return null;

  return (
    <>
      {applicant.isAnonymized && (
        <div className="committee-privacy-notice">
          <i className="bi bi-incognito" aria-hidden="true" />
          <span>Identity hidden for blind review. Full names and contacts are only available in the selected participants verification report.</span>
        </div>
      )}

      <div className="committee-profile-grid">
        <div>
          <span>{applicant.isAnonymized ? "Anonymous applicant" : "Applicant"}</span>
          <strong>{applicant.fullName || "Applicant"}</strong>
        </div>
        <div>
          <span>Participant ID</span>
          <strong>{applicant.participantCode || "Not available"}</strong>
        </div>
        <div>
          <span>Reference</span>
          <strong>{applicant.applicationReference || "Not available"}</strong>
        </div>
        <div>
          <span>Pathway</span>
          <strong>{formatPathwayLabel(applicant.pathway)}</strong>
        </div>
        <div>
          <span>{applicant.isAnonymized ? "Country" : "Location"}</span>
          <strong>{applicant.isAnonymized ? applicant.country || "Not available" : formatApplicantLocation(applicant)}</strong>
        </div>
        <div>
          <span>Age at application</span>
          <strong>{applicant.ageAtApplication ?? "Not available"}</strong>
        </div>
        <div>
          <span>Disability</span>
          <strong>{applicant.hasDisability ? applicant.disabilityType || "Yes" : "No"}</strong>
        </div>
        <div>
          <span>Education</span>
          <strong>{applicant.educationLevel || "Not available"}</strong>
        </div>
        <div>
          <span>Employment</span>
          <strong>{applicant.employmentStatus || "Not available"}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{formatStatusLabel(applicant.status)}</strong>
        </div>
      </div>
    </>
  );
}

function UnassignedApplicantCard({ applicant, onAssign, assigning }) {
  const test = applicant?.skillsTest;

  return (
    <article className="committee-waiting-card">
      <div className="committee-waiting-icon" aria-hidden="true">
        <i className="bi bi-person-lines-fill" />
      </div>
      <div className="committee-waiting-main">
        <h3>{applicant.fullName || "Applicant"}</h3>
        <p>{getApplicantSubtitle(applicant)}</p>
        <div className="committee-waiting-meta">
          {applicant.isAnonymized ? (
            <span><i className="bi bi-shield-lock" aria-hidden="true" /> Identity hidden</span>
          ) : (
            <span><i className="bi bi-telephone" aria-hidden="true" /> {applicant.contactNumber || "No phone"}</span>
          )}
          {test && <span><i className="bi bi-journal-check" aria-hidden="true" /> Test {test.score}/{test.maxScore} ({test.percentage}%)</span>}
          <span><i className="bi bi-clock" aria-hidden="true" /> Ready {formatDate(applicant.updatedAt)}</span>
        </div>
      </div>
      <button
        type="button"
        className="btn committee-primary-action"
        onClick={() => onAssign(applicant.id)}
        disabled={assigning}
      >
        <i className="bi bi-magic" aria-hidden="true" />
        {assigning ? "Assigning..." : "Auto-assign"}
      </button>
    </article>
  );
}

function ApplicantsWaitingPanel({ applicants, onAssignApplicant, assigningApplicantId, onAutoAssignAll, assigningAll }) {
  if (!applicants.length) return null;

  return (
    <section className="committee-section-card committee-waiting-panel">
      <div className="committee-section-header with-filters">
        <div>
          <span className="ss-small-label dark">Waiting for assignment</span>
          <h2>Applicants who need to be assigned</h2>
          <p>These applicants have completed the Basic IT Skills Test but are not yet assigned to any committee member.</p>
        </div>
        <button type="button" className="btn committee-primary-action" onClick={onAutoAssignAll} disabled={assigningAll}>
          <i className="bi bi-magic" aria-hidden="true" />
          {assigningAll ? "Assigning..." : "Auto-assign all"}
        </button>
      </div>
      <div className="committee-waiting-list">
        {applicants.map((applicant) => (
          <UnassignedApplicantCard
            key={applicant.id}
            applicant={applicant}
            onAssign={onAssignApplicant}
            assigning={assigningApplicantId === applicant.id}
          />
        ))}
      </div>
    </section>
  );
}

function AssignmentCard({ assignment, members, canReassign, onSelect, onReassign, activeAssignmentId, reassigning }) {
  const [toMemberId, setToMemberId] = useState(assignment.committeeMember?.id || "");
  const [reason, setReason] = useState("");
  const [showReassign, setShowReassign] = useState(false);
  const isActive = activeAssignmentId === assignment.id;
  const applicant = assignment.applicant;
  const test = applicant?.skillsTest;

  return (
    <article className={`committee-assignment-card ${isActive ? "active" : ""}`}>
      <div className="committee-assignment-top">
        <button type="button" className="committee-assignment-title" onClick={() => onSelect(assignment)}>
          <span>{applicant?.fullName || "Applicant"}</span>
          <small>{getApplicantSubtitle(applicant)}</small>
        </button>
        <span className={`committee-assignment-status status-${assignment.status?.toLowerCase()}`}>
          {formatCode(assignment.status, "Assigned")}
        </span>
      </div>

      <div className="committee-assignment-meta">
        <span><i className="bi bi-person-badge" aria-hidden="true" /> {assignment.committeeMember?.fullName || "Unassigned"}</span>
        <span><i className="bi bi-clock" aria-hidden="true" /> {formatDate(assignment.assignedAt)}</span>
        {test && (
          <span><i className="bi bi-journal-check" aria-hidden="true" /> Test {test.score}/{test.maxScore} ({test.percentage}%)</span>
        )}
      </div>

      <div className="cw-assignment-actions">
        <button
          id={`committee-open-review-${assignment.id}`}
          type="button"
          className="btn committee-small-action"
          onClick={() => onSelect(assignment)}
        >
          <i className="bi bi-file-earmark-text" aria-hidden="true" />
          {assignment.status === "COMPLETED" ? " View review" : " Open review"}
        </button>
        {canReassign && assignment.status !== "COMPLETED" && (
          <button
            type="button"
            className="cw-link-button"
            aria-expanded={showReassign}
            onClick={() => setShowReassign((current) => !current)}
          >
            <i className={`bi ${showReassign ? "bi-chevron-up" : "bi-arrow-left-right"}`} aria-hidden="true" />
            {showReassign ? " Cancel reassignment" : " Reassign"}
          </button>
        )}
      </div>

      {canReassign && showReassign && (
        <div className="committee-reassign-row">
          <select aria-label="Reassign to committee member" value={toMemberId} onChange={(event) => setToMemberId(event.target.value)}>
            <option value="">Reassign to...</option>
            {members
              .filter((member) => member.isActive && member.role === "MEMBER")
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
          </select>
          <input
            type="text"
            aria-label="Reason for reassignment"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for reassignment"
          />
          <button
            type="button"
            className="btn committee-small-action"
            disabled={!toMemberId || toMemberId === assignment.committeeMember?.id || reassigning}
            onClick={() => onReassign(assignment.id, toMemberId, reason)}
          >
            Reassign
          </button>
        </div>
      )}
    </article>
  );
}

function SelectedParticipantsReport({
  rows,
  scope,
  generatedAt,
  onResendRegistration,
  resendingRegistrationId,
}) {
  return (
    <section className="committee-section-card committee-selected-report-card">
      <div className="committee-section-header with-filters">
        <div>
          <span className="ss-small-label dark">Verification report</span>
          <h2>Selected participants for verification</h2>
          <p>Full participant details are shown here only after selection so the chairperson can coordinate phone or physical verification before DHIS2 enrolment.</p>
        </div>
        <div className="committee-report-actions">
          <span>{rows.length} selected</span>
          <button
            type="button"
            className="btn committee-secondary-action"
            onClick={() => downloadSelectedParticipantsCsv(rows, scope)}
            disabled={!rows.length}
          >
            <i className="bi bi-download" aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>

      <div className="committee-report-note">
        <i className="bi bi-shield-check" aria-hidden="true" />
        <span>This report contains names and contacts for verification only. It should not be used during blind committee scoring.</span>
      </div>

      {!rows.length ? (
        <div className="committee-empty-state compact">
          <i className="bi bi-clipboard2-check" aria-hidden="true" />
          <h3>No selected participants yet</h3>
          <p>Applicants will appear here after the committee records a Selected decision.</p>
        </div>
      ) : (
        <div className="committee-report-table-wrap">
          <table className="committee-report-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Country</th>
                <th>Location</th>
                <th>Pathway</th>
                <th>Disability</th>
                <th>Test</th>
                <th>Participant registration</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.applicationReference || row.participantCode || "Not available"}</strong>
                    {row.participantCode && <small>{row.participantCode}</small>}
                  </td>
                  <td>
                    <strong>{row.fullName || "Not available"}</strong>
                    <small>{row.email || "No email"}</small>
                  </td>
                  <td>
                    <strong>{row.contactNumber || "No phone"}</strong>
                    {row.alternativeContactNumber && <small>Alt: {row.alternativeContactNumber}</small>}
                  </td>
                  <td>{row.country || "Not available"}</td>
                  <td>
                    <strong>{[row.firstAdminLevel, row.districtLevel].filter(Boolean).join(" · ") || "Not available"}</strong>
                    {row.town && <small>{row.town}</small>}
                  </td>
                  <td>{formatPathwayLabel(row.pathway)}</td>
                  <td>
                    <strong>{formatYesNo(row.hasDisability)}</strong>
                    <small>{row.disabilityType || row.otherDisabilityType || "Not stated"}</small>
                  </td>
                  <td>{row.skillsTest ? `${row.skillsTest.percentage}%` : "Not applicable"}</td>
                  <td>
                    {row.participantRegistration?.applicable ? (
                      <>
                        <strong>{formatCode(row.participantRegistration.status, "NOT_SENT")}</strong>
                        {row.participantRegistration.sentAt && (
                          <small>SMTP accepted {formatDate(row.participantRegistration.sentAt)}</small>
                        )}
                        {row.participantRegistration.emailError && (
                          <small className="committee-email-error">
                            {row.participantRegistration.emailError}
                          </small>
                        )}
                        {row.participantRegistration.submittedAt && (
                          <small>Submitted {formatDate(row.participantRegistration.submittedAt)}</small>
                        )}
                        {row.participantRegistration.status !== "SUBMITTED" && (
                          <button
                            type="button"
                            className="btn committee-small-action mt-2"
                            disabled={resendingRegistrationId === row.id}
                            onClick={() => onResendRegistration(row)}
                          >
                            <i className="bi bi-envelope-arrow-up" aria-hidden="true" />
                            {resendingRegistrationId === row.id ? " Sending..." : " Send / resend"}
                          </button>
                        )}
                      </>
                    ) : (
                      <span>Not applicable</span>
                    )}
                  </td>
                  <td>
                    <strong>{row.verificationStatus || "Pending verification"}</strong>
                    <small>{row.reviewedAt ? `Selected ${formatDate(row.reviewedAt)}` : "Selection date not available"}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {generatedAt && <p className="committee-report-generated">Generated {formatDate(generatedAt)}</p>}
    </section>
  );
}

function SkillsTestDeliveryPanel({ delivery, onResend, sendingReference }) {
  const records = (delivery?.records || []).filter(
    (row) => row.status !== "TEST_COMPLETED"
  );
  const failures = records.filter((row) =>
    ["EMAIL_FAILED", "NOT_CREATED", "PENDING", "EXPIRED"].includes(row.status)
  );

  return (
    <section className="committee-section-card committee-email-delivery-card">
      <div className="committee-section-header">
        <div>
          <span className="ss-small-label dark">Email delivery</span>
          <h2>Basic IT Skills Test invitations</h2>
          <p>
            {failures.length} invitation{failures.length === 1 ? "" : "s"} need attention.
            An SMTP-accepted email may still go to spam or be delayed.
          </p>
        </div>
      </div>
      {records.length === 0 ? (
        <p className="committee-empty-text">
          There are no pending Basic IT Skills Test invitations in the latest results.
        </p>
      ) : (
        <div className="committee-report-table-wrap">
          <table className="committee-report-table committee-email-delivery-table">
            <thead>
              <tr>
                <th>Application reference</th>
                <th>Country</th>
                <th>Recipient</th>
                <th>Email status</th>
                <th>Last sent</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 60).map((row) => (
                <tr key={row.applicantId}>
                  <td>{row.applicationReference}</td>
                  <td>{row.country}</td>
                  <td>{row.emailTo || "Email missing"}</td>
                  <td>
                    <strong>{formatCode(row.status, "Unknown")}</strong>
                    {row.emailError && (
                      <small>{row.emailError}</small>
                    )}
                  </td>
                  <td>{row.sentAt ? formatDate(row.sentAt) : "Not sent"}</td>
                  <td>
                    {row.canResend && row.status !== "OPENED" && (
                      <button
                        type="button"
                        className="btn committee-small-action"
                        onClick={() => onResend(row)}
                        disabled={!row.emailTo || sendingReference === row.applicationReference}
                      >
                        <i className="bi bi-envelope-arrow-up" aria-hidden="true" />
                        {sendingReference === row.applicationReference ? " Sending..." : " Resend test email"}
                      </button>
                    )}
                    {row.status === "OPENED" && <small>Link already opened</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="committee-delivery-help">
        {delivery?.note ||
          "SENT confirms SMTP acceptance only. Ask applicants to check spam or junk and verify their application email address."}
      </p>
    </section>
  );
}

function ReviewPanel({
  assignment,
  applicationDetail,
  applicationLoading,
  applicationError,
  onStartReview,
  onSubmitReview,
  submittingReview,
}) {
  const [decision, setDecision] = useState("SELECTED");
  const [comments, setComments] = useState("");
  const [panelStatus, setPanelStatus] = useState("");
  const decisionGroupRef = useRef(null);

  // "Start review" disappears once the review starts, so move focus to the decision choices
  // instead of letting it fall back to the page behind the dialog.
  async function startReview() {
    const started = await onStartReview(assignment.id);
    if (!started) return;
    setPanelStatus("Review started. Choose a committee decision below.");
    window.requestAnimationFrame(() => {
      const selected = decisionGroupRef.current?.querySelector('[aria-pressed="true"]');
      (selected || decisionGroupRef.current?.querySelector("button"))?.focus();
    });
  }

  useEffect(() => {
    setDecision("SELECTED");
    setComments("");
  }, [assignment?.id]);

  if (!assignment) {
    return null;
  }

  const applicant = assignment.applicant;
  const test = applicant?.skillsTest;
  const review = assignment.review;

  return (
    <section className="committee-review-panel">
      <div className="committee-panel-header">
        <div>
          <span className="ss-small-label dark">Review workspace</span>
          <h2>{applicant?.fullName || "Applicant"}</h2>
          <p>{getApplicantSubtitle(applicant)}</p>
        </div>
        <span className="committee-score-badge">
          {test ? `${test.score}/${test.maxScore}` : "No test"}
        </span>
      </div>

      {test && (
        <div className="committee-test-card">
          <div>
            <span>Basic IT Skills Test</span>
            <strong>{test.percentage}%</strong>
          </div>
          <p>
            {test.passed
              ? `Reached the pass mark${test.passMark != null ? ` (${test.passMark}/${test.maxScore})` : ""}`
              : `Below the pass mark${test.passMark != null ? ` (${test.passMark}/${test.maxScore})` : ""}. Follow up before deciding.`}
          </p>
        </div>
      )}

      <ApplicantMiniProfile applicant={applicant} />

      <section className="committee-full-application" aria-labelledby="committee-full-application-title">
        <div className="committee-full-application-heading">
          <div>
            <span className="ss-small-label dark">Submitted application</span>
            <h3 id="committee-full-application-title">Full application answers</h3>
            <p>All submitted answers relevant to review, with identifying details hidden.</p>
          </div>
          {applicationDetail && (
            <span className="committee-full-application-count">
              {applicationDetail.questions?.length || 0} answers
            </span>
          )}
        </div>

        {applicationLoading && (
          <div className="committee-full-application-loading" role="status">
            <i className="bi bi-hourglass-split" aria-hidden="true" />
            Loading the submitted application...
          </div>
        )}

        {applicationError && (
          <div className="alert alert-warning" role="alert">{applicationError}</div>
        )}

        {applicationDetail && (
          <>
            <div className="committee-full-application-privacy" role="note">
              <i className="bi bi-shield-lock" aria-hidden="true" />
              <p>{applicationDetail.note}</p>
            </div>
            <div className="committee-full-application-facts">
              <span><strong>Country:</strong> {applicationDetail.country || "Not available"}</span>
              <span><strong>Age at application:</strong> {applicationDetail.ageAtApplication ?? "Not available"}</span>
              <span><strong>Supporting documents:</strong> {applicationDetail.documentCount ?? 0} received (not displayed in blind review)</span>
            </div>
            {(applicationDetail.questions || []).length === 0 ? (
              <p className="committee-empty-text">
                There are no application responses saved for this participant.
              </p>
            ) : (
              Object.entries(
                (applicationDetail.questions || []).reduce((sections, item) => {
                  const section = item.section || "Other application questions";
                  if (!sections[section]) sections[section] = [];
                  sections[section].push(item);
                  return sections;
                }, {})
              ).map(([section, questions]) => (
                <section key={section} className="committee-answers-section">
                  <h4>{section.replace(/^Section\s+\d+\s*:\s*/i, "").replace(/\.$/, "")}</h4>
                  <dl>
                    {questions.map((item) => (
                      <div className="committee-answer-row" key={item.questionCode}>
                        <dt>{item.questionText}</dt>
                        <dd>
                          {Array.isArray(item.answer)
                            ? item.answer.length > 0
                              ? item.answer.join("; ")
                              : "Not answered"
                            : item.answer === "" || item.answer === null || item.answer === undefined
                              ? "Not answered"
                              : String(item.answer)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))
            )}
          </>
        )}
      </section>

      {review ? (
        <div className="committee-existing-review">
          <span>Decision submitted</span>
          <h3>{formatDecision(review.decision)}</h3>
          <p>{review.comments || "No comment was provided."}</p>
          <small>Reviewed on {formatDate(review.reviewedAt)}</small>
        </div>
      ) : (
        <form
          className="committee-decision-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitReview(assignment.id, { decision, comments });
          }}
        >
          {assignment.status === "ASSIGNED" && (
            <button
              type="button"
              className="btn committee-secondary-action"
              onClick={startReview}
            >
              <i className="bi bi-play-circle" aria-hidden="true" /> Start review
            </button>
          )}

          <p className="visually-hidden" role="status">{panelStatus}</p>

          <fieldset className="committee-decision-fieldset">
            <legend>Committee decision</legend>
            <div className="committee-decision-grid" ref={decisionGroupRef}>
              {REVIEW_DECISIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`committee-decision-option ${decision === item.value ? "selected" : ""}`}
                  aria-pressed={decision === item.value}
                  onClick={() => setDecision(item.value)}
                >
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label>
            Review comments
            <textarea
              rows="4"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              placeholder="Add the committee rationale, conditions, or next actions."
            />
          </label>

          <button type="submit" className="btn committee-primary-action" disabled={submittingReview}>
            <i className="bi bi-check2-circle" aria-hidden="true" />
            {submittingReview ? "Saving decision..." : "Save committee decision"}
          </button>
        </form>
      )}
    </section>
  );
}

function CommitteeDashboardPage({ staffUser, onBackHome, onStaffLogout, onSessionExpired, onManageAccess, onShowParticipants }) {
  const [overview, setOverview] = useState(null);
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [unassignedApplicants, setUnassignedApplicants] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [applicationDetail, setApplicationDetail] = useState(null);
  const [loadingApplicationDetail, setLoadingApplicationDetail] = useState(false);
  const [applicationDetailError, setApplicationDetailError] = useState("");
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM);
  const [countryAdminForm, setCountryAdminForm] = useState(EMPTY_COUNTRY_ADMIN_FORM);
  const [countryAdmins, setCountryAdmins] = useState([]);
  const [selectedReport, setSelectedReport] = useState({ rows: [], reportScope: "", generatedAt: null });
  const [filterMemberId, setFilterMemberId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addingCountryAdmin, setAddingCountryAdmin] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assigningApplicantId, setAssigningApplicantId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [resendingRegistrationId, setResendingRegistrationId] = useState("");
  const [skillsEmailDelivery, setSkillsEmailDelivery] = useState({ records: [], totals: {}, note: "" });
  const [sendingTestEmailReference, setSendingTestEmailReference] = useState("");
  const [activeSection, setActiveSection] = useState(readSectionFromHash);
  const [countryFilter, setCountryFilter] = useState(readSavedCountryFilter);
  const [showAddMember, setShowAddMember] = useState(false);
  const [referenceFilter, setReferenceFilter] = useState("");
  const sectionRef = useRef(null);
  const lastOpenedTile = useRef("");

  const userRole = staffUser?.role || "";
  const isSuperAdmin = userRole === "ADMIN";
  const currentUserCountry = overview?.currentUserCountry || staffUser?.country || "";
  const countries = overview?.countries || COUNTRY_OPTIONS;
  const canManageCommittee = ["ADMIN", "COUNTRY_ADMIN", "COMMITTEE_CHAIRPERSON"].includes(userRole);
  const canViewUnassignedApplicants = ["ADMIN", "COUNTRY_ADMIN", "COMMITTEE_CHAIRPERSON", "VIEWER"].includes(userRole);
  const canViewSelectedReport = ["ADMIN", "COMMITTEE_CHAIRPERSON"].includes(userRole);
  const canReassignApplicants = canManageCommittee;
  const canViewDelivery = ["ADMIN", "COUNTRY_ADMIN"].includes(userRole);
  // Only super admins work across countries; everyone else is fixed to their own on the server.
  const canFilterByCountry = isSuperAdmin;
  const scopedCountry = canFilterByCountry ? countryFilter : "";

  const selectedAssignmentFromList = useMemo(() => {
    if (!selectedAssignment?.id) return selectedAssignment;
    return assignments.find((assignment) => assignment.id === selectedAssignment.id) || selectedAssignment;
  }, [assignments, selectedAssignment]);

  function handleApiError(errorObject, fallbackMessage) {
    const status = errorObject.response?.status;
    if (status === 401) {
      setError("Your staff session has expired. Please sign in again.");
      onSessionExpired?.();
      return;
    }

    setError(errorObject.response?.data?.message || fallbackMessage);
  }

  async function loadCommitteeData() {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams();
      if (filterMemberId && !["COMMITTEE_MEMBER"].includes(userRole)) query.set("memberId", filterMemberId);
      if (filterStatus) query.set("status", filterStatus);
      if (search.trim()) query.set("search", search.trim());
      if (scopedCountry) query.set("country", scopedCountry);

      const requests = [
        axios.get(withCountry(`${API_BASE_URL}/api/committee/overview`, scopedCountry)),
        axios.get(`${API_BASE_URL}/api/committee/assignments?${query.toString()}`),
      ];

      if (canViewUnassignedApplicants) {
        requests.push(axios.get(withCountry(`${API_BASE_URL}/api/committee/unassigned-ready`, scopedCountry)));
      }

      const [overviewResponse, assignmentsResponse, unassignedResponse] = await Promise.all(requests);
      let staffUsers = [];
      let selectedReportResponse = null;

      if (isSuperAdmin) {
        const staffUsersResponse = await axios.get(`${API_BASE_URL}/api/auth/users`);
        staffUsers = staffUsersResponse.data?.users || [];
      }

      if (canViewSelectedReport) {
        selectedReportResponse = await axios.get(withCountry(`${API_BASE_URL}/api/committee/selected-report`, scopedCountry));
      }

      setOverview({
        ...(overviewResponse.data?.overview || {}),
        countries: overviewResponse.data?.countries || COUNTRY_OPTIONS,
        currentUserCountry: overviewResponse.data?.currentUserCountry || "",
      });
      setMembers(overviewResponse.data?.members || []);
      setAssignments(assignmentsResponse.data?.assignments || []);
      setUnassignedApplicants(canViewUnassignedApplicants ? (unassignedResponse?.data?.applicants || []) : []);
      setCountryAdmins(staffUsers.filter((user) => user.role === "COUNTRY_ADMIN" && (!scopedCountry || user.country === scopedCountry)));
      if (canViewDelivery) {
        try {
          const deliveryResponse = await axios.get(
            withCountry(`${API_BASE_URL}/api/basic-skills-test/invitations/delivery-report`, scopedCountry)
          );
          setSkillsEmailDelivery(deliveryResponse.data || { records: [], totals: {}, note: "" });
        } catch (deliveryError) {
          console.warn("Unable to load test-invitation delivery report", deliveryError.response?.status);
        }
      }
      setSelectedReport(canViewSelectedReport ? {
        rows: selectedReportResponse?.data?.rows || [],
        reportScope: selectedReportResponse?.data?.reportScope || currentUserCountry || "",
        generatedAt: selectedReportResponse?.data?.generatedAt || null,
      } : { rows: [], reportScope: "", generatedAt: null });
    } catch (loadError) {
      handleApiError(loadError, "Failed to load committee dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCommitteeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedCountry]);

  useEffect(() => {
    function handleHashChange() {
      setActiveSection(readSectionFromHash());
    }
    window.addEventListener("popstate", handleHashChange);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("popstate", handleHashChange);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Opening a workspace moves focus into it; going back returns focus to the tile that opened it.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (activeSection) {
        sectionRef.current?.focus({ preventScroll: true });
        sectionRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
      } else if (lastOpenedTile.current) {
        document.getElementById(`committee-tile-${lastOpenedTile.current}`)?.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSection]);

  function openSection(id) {
    lastOpenedTile.current = id;
    setActiveSection(id);
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
  }

  function showAllSections() {
    setActiveSection("");
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  function handleCountryFilterChange(country) {
    setCountryFilter(country);
    setFilterMemberId("");
    try {
      if (country) window.localStorage.setItem(COUNTRY_FILTER_KEY, country);
      else window.localStorage.removeItem(COUNTRY_FILTER_KEY);
    } catch {
      // The filter still works for this visit without storage.
    }
  }
  // Escape is handled in an effect that only re-runs when the dialog opens, so it reads the latest close function.
  const closeReviewModalRef = useRef(null);
  useEffect(() => {
    closeReviewModalRef.current = closeReviewModal;
  });

  useEffect(() => {
    if (!selectedAssignment?.id) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The page behind the dialog can't be reached by keyboard or screen reader while it is open.
    const appRoot = document.getElementById("root");
    if (appRoot) appRoot.inert = true;
    const focusFrame = window.requestAnimationFrame(() => {
      document.getElementById("committee-review-close-button")?.focus();
    });

    function handleModalKeys(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeReviewModalRef.current?.();
      }

      if (event.key === "Tab") {
        const dialog = document.querySelector(".committee-review-dialog");
        const focusable = Array.from(
          dialog?.querySelectorAll(
            'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) || []
        ).filter((element) => element.getClientRects().length > 0);

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && (active === first || !dialog?.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !dialog?.contains(active))) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleModalKeys);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      if (appRoot) appRoot.inert = false;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleModalKeys);
    };
  }, [selectedAssignment?.id]);



  useEffect(() => {
    if (!isSuperAdmin && currentUserCountry && memberForm.country !== currentUserCountry) {
      setMemberForm((current) => ({ ...current, country: currentUserCountry }));
    }
  }, [currentUserCountry, isSuperAdmin, memberForm.country]);

  async function handleAddCountryAdmin(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    const missing = !countryAdminForm.fullName.trim() || !countryAdminForm.email.trim() || !countryAdminForm.country;
    const passwordProblem = getPasswordPairProblem(countryAdminForm.password, countryAdminForm.confirmPassword, countryAdminForm);
    if (missing || passwordProblem) {
      setError(missing ? "Enter the full name, email address and country for the new country admin." : passwordProblem);
      return;
    }
    setAddingCountryAdmin(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/users`, {
        ...countryAdminForm,
        role: "COUNTRY_ADMIN",
      });
      setMessage(response.data?.message || "Country admin added.");
      setCountryAdminForm(EMPTY_COUNTRY_ADMIN_FORM);
      await loadCommitteeData();
    } catch (submitError) {
      handleApiError(submitError, "Failed to add country admin.");
    } finally {
      setAddingCountryAdmin(false);
    }
  }

  async function handleAddMember(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    const country = isSuperAdmin ? memberForm.country : currentUserCountry;
    if (!memberForm.fullName.trim() || !memberForm.email.trim() || !country) {
      setError("Enter the member's full name, email address and country.");
      return;
    }
    if (memberForm.createLogin) {
      const passwordProblem = getPasswordPairProblem(memberForm.password, memberForm.confirmPassword, memberForm);
      if (passwordProblem) {
        setError(passwordProblem);
        return;
      }
    }
    setAddingMember(true);

    try {
      const { password, confirmPassword, ...details } = memberForm;
      const payload = {
        ...details,
        ...(memberForm.createLogin ? { password, confirmPassword } : {}),
        country,
      };
      const response = await axios.post(`${API_BASE_URL}/api/committee/members`, payload);
      setMessage(response.data?.message || "Committee member added.");
      setMemberForm(isSuperAdmin ? EMPTY_MEMBER_FORM : { ...EMPTY_MEMBER_FORM, country: currentUserCountry });
      await loadCommitteeData();
    } catch (submitError) {
      handleApiError(submitError, "Failed to add committee member.");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleToggleMember(member) {
    setMessage("");
    setError("");

    try {
      const response = await axios.patch(`${API_BASE_URL}/api/committee/members/${member.id}`, {
        isActive: !member.isActive,
      });
      setMessage(response.data?.message || "Committee member updated.");
      await loadCommitteeData();
    } catch (toggleError) {
      handleApiError(toggleError, "Failed to update committee member.");
    }
  }

  function describeActionError(actionError, fallbackMessage) {
    if (actionError.response?.status === 401) {
      onSessionExpired?.();
      return "Your staff session has expired. Please sign in again.";
    }
    return actionError.response?.data?.message || fallbackMessage;
  }

  async function handleSetMemberPassword(memberId, password, confirmPassword) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/committee/members/${memberId}/login`, {
        password,
        confirmPassword,
      });
      await loadCommitteeData();
      return { ok: true, message: response.data?.message || "Login saved." };
    } catch (loginError) {
      return { ok: false, message: describeActionError(loginError, "Failed to save the login.") };
    }
  }

  async function handleSendMemberReset(memberId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/committee/members/${memberId}/password-reset`);
      return { ok: true, message: response.data?.message || "Password reset link sent." };
    } catch (resetError) {
      return { ok: false, message: describeActionError(resetError, "Failed to send the password reset link.") };
    }
  }

  async function handleSendStaffReset(userId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/users/${userId}/password-reset`);
      return { ok: true, message: response.data?.message || "Password reset link sent." };
    } catch (resetError) {
      return { ok: false, message: describeActionError(resetError, "Failed to send the password reset link.") };
    }
  }

  async function handleAutoAssign() {
    setAssigning(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/committee/auto-assign`,
        scopedCountry ? { country: scopedCountry } : {}
      );
      setMessage(response.data?.message || "Automatic assignment completed.");
      await loadCommitteeData();
    } catch (assignError) {
      handleApiError(assignError, "Failed to run automatic assignment.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleAssignApplicant(applicantId) {
    setAssigningApplicantId(applicantId);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/committee/applicants/${applicantId}/assign`);
      setMessage(response.data?.message || "Applicant assigned successfully.");
      await loadCommitteeData();
    } catch (assignError) {
      handleApiError(assignError, "Failed to assign applicant.");
    } finally {
      setAssigningApplicantId("");
    }
  }

  async function handleReassign(assignmentId, toCommitteeMemberId, reason) {
    setReassigning(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.patch(`${API_BASE_URL}/api/committee/assignments/${assignmentId}/reassign`, {
        toCommitteeMemberId,
        reason,
      });
      setMessage(response.data?.message || "Applicant reassigned.");
      setSelectedAssignment(response.data?.assignment || selectedAssignment);
      await loadCommitteeData();
    } catch (reassignError) {
      handleApiError(reassignError, "Failed to reassign applicant.");
    } finally {
      setReassigning(false);
    }
  }

  async function handleStartReview(assignmentId) {
    setMessage("");
    setError("");

    try {
      const response = await axios.patch(`${API_BASE_URL}/api/committee/assignments/${assignmentId}/start`);
      setMessage(response.data?.message || "Review started.");
      setSelectedAssignment(response.data?.assignment || selectedAssignment);
      await loadCommitteeData();
      return true;
    } catch (startError) {
      handleApiError(startError, "Failed to start review.");
      return false;
    }
  }

  async function handleSubmitReview(assignmentId, reviewPayload) {
    setSubmittingReview(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/committee/assignments/${assignmentId}/review`, reviewPayload);
      // The decision is done: close the review and return to the board, where the message is announced.
      closeReviewModal();
      setMessage(response.data?.message || "Committee decision saved.");
      await loadCommitteeData();
      // The board re-renders after reloading, so return focus once the application's button is back.
      focusReviewOpener(assignmentId);
    } catch (reviewError) {
      handleApiError(reviewError, "Failed to submit committee review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  function closeReviewModal() {
    const assignmentId = selectedAssignment?.id;
    setSelectedAssignment(null);
    setApplicationDetail(null);
    setApplicationDetailError("");
    focusReviewOpener(assignmentId);
  }

  // Focus goes back to the application's "Open review" button on the board.
  function focusReviewOpener(assignmentId) {
    window.requestAnimationFrame(() => {
      document.getElementById(`committee-open-review-${assignmentId}`)?.focus();
    });
  }

  async function openReviewModal(assignment) {
    setSelectedAssignment(assignment);
    setApplicationDetail(null);
    setApplicationDetailError("");
    setLoadingApplicationDetail(true);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/committee/assignments/${encodeURIComponent(assignment.id)}/application`
      );
      setApplicationDetail(response.data);
    } catch (loadError) {
      setApplicationDetailError(
        loadError.response?.data?.message ||
          "Unable to load the full application. Please close and try again."
      );
    } finally {
      setLoadingApplicationDetail(false);
    }
  }

  async function handleResendSkillsTestInvitation(row) {
    if (!row.applicationReference) return;

    setSendingTestEmailReference(row.applicationReference);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/basic-skills-test/invitations/${encodeURIComponent(row.applicationReference)}/send`
      );
      setMessage(response.data?.message || "Test invitation request processed.");
      await loadCommitteeData();
    } catch (sendError) {
      handleApiError(sendError, "Unable to resend the Basic IT Skills Test invitation.");
    } finally {
      setSendingTestEmailReference("");
    }
  }

  async function handleResendParticipantRegistration(row) {
    const reference = row.applicationReference || row.participantCode || row.id;
    if (!reference) return;

    setResendingRegistrationId(row.id);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/participant-registration/invitations/${encodeURIComponent(reference)}/send`
      );
      setMessage(response.data?.message || "Participant registration invitation sent.");
      await loadCommitteeData();
    } catch (sendError) {
      handleApiError(sendError, "Failed to send the participant registration invitation.");
    } finally {
      setResendingRegistrationId("");
    }
  }

  const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  const referenceTerm = referenceFilter.toUpperCase().replace(/\s+/g, "");
  const clearReferenceFilter = () => setReferenceFilter("");
  const shownAssignments = assignments.filter((assignment) =>
    matchesReference(referenceTerm, assignment.applicant?.applicationReference, assignment.applicant?.participantCode)
  );
  const shownUnassigned = unassignedApplicants.filter((applicant) =>
    matchesReference(referenceTerm, applicant.applicationReference, applicant.participantCode)
  );
  const shownDelivery = {
    ...skillsEmailDelivery,
    records: (skillsEmailDelivery.records || []).filter((row) => matchesReference(referenceTerm, row.applicationReference)),
  };
  const shownSelectedRows = selectedReport.rows.filter((row) =>
    matchesReference(referenceTerm, row.applicationReference, row.participantCode)
  );
  // The overview totals cover everything, so a reference search counts from the loaded list instead.
  const countFromList = userRole === "COMMITTEE_MEMBER" || Boolean(referenceTerm);
  const openReviewCount = countFromList
    ? shownAssignments.filter((assignment) => OPEN_ASSIGNMENT_STATUSES.includes(assignment.status)).length
    : overview?.assignedPending || 0;
  const completedCount = countFromList
    ? shownAssignments.filter((assignment) => assignment.status === "COMPLETED").length
    : overview?.completedReviews || 0;
  const deliveryRecords = shownDelivery.records.filter((row) => row.status !== "TEST_COMPLETED");
  const deliveryAttention = deliveryRecords.filter((row) => DELIVERY_ATTENTION_STATUSES.includes(row.status)).length;
  const reviewsInProgress = members.reduce((sum, member) => sum + (member.workload?.pending || 0), 0);
  const registrationsOutstanding = shownSelectedRows.filter(
    (row) => row.participantRegistration?.applicable && row.participantRegistration.status !== "SUBMITTED"
  ).length;
  const scopeLabel = canFilterByCountry
    ? countryFilter ? `Showing ${countryFilter}` : "Showing all countries"
    : currentUserCountry ? `Showing ${currentUserCountry}` : "Showing your assigned applicants";

  const sections = [
    {
      id: "review",
      title: userRole === "COMMITTEE_MEMBER" ? "My reviews" : "Review board",
      icon: "bi-clipboard2-check",
      tone: "teal",
      count: openReviewCount,
      caption: `${plural(openReviewCount, "review", "reviews")} open · ${completedCount} completed`,
      description: "Open assigned applications, record decisions and reassign reviews.",
      visible: true,
    },
    {
      id: "waiting",
      title: "Waiting for a reviewer",
      icon: "bi-hourglass-split",
      tone: "orange",
      count: shownUnassigned.length,
      caption: shownUnassigned.length ? "Completed the test, no reviewer yet" : referenceTerm ? "No match for this reference" : "Everyone has a reviewer",
      description: "Assign applicants who finished the Basic IT Skills Test to a committee member.",
      attention: shownUnassigned.length > 0,
      visible: canViewUnassignedApplicants && userRole !== "VIEWER",
    },
    {
      id: "invitations",
      title: "Test invitations",
      icon: "bi-envelope-paper",
      tone: "red",
      count: deliveryAttention,
      caption: deliveryAttention ? `${plural(deliveryAttention, "email needs", "emails need")} attention` : `${deliveryRecords.length} waiting on applicants`,
      description: "Check Basic IT Skills Test emails and resend failed or expired links.",
      attention: deliveryAttention > 0,
      visible: canViewDelivery,
    },
    {
      id: "selected",
      title: "Selected participants",
      icon: "bi-patch-check",
      tone: "green",
      count: shownSelectedRows.length,
      caption: registrationsOutstanding ? `${registrationsOutstanding} still to register` : "Ready for verification",
      description: "Verify selected participants, export the list and resend registration links.",
      visible: canViewSelectedReport,
    },
    {
      id: "members",
      title: "Committee members",
      icon: "bi-people",
      tone: "yellow",
      count: overview?.activeMembers || 0,
      caption: `Active · ${plural(reviewsInProgress, "review", "reviews")} in progress`,
      description: canManageCommittee ? "See each member's workload, add members and manage logins." : "See each member's workload.",
      visible: true,
    },
    {
      id: "admins",
      title: "Country admins",
      icon: "bi-person-gear",
      tone: "ink",
      count: countryAdmins.length,
      caption: `${plural(countryAdmins.length, "country admin", "country admins")} set up`,
      description: "Add the admins who manage committees in each country.",
      visible: isSuperAdmin,
    },
  ];
  const visibleSections = sections.filter((section) => section.visible);
  const currentSection = visibleSections.find((section) => section.id === activeSection) || null;

  return (
    <main id="main-content" className="page committee-page">
      <section className="committee-hero">
        <div>
          <button type="button" className="back-button" onClick={onBackHome}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to portal
          </button>
          <p className="eyebrow">Internal review workspace</p>
          <h1>Committee workspace</h1>
          <p>
            Review applications, balance the committee's workload and follow up on participants, all in one place.
          </p>
        </div>
        <div className="committee-hero-card committee-account-card">
          <p className="committee-account-label">Signed in as</p>
          <div className="committee-account-person">
            <span className="committee-account-avatar" aria-hidden="true">{getInitials(staffUser?.fullName || "Staff user")}</span>
            <div className="committee-account-text">
              <strong>{staffUser?.fullName || "Staff user"}</strong>
              <span className="committee-account-role">
                {ROLE_LABELS[userRole] || "Staff"}
                {userRole === "ADMIN" ? " · All countries" : currentUserCountry ? ` · ${currentUserCountry}` : ""}
              </span>
            </div>
          </div>
          <div className="committee-account-actions">
            {["ADMIN", "COUNTRY_ADMIN"].includes(userRole) && onShowParticipants && (
              <button type="button" className="committee-account-action is-primary" onClick={onShowParticipants}>
                <i className="bi bi-people" aria-hidden="true" />
                <span>Participants</span>
              </button>
            )}
            {userRole === "ADMIN" && onManageAccess && (
              <button type="button" className="committee-account-action" onClick={onManageAccess}>
                <i className="bi bi-shield-lock" aria-hidden="true" />
                <span>Access and API keys</span>
              </button>
            )}
            <button type="button" className="committee-account-action" onClick={onStaffLogout}>
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </section>

      <section className="committee-shell">
        {message && <div className="alert alert-success mb-3" role="status">{message}</div>}
        {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}

        <div className="cw-toolbar">
          {currentSection ? (
            <button type="button" className="cw-back" onClick={showAllSections}>
              <i className="bi bi-grid-3x2-gap" aria-hidden="true" /> All workspaces
            </button>
          ) : (
            <div>
              <h2 className="cw-toolbar-title">Workspaces</h2>
              <p className="cw-toolbar-sub">{scopeLabel}. Choose a tile to open it.</p>
            </div>
          )}

          <div className="cw-toolbar-actions">
            <label className="cw-reference-filter">
              <span>Application reference</span>
              <span className="cw-search">
                <i className="bi bi-search" aria-hidden="true" />
                <input
                  type="search"
                  value={referenceFilter}
                  onChange={(event) => setReferenceFilter(event.target.value)}
                  placeholder="e.g. APP-DF-2026-…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="cw-reference-hint"
                />
              </span>
              <span id="cw-reference-hint" className="visually-hidden">
                Filters reviews, the waiting list, test invitations and selected participants. Participant IDs also match.
              </span>
            </label>
            {canFilterByCountry && (
              <label className="cw-country-filter">
                <span>Country</span>
                <span className="cw-select">
                  <select
                    value={countryFilter}
                    onChange={(event) => handleCountryFilterChange(event.target.value)}
                  >
                    <option value="">All countries</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  <i className="bi bi-chevron-down" aria-hidden="true" />
                </span>
              </label>
            )}
            <button
              type="button"
              className="btn committee-secondary-action"
              onClick={loadCommitteeData}
              disabled={loading}
            >
              <i className={`bi bi-arrow-clockwise ${loading ? "cw-spin" : ""}`} aria-hidden="true" />
              {loading ? " Refreshing..." : " Refresh"}
            </button>
          </div>
        </div>

        {referenceTerm && (
          <div className="cw-reference-strip" role="status">
            <i className="bi bi-funnel" aria-hidden="true" />
            <span>
              Showing only applications matching <strong>{referenceFilter.trim()}</strong>
              {currentSection && ["members", "admins"].includes(currentSection.id) ? ". This workspace isn't filtered by reference." : "."}
            </span>
            <button type="button" className="cw-link-button" onClick={clearReferenceFilter}>
              Clear
            </button>
          </div>
        )}

        {!currentSection ? (
          <div className="cw-tile-grid">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                id={`committee-tile-${section.id}`}
                type="button"
                className={`cw-tile cw-tone-${section.tone} ${section.attention ? "needs-attention" : ""}`}
                onClick={() => openSection(section.id)}
              >
                <span className="cw-tile-head">
                  <span className="cw-tile-icon" aria-hidden="true">
                    <i className={`bi ${section.icon}`} />
                  </span>
                  {section.attention && (
                    <span className="cw-tile-flag">
                      <i className="bi bi-exclamation-circle-fill" aria-hidden="true" /> Needs action
                    </span>
                  )}
                </span>
                <span className="cw-tile-count">{overview ? section.count : "–"}</span>
                <span className="cw-tile-title">{section.title}</span>
                <span className="cw-tile-caption">{section.caption}</span>
                <span className="cw-tile-description">{section.description}</span>
                <span className="cw-tile-open" aria-hidden="true">
                  Open <i className="bi bi-arrow-right" />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <nav className="cw-tabs" aria-label="Committee workspaces">
              {visibleSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`cw-tab ${section.id === currentSection.id ? "active" : ""}`}
                  aria-current={section.id === currentSection.id ? "page" : undefined}
                  onClick={() => openSection(section.id)}
                >
                  <i className={`bi ${section.icon}`} aria-hidden="true" />
                  <span>{section.title}</span>
                  <span className={`cw-tab-count ${section.attention ? "attention" : ""}`}>{section.count}</span>
                </button>
              ))}
            </nav>

            <section
              ref={sectionRef}
              tabIndex={-1}
              className="cw-section"
              aria-label={currentSection.title}
            >
              {currentSection.id === "review" && (
                <>
                  {canManageCommittee && unassignedApplicants.length > 0 && (
                    <div className="committee-unassigned-strip">
                      <i className="bi bi-info-circle" aria-hidden="true" />
                      <span>
                        {unassignedApplicants.length} applicant{unassignedApplicants.length === 1 ? " has" : "s have"} completed the test and still {unassignedApplicants.length === 1 ? "needs" : "need"} a reviewer.
                      </span>
                      <button type="button" className="btn committee-small-action" onClick={() => openSection("waiting")}>
                        View waiting list
                      </button>
                    </div>
                  )}

                  <section className="committee-section-card committee-board-card">
                    <div className="committee-section-header with-filters">
                      <div>
                        <span className="ss-small-label dark">Assignment board</span>
                        <h2>Applicants assigned for review</h2>
                        <p>Open an applicant only when you are ready to review their details.</p>
                      </div>
                      {canManageCommittee && (
                        <button type="button" className="btn committee-primary-action" onClick={handleAutoAssign} disabled={assigning}>
                          <i className="bi bi-magic" aria-hidden="true" /> {assigning ? "Assigning..." : "Auto-assign ready applicants"}
                        </button>
                      )}
                    </div>

                    <form
                      className="committee-filter-grid cw-filter-bar"
                      onSubmit={(event) => {
                        event.preventDefault();
                        loadCommitteeData();
                      }}
                    >
                      <input
                        type="search"
                        aria-label="Search assignments"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={isSuperAdmin ? "Search name, ID, phone, or reference" : "Search anonymous ID, reference, pathway, or status"}
                      />
                      {userRole !== "COMMITTEE_MEMBER" && (
                        <select aria-label="Filter by committee member" value={filterMemberId} onChange={(event) => setFilterMemberId(event.target.value)}>
                          <option value="">All members</option>
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>{member.fullName}</option>
                          ))}
                        </select>
                      )}
                      <select aria-label="Filter by review status" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                        <option value="">All statuses</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="IN_REVIEW">In review</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                      <button type="submit" className="btn committee-small-action">
                        <i className="bi bi-funnel" aria-hidden="true" /> Apply
                      </button>
                    </form>

                    <div className="committee-assignment-list">
                      {shownAssignments.length === 0 && referenceTerm ? (
                        <ReferenceNoMatch reference={referenceFilter.trim()} what="assigned applications" onClear={clearReferenceFilter} />
                      ) : shownAssignments.length === 0 ? (
                        <div className="committee-empty-state">
                          <i className="bi bi-inboxes" aria-hidden="true" />
                          <h3>No assignments yet</h3>
                          <p>Add committee members, then run auto-assignment after applicants complete the Basic IT Skills Test.</p>
                        </div>
                      ) : (
                        shownAssignments.map((assignment) => (
                          <AssignmentCard
                            key={assignment.id}
                            assignment={assignment}
                            members={members}
                            canReassign={canReassignApplicants}
                            activeAssignmentId={selectedAssignmentFromList?.id}
                            reassigning={reassigning}
                            onSelect={openReviewModal}
                            onReassign={handleReassign}
                          />
                        ))
                      )}
                    </div>
                  </section>
                </>
              )}

              {currentSection.id === "waiting" && (
                shownUnassigned.length > 0 ? (
                  <ApplicantsWaitingPanel
                    applicants={shownUnassigned}
                    onAssignApplicant={handleAssignApplicant}
                    assigningApplicantId={assigningApplicantId}
                    onAutoAssignAll={handleAutoAssign}
                    assigningAll={assigning}
                  />
                ) : referenceTerm ? (
                  <ReferenceNoMatch reference={referenceFilter.trim()} what="waiting applicants" onClear={clearReferenceFilter} />
                ) : (
                  <section className="committee-section-card">
                    <div className="committee-empty-state">
                      <i className="bi bi-check2-circle" aria-hidden="true" />
                      <h2>Nobody is waiting</h2>
                      <p>Every applicant who has completed the Basic IT Skills Test has a reviewer.</p>
                    </div>
                  </section>
                )
              )}

              {currentSection.id === "invitations" && (
                referenceTerm && deliveryRecords.length === 0 ? (
                  <ReferenceNoMatch reference={referenceFilter.trim()} what="test invitations" onClear={clearReferenceFilter} />
                ) : (
                <SkillsTestDeliveryPanel
                  delivery={shownDelivery}
                  onResend={handleResendSkillsTestInvitation}
                  sendingReference={sendingTestEmailReference}
                />
                )
              )}

              {currentSection.id === "selected" && (
                referenceTerm && shownSelectedRows.length === 0 ? (
                  <ReferenceNoMatch reference={referenceFilter.trim()} what="selected participants" onClear={clearReferenceFilter} />
                ) : (
                <SelectedParticipantsReport
                  rows={shownSelectedRows}
                  scope={selectedReport.reportScope}
                  generatedAt={selectedReport.generatedAt}
                  onResendRegistration={handleResendParticipantRegistration}
                  resendingRegistrationId={resendingRegistrationId}
                />
                )
              )}

              {currentSection.id === "members" && (
                <CommitteeMembersSection
                  members={members}
                  canManage={canManageCommittee}
                  showAddMember={showAddMember}
                  onToggleAddMember={() => {
                    if (!showAddMember && isSuperAdmin && countryFilter && !memberForm.country) {
                      setMemberForm((current) => ({ ...current, country: countryFilter }));
                    }
                    setShowAddMember((current) => !current);
                  }}
                  addMemberForm={(
                    <AddMemberForm
                      memberForm={memberForm}
                      onChange={(field, value) => setMemberForm((current) => ({ ...current, [field]: value }))}
                      onSubmit={handleAddMember}
                      submitting={addingMember}
                      countries={countries}
                      canChooseCountry={isSuperAdmin}
                      currentUserCountry={currentUserCountry}
                    />
                  )}
                  onToggleActive={handleToggleMember}
                  onSetPassword={handleSetMemberPassword}
                  onSendReset={handleSendMemberReset}
                />
              )}

              {currentSection.id === "admins" && (
                <AddCountryAdminForm
                  adminForm={countryAdminForm}
                  onChange={(field, value) => setCountryAdminForm((current) => ({ ...current, [field]: value }))}
                  onSubmit={handleAddCountryAdmin}
                  submitting={addingCountryAdmin}
                  countries={countries}
                  countryAdmins={countryAdmins}
                  onSendReset={handleSendStaffReset}
                />
              )}
            </section>
          </>
        )}

        {selectedAssignmentFromList && createPortal(
          // The wrapper keeps the workspace colours and type now that the dialog sits outside the page.
          <div className="committee-page committee-review-portal">
          <div
            className="committee-review-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeReviewModal();
            }}
          >
            <div
              className="committee-review-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="committee-review-dialog-title"
            >
              <div className="committee-review-dialog-toolbar">
                <div>
                  <span className="ss-small-label dark">Selection Committee</span>
                  <h2 id="committee-review-dialog-title">Review application</h2>
                </div>
                <button
                  id="committee-review-close-button"
                  type="button"
                  className="committee-review-dialog-close"
                  onClick={closeReviewModal}
                  aria-label="Close application review"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                  <span>Close</span>
                </button>
              </div>

              <div className="committee-review-dialog-body">
                <ReviewPanel
                  key={selectedAssignmentFromList.id}
                  assignment={selectedAssignmentFromList}
                  applicationDetail={applicationDetail}
                  applicationLoading={loadingApplicationDetail}
                  applicationError={applicationDetailError}
                  onStartReview={handleStartReview}
                  onSubmitReview={handleSubmitReview}
                  submittingReview={submittingReview}
                />
              </div>
            </div>
          </div>
          </div>,
          document.body
        )}
      </section>
    </main>
  );
}

export default CommitteeDashboardPage;
