import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import {
  DOCUMENT_TYPE_LABELS,
  PATHWAY_ICONS,
  formatAnswerText,
  formatBytes,
  formatDate,
  formatDateTime,
  formatDecision,
  formatDuration,
  formatPathwayLabel,
  formatRelative,
  formatStatusLabel,
  formatYesNo,
  getAvatarColour,
  getInitials,
  getStageMeta,
} from "../utils/participantDisplay";
import "./Participants.css";

const TABS = [
  { key: "overview", label: "Overview", icon: "bi-person-vcard" },
  { key: "forms", label: "Forms", icon: "bi-ui-checks" },
  { key: "skills", label: "Skills test", icon: "bi-laptop" },
  { key: "committee", label: "Committee", icon: "bi-people" },
  { key: "documents", label: "Documents", icon: "bi-folder2-open" },
  { key: "activity", label: "Activity", icon: "bi-clock-history" },
];

/* ----------------------------------------------------------------------------
 * Small building blocks
 * ------------------------------------------------------------------------- */

function Field({ label, children, wide = false }) {
  const empty = children === null || children === undefined || children === "" || children === "—";
  return (
    <div className={`pp-field ${wide ? "is-wide" : ""}`}>
      <dt>{label}</dt>
      <dd className={empty ? "is-empty" : ""}>{empty ? "Not recorded" : children}</dd>
    </div>
  );
}

function InfoCard({ title, icon, children, className = "" }) {
  return (
    <section className={`pp-card ${className}`} aria-label={title}>
      <h3><span className="pp-card-icon" aria-hidden="true"><i className={`bi ${icon}`} /></span>{title}</h3>
      {children}
    </section>
  );
}

function EmptyPanel({ icon, title, text }) {
  return (
    <div className="pp-empty">
      <span className="pp-empty-icon" aria-hidden="true"><i className={`bi ${icon}`} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked: the value is still visible to select */ }
  }
  return (
    <button type="button" className="pp-copy" onClick={copy}>
      <i className={`bi ${copied ? "bi-check2" : "bi-copy"}`} aria-hidden="true" />
      <span className="visually-hidden">{copied ? `${label} copied` : `Copy ${label}`}</span>
    </button>
  );
}

function ScoreRing({ percentage, passed }) {
  const value = Math.max(0, Math.min(100, Math.round(percentage || 0)));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg className={`pp-ring ${passed ? "is-pass" : "is-fail"}`} viewBox="0 0 100 100" role="img" aria-label={`${value}%, ${passed ? "passed" : "did not pass"}`}>
      <circle className="pp-ring-track" cx="50" cy="50" r={radius} />
      <circle className="pp-ring-value" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
      <text x="50" y="55" textAnchor="middle">{value}%</text>
    </svg>
  );
}

/* ----------------------------------------------------------------------------
 * Journey
 * ------------------------------------------------------------------------- */

const STEP_ICONS = { done: "bi-check-lg", current: "bi-arrow-right", failed: "bi-x-lg", skipped: "bi-dash", upcoming: "" };
const STEP_STATE_TEXT = { done: "Done", current: "Current step", failed: "Stopped here", skipped: "Not needed for this pathway", upcoming: "Not reached yet" };

function Journey({ steps }) {
  return (
    <section className="pp-journey" aria-labelledby="pp-journey-title">
      <h2 id="pp-journey-title" className="visually-hidden">Programme journey</h2>
      <ol>
        {steps.map((step, index) => (
          <li key={step.key} className={`is-${step.state}`}>
            <span className="pp-step-marker" aria-hidden="true">
              {STEP_ICONS[step.state] ? <i className={`bi ${STEP_ICONS[step.state]}`} /> : index + 1}
            </span>
            <span className="pp-step-text">
              <span className="pp-step-label">{step.label}</span>
              <span className="pp-step-meta">{step.state === "upcoming" || step.state === "skipped" || !step.date ? STEP_STATE_TEXT[step.state] : formatDate(step.date)}</span>
              <span className="visually-hidden">{STEP_STATE_TEXT[step.state]}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Tabs
 * ------------------------------------------------------------------------- */

function OverviewTab({ profile }) {
  const p = profile.participant;
  const e = profile.eligibility;
  const disability = [p.disabilityType, p.otherDisabilityType].filter(Boolean).join(", ");
  return (
    <div className="pp-overview">
      <InfoCard title="Personal details" icon="bi-person">
        <dl className="pp-fields">
          <Field label="First name">{p.firstName}</Field>
          <Field label="Last name">{p.lastName}</Field>
          <Field label="Gender">{p.sex}</Field>
          <Field label="Age at application">{p.age ? `${p.age} years` : null}</Field>
          <Field label="Date of birth">{p.dateOfBirth ? formatDate(p.dateOfBirth) : p.yearOfBirth ? `Born ${p.yearOfBirth}` : null}</Field>
          <Field label="Household size">{p.householdSize}</Field>
        </dl>
      </InfoCard>

      <InfoCard title="Contact" icon="bi-telephone">
        <dl className="pp-fields">
          <Field label="Phone">{p.contactNumber && <a href={`tel:${p.contactNumber}`}>{p.contactNumber}</a>}</Field>
          <Field label="Other phone">{p.alternativeContactNumber}</Field>
          <Field label="Email" wide>{p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}</Field>
          <Field label="Preferred contact">{p.preferredContactMethod}</Field>
          <Field label="Next of kin">{[p.nextOfKinName, p.nextOfKinRelationship].filter(Boolean).join(" · ")}</Field>
          <Field label="Next of kin phone">{p.nextOfKinPhone}</Field>
        </dl>
      </InfoCard>

      <InfoCard title="Location" icon="bi-geo-alt">
        <dl className="pp-fields">
          <Field label="Country">{p.country}</Field>
          <Field label="County / state / region">{p.region}</Field>
          <Field label="Sub-county">{p.subCounty}</Field>
          <Field label="Town">{p.town}</Field>
        </dl>
      </InfoCard>

      <InfoCard title="Education and work" icon="bi-mortarboard">
        <dl className="pp-fields">
          <Field label="Highest education">{p.educationLevel}</Field>
          <Field label="Course studied">{p.courseStudied}</Field>
          <Field label="Currently studying">{p.currentEducationStatus}</Field>
          <Field label="Employment">{p.employmentStatus}</Field>
          <Field label="Monthly income">{p.monthlyIncomeRange}</Field>
          <Field label="Preferred sector">{p.preferredSector}</Field>
        </dl>
      </InfoCard>

      <InfoCard title="Disability and access" icon="bi-universal-access">
        <dl className="pp-fields">
          <Field label="Reported a disability">{formatYesNo(p.hasDisability)}</Field>
          <Field label="Type">{disability}</Field>
          <Field label="Can take part online">{p.canParticipateOnline === null || p.canParticipateOnline === undefined ? null : formatYesNo(p.canParticipateOnline)}</Field>
          <Field label="Has a device">{p.hasDeviceAccess === null || p.hasDeviceAccess === undefined ? null : formatYesNo(p.hasDeviceAccess)}</Field>
          <Field label="Accessibility needs" wide>{p.accessibilityNeeds}</Field>
        </dl>
      </InfoCard>

      <InfoCard title="Eligibility check" icon="bi-clipboard-check" className={e.isEligible ? "is-pass" : "is-fail"}>
        <p className={`pp-verdict ${e.isEligible ? "is-pass" : "is-fail"}`}>
          <i className={`bi ${e.isEligible ? "bi-check-circle-fill" : "bi-x-circle-fill"}`} aria-hidden="true" />
          {e.isEligible ? "Met the eligibility criteria" : "Did not meet the eligibility criteria"}
        </p>
        <dl className="pp-fields">
          <Field label="Checked on">{formatDate(e.screenedAt)}</Field>
          <Field label="Duplicate check">{e.duplicateCheckStatus === "NO_MATCH" ? "No duplicate found" : formatStatusLabel(e.duplicateCheckStatus)}</Field>
          {e.reason && <Field label="Reason" wide>{e.reason}</Field>}
          {e.reasonCodes.length > 0 && <Field label="Criteria not met" wide><span className="pp-chips">{e.reasonCodes.map((code) => <span key={code} className="pp-chip">{formatStatusLabel(code)}</span>)}</span></Field>}
        </dl>
      </InfoCard>
    </div>
  );
}

function AnswerValue({ answer }) {
  const { value, type } = answer;
  if (type === "SIGNATURE") {
    return typeof value === "string" && value.startsWith("data:image/")
      ? <img className="pp-signature" src={value} alt="Electronic signature" />
      : <span className="pp-signature-typed">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return <span className="pp-chips">{value.map((item) => <span key={String(item)} className="pp-chip">{formatAnswerText(item)}</span>)}</span>;
  }
  if (typeof value === "boolean" || /^(yes|no)$/i.test(String(value))) {
    const yes = value === true || /^yes$/i.test(String(value));
    return <span className={`pp-yesno ${yes ? "is-yes" : "is-no"}`}>{yes ? "Yes" : "No"}</span>;
  }
  return <span className={type === "LONG_TEXT" ? "pp-long-answer" : ""}>{formatAnswerText(value, type)}</span>;
}

function FormsTab({ forms }) {
  const [formKey, setFormKey] = useState(forms[0]?.key || "");
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState(() => new Set(forms[0]?.sections.map((section) => section.title) || []));
  const form = forms.find((item) => item.key === formKey) || forms[0];

  const sections = useMemo(() => {
    if (!form) return [];
    const term = query.trim().toLowerCase();
    if (!term) return form.sections;
    return form.sections
      .map((section) => ({
        ...section,
        answers: section.answers.filter((answer) =>
          `${answer.question} ${formatAnswerText(answer.value, answer.type)}`.toLowerCase().includes(term)),
      }))
      .filter((section) => section.answers.length);
  }, [form, query]);

  if (!form || form.sections.length === 0) {
    return <EmptyPanel icon="bi-ui-checks" title="No form answers saved" text="This participant's answers will appear here once a form is submitted." />;
  }

  const answerCount = form.sections.reduce((sum, section) => sum + section.answers.length, 0);
  const allOpen = sections.every((section) => openSections.has(section.title));

  function chooseForm(key) {
    const next = forms.find((item) => item.key === key);
    setFormKey(key);
    setQuery("");
    setOpenSections(new Set(next?.sections.map((section) => section.title) || []));
  }

  function toggleSection(title) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  }

  return (
    <div className="pp-forms">
      {forms.length > 1 && (
        <div className="pp-form-switch" role="group" aria-label="Choose a form">
          {forms.map((item) => (
            <button key={item.key} type="button" aria-pressed={item.key === form.key} onClick={() => chooseForm(item.key)}>
              <i className="bi bi-file-earmark-text" aria-hidden="true" /> {item.title}
            </button>
          ))}
        </div>
      )}

      <div className="pp-form-head">
        <div>
          <h3>{form.title}</h3>
          <p>{answerCount} answers · submitted {formatDateTime(form.submittedAt)}{form.formVersion ? ` · version ${form.formVersion}` : ""}</p>
        </div>
        <div className="pp-form-tools">
          <label className="pp-form-search">
            <span className="visually-hidden">Find an answer</span>
            <i className="bi bi-search" aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a question or answer" />
          </label>
          <button type="button" className="pt-button" onClick={() => setOpenSections(allOpen ? new Set() : new Set(sections.map((section) => section.title)))}>
            <i className={`bi ${allOpen ? "bi-arrows-collapse" : "bi-arrows-expand"}`} aria-hidden="true" /> {allOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="pp-no-match">No questions or answers match “{query}”.</p>
      ) : (
        <div className="pp-sections">
          {sections.map((section, index) => {
            const open = openSections.has(section.title) || Boolean(query.trim());
            const panelId = `pp-section-${index}`;
            return (
              <section key={section.title} className={`pp-section ${open ? "is-open" : ""}`}>
                <h4>
                  <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => toggleSection(section.title)}>
                    <span className="pp-section-number" aria-hidden="true">{index + 1}</span>
                    <span className="pp-section-title">{section.title}</span>
                    <span className="pp-section-count">{section.answers.length} {section.answers.length === 1 ? "answer" : "answers"}</span>
                    <i className="bi bi-chevron-down pp-section-chevron" aria-hidden="true" />
                  </button>
                </h4>
                {open && (
                  <dl id={panelId} className="pp-answers">
                    {section.answers.map((answer) => (
                      <div key={answer.code} className={`pp-answer ${answer.type === "LONG_TEXT" || answer.type === "SIGNATURE" ? "is-wide" : ""}`}>
                        <dt>{answer.question}</dt>
                        <dd><AnswerValue answer={answer} /></dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkillsTab({ skillsTest }) {
  const [openAttempt, setOpenAttempt] = useState("");
  const { attempts, invitations } = skillsTest;
  if (!attempts.length && !invitations.length) {
    return <EmptyPanel icon="bi-laptop" title="No skills test yet" text="Test invitations and results appear here. Digital Entrepreneurship applicants do not take the test." />;
  }
  return (
    <div className="pp-stack">
      {attempts.map((attempt) => {
        const open = openAttempt === attempt.id;
        const correct = attempt.answers.filter((answer) => answer.isCorrect).length;
        return (
          <section key={attempt.id} className="pp-card pp-attempt">
            <div className="pp-attempt-head">
              <ScoreRing percentage={attempt.percentage} passed={attempt.passed} />
              <div className="pp-attempt-text">
                <h3>Attempt {attempt.attemptNumber}</h3>
                <p className={`pp-verdict ${attempt.passed ? "is-pass" : "is-fail"}`}>
                  <i className={`bi ${attempt.passed ? "bi-check-circle-fill" : "bi-x-circle-fill"}`} aria-hidden="true" />
                  {attempt.status === "IN_PROGRESS" ? "Not finished" : attempt.passed ? "Passed" : "Did not pass"} · pass mark {attempt.passingPercentage}%
                </p>
                <dl className="pp-inline-stats">
                  <div><dt>Score</dt><dd>{attempt.score} / {attempt.maxScore}</dd></div>
                  <div><dt>Correct</dt><dd>{correct} of {attempt.answers.length}</dd></div>
                  <div><dt>Time taken</dt><dd>{formatDuration(attempt.durationSeconds)}</dd></div>
                  <div><dt>Submitted</dt><dd>{formatDateTime(attempt.submittedAt)}</dd></div>
                </dl>
              </div>
            </div>
            {attempt.answers.length > 0 && (
              <>
                <button type="button" className="pt-button" aria-expanded={open} onClick={() => setOpenAttempt(open ? "" : attempt.id)}>
                  <i className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`} aria-hidden="true" /> {open ? "Hide answers" : "Show every answer"}
                </button>
                {open && (
                  <ol className="pp-test-answers">
                    {attempt.answers.map((answer) => (
                      <li key={answer.questionCode} className={answer.isCorrect ? "is-correct" : "is-wrong"}>
                        <span className="pp-test-mark" aria-hidden="true"><i className={`bi ${answer.isCorrect ? "bi-check-lg" : "bi-x-lg"}`} /></span>
                        <div>
                          <p className="pp-test-question">{answer.questionText}</p>
                          <p><span className="visually-hidden">{answer.isCorrect ? "Correct. " : "Wrong. "}</span>Answered: <strong>{answer.selectedAnswer || "No answer"}</strong>{!answer.isCorrect && <> · Correct answer: <strong>{answer.correctAnswer}</strong></>}</p>
                          {answer.category && <span className="pp-chip">{answer.category}</span>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </section>
        );
      })}
      {invitations.length > 0 && (
        <InfoCard title="Test invitations" icon="bi-envelope-paper">
          <ul className="pp-mini-list">
            {invitations.map((invite) => (
              <li key={invite.id}>
                <span className="pp-chip">{formatStatusLabel(invite.status)}</span>
                <span>{invite.sentAt ? `Sent ${formatDateTime(invite.sentAt)}` : "Not emailed"}{invite.openedAt ? ` · opened ${formatDateTime(invite.openedAt)}` : ""}{invite.usedAt ? ` · used ${formatDateTime(invite.usedAt)}` : ""} · expires {formatDate(invite.expiresAt)}</span>
                {invite.emailError && <span className="pp-error-text">Email problem: {invite.emailError}</span>}
              </li>
            ))}
          </ul>
        </InfoCard>
      )}
    </div>
  );
}

function CommitteeTab({ committee, registration }) {
  const { assignment, reviews, history } = committee;
  if (!assignment && !reviews.length && !registration.invitations.length) {
    return <EmptyPanel icon="bi-people" title="Not with the committee yet" text="The reviewer, decision and comments appear here once the application is assigned." />;
  }
  return (
    <div className="pp-two-col">
      <div className="pp-stack">
        <InfoCard title="Reviewer" icon="bi-person-check">
          {assignment ? (
            <dl className="pp-fields">
              <Field label="Assigned to">{assignment.memberName}</Field>
              <Field label="Review status">{formatStatusLabel(assignment.status)}</Field>
              <Field label="Assigned on">{formatDate(assignment.assignedAt)}</Field>
              <Field label="Completed on">{assignment.completedAt ? formatDate(assignment.completedAt) : null}</Field>
            </dl>
          ) : <p className="pp-muted">Not assigned to a reviewer yet.</p>}
        </InfoCard>
        {reviews.map((review) => (
          <section key={review.id} className={`pp-card pp-decision is-${review.decision === "SELECTED" ? "pass" : review.decision === "NOT_SELECTED" ? "fail" : "neutral"}`}>
            <p className="pp-decision-label">Committee decision</p>
            <p className="pp-decision-value">{formatDecision(review.decision)}</p>
            <p className="pp-muted">{review.memberName ? `${review.memberName} · ` : ""}{formatDateTime(review.reviewedAt)}</p>
            {review.comments && <blockquote>{review.comments}</blockquote>}
          </section>
        ))}
      </div>
      <div className="pp-stack">
        {history.length > 0 && (
          <InfoCard title="Assignment history" icon="bi-arrow-left-right">
            <ol className="pp-timeline is-compact">
              {history.map((item) => (
                <li key={item.id}>
                  <span className="pp-timeline-dot" aria-hidden="true" />
                  <div>
                    <p><strong>{formatStatusLabel(item.changeType)}</strong>{item.to ? ` to ${item.to}` : ""}{item.from ? ` (from ${item.from})` : ""}</p>
                    <p className="pp-muted">{formatDateTime(item.createdAt)}{item.by ? ` · by ${item.by}` : ""}</p>
                    {item.reason && <p>{item.reason}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </InfoCard>
        )}
        {registration.invitations.length > 0 && (
          <InfoCard title="Participant registration invitations" icon="bi-envelope-check">
            <ul className="pp-mini-list">
              {registration.invitations.map((invite) => (
                <li key={invite.id}>
                  <span className="pp-chip">{formatStatusLabel(invite.status)}</span>
                  <span>{invite.sentAt ? `Sent ${formatDateTime(invite.sentAt)}` : "Not emailed"}{invite.openedAt ? ` · opened ${formatDateTime(invite.openedAt)}` : ""}{invite.submittedAt ? ` · submitted ${formatDateTime(invite.submittedAt)}` : invite.draftSavedAt ? ` · progress saved ${formatDateTime(invite.draftSavedAt)}` : ""}</span>
                  {invite.emailError && <span className="pp-error-text">Email problem: {invite.emailError}</span>}
                </li>
              ))}
            </ul>
          </InfoCard>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ participantId, documents, token, onSessionExpired }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  if (!documents.length) {
    return <EmptyPanel icon="bi-folder2-open" title="No documents uploaded" text="ID, certificates and other files the participant uploads appear here." />;
  }

  async function fetchDocument(document, mode) {
    setBusy(`${document.id}-${mode}`);
    setError("");
    // A tab opened before the request keeps the browser from treating it as an unwanted pop-up.
    const preview = mode === "open" ? window.open("", "_blank") : null;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/participants/${participantId}/documents/${document.id}`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: document.mimeType }));
      if (preview) {
        preview.location.href = url;
      } else {
        const link = window.document.createElement("a");
        link.href = url;
        link.download = document.originalName || "document";
        window.document.body.appendChild(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      preview?.close();
      if (requestError.response?.status === 401) { onSessionExpired(); return; }
      setError("We could not fetch this document. Please try again.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      {error && <div className="pt-alert" role="alert">{error}</div>}
      <ul className="pp-documents">
        {documents.map((document) => {
          const isPdf = document.mimeType === "application/pdf";
          return (
            <li key={document.id} className="pp-document">
              <span className={`pp-document-icon ${isPdf ? "is-pdf" : "is-image"}`} aria-hidden="true"><i className={`bi ${isPdf ? "bi-file-earmark-pdf" : "bi-file-earmark-image"}`} /></span>
              <div className="pp-document-text">
                <p className="pp-document-type">{DOCUMENT_TYPE_LABELS[document.documentType] || "Document"}</p>
                <p className="pp-document-name">{document.originalName}</p>
                <p className="pp-muted">{formatBytes(document.sizeBytes)} · uploaded {formatDate(document.createdAt)}</p>
              </div>
              <div className="pp-document-actions">
                <button type="button" className="pt-button" onClick={() => fetchDocument(document, "open")} disabled={Boolean(busy)}>
                  <i className="bi bi-eye" aria-hidden="true" /> {busy === `${document.id}-open` ? "Opening…" : "Open"}<span className="visually-hidden"> {document.originalName}</span>
                </button>
                <button type="button" className="pt-button is-primary" onClick={() => fetchDocument(document, "download")} disabled={Boolean(busy)}>
                  <i className="bi bi-download" aria-hidden="true" /> {busy === `${document.id}-download` ? "Downloading…" : "Download"}<span className="visually-hidden"> {document.originalName}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ActivityTab({ profile }) {
  const events = useMemo(() => {
    const list = [];
    list.push({ date: profile.participant.createdAt, icon: "bi-send", tone: "teal", title: "Application submitted", text: formatPathwayLabel(profile.participant.pathway, "") });
    profile.statusHistory.forEach((item) => list.push({ date: item.createdAt, icon: "bi-flag", tone: "neutral", title: formatStatusLabel(item.status), text: item.note }));
    profile.skillsTest.invitations.forEach((item) => item.sentAt && list.push({ date: item.sentAt, icon: "bi-envelope", tone: "orange", title: "Skills test invitation sent", text: item.emailTo }));
    profile.skillsTest.attempts.forEach((item) => item.submittedAt && list.push({ date: item.submittedAt, icon: "bi-laptop", tone: item.passed ? "green" : "red", title: `Skills test ${item.passed ? "passed" : "not passed"}`, text: `${Math.round(item.percentage)}%` }));
    profile.committee.reviews.forEach((item) => list.push({ date: item.reviewedAt, icon: "bi-people", tone: item.decision === "SELECTED" ? "green" : "red", title: `Committee: ${formatDecision(item.decision)}`, text: item.memberName }));
    profile.registration.invitations.forEach((item) => {
      if (item.sentAt) list.push({ date: item.sentAt, icon: "bi-envelope-check", tone: "orange", title: "Registration invitation sent", text: item.emailTo });
      if (item.submittedAt) list.push({ date: item.submittedAt, icon: "bi-clipboard-check", tone: "green", title: "Participant registration submitted" });
    });
    profile.documents.forEach((item) => list.push({ date: item.createdAt, icon: "bi-paperclip", tone: "neutral", title: `${DOCUMENT_TYPE_LABELS[item.documentType] || "Document"} uploaded`, text: item.originalName }));
    profile.dhis2.syncLogs.forEach((item) => list.push({ date: item.createdAt, icon: "bi-cloud-arrow-up", tone: item.status === "FAILED" ? "red" : "neutral", title: `DHIS2: ${formatStatusLabel(item.action)} (${formatStatusLabel(item.status)})`, text: item.errorMessage }));
    return list.filter((item) => item.date).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [profile]);

  return (
    <ol className="pp-timeline">
      {events.map((event, index) => (
        <li key={`${event.date}-${index}`} className={`is-${event.tone}`}>
          <span className="pp-timeline-dot" aria-hidden="true"><i className={`bi ${event.icon}`} /></span>
          <div>
            <p className="pp-timeline-title">{event.title}</p>
            {event.text && <p>{event.text}</p>}
            <p className="pp-muted"><time dateTime={event.date}>{formatDateTime(event.date)}</time> · {formatRelative(event.date)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

function ParticipantProfilePage({ participantId, token, onBack, onSessionExpired }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const headingRef = useRef(null);

  useEffect(() => {
    // The page is keyed by participant, so each profile starts from a fresh, empty state.
    const controller = new AbortController();
    axios.get(`${API_BASE_URL}/api/participants/${participantId}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then((response) => setProfile(response.data))
      .catch((requestError) => {
        if (axios.isCancel(requestError)) return;
        if (requestError.response?.status === 401) { onSessionExpired(); return; }
        setError(requestError.response?.data?.message || "We could not load this profile. Please try again.");
      });
    return () => controller.abort();
  }, [participantId, token, onSessionExpired]);

  // Screen reader and keyboard users start at the person's name once the profile loads.
  useEffect(() => {
    if (profile) headingRef.current?.focus();
  }, [profile]);

  function onTabKeyDown(event) {
    const index = TABS.findIndex((item) => item.key === tab);
    let next = null;
    if (event.key === "ArrowRight") next = TABS[(index + 1) % TABS.length];
    if (event.key === "ArrowLeft") next = TABS[(index - 1 + TABS.length) % TABS.length];
    if (event.key === "Home") next = TABS[0];
    if (event.key === "End") next = TABS[TABS.length - 1];
    if (!next) return;
    event.preventDefault();
    setTab(next.key);
    document.getElementById(`pp-tab-${next.key}`)?.focus();
  }

  const back = (
    <button type="button" className="pp-back" onClick={onBack}>
      <i className="bi bi-arrow-left" aria-hidden="true" /> All participants
    </button>
  );

  if (error) {
    return (
      <main id="main-content" className="pt-page">
        <div className="pt-shell">
          {back}
          <EmptyPanel icon="bi-person-x" title="Profile not available" text={error} />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main id="main-content" className="pt-page">
        <div className="pt-shell">
          {back}
          <div className="pp-hero is-skeleton" role="status"><span className="visually-hidden">Loading profile…</span></div>
        </div>
      </main>
    );
  }

  const p = profile.participant;
  const stage = getStageMeta(p.stage);
  const formAnswerCount = profile.forms.reduce((sum, form) => sum + form.sections.reduce((n, s) => n + s.answers.length, 0), 0);
  const tabCounts = {
    forms: formAnswerCount ? profile.forms.length : 0,
    skills: profile.skillsTest.attempts.length,
    committee: profile.committee.reviews.length,
    documents: profile.documents.length,
  };

  return (
    <main id="main-content" className="pt-page">
      <div className="pt-shell">
        {back}

        <header className={`pp-hero is-${stage.tone}`}>
          <div className="pp-hero-main">
            <span className="pt-avatar is-xl" style={{ "--pt-avatar": getAvatarColour(p.name) }} aria-hidden="true">{getInitials(p.name)}</span>
            <div className="pp-hero-identity">
              <p className="pt-eyebrow">Participant profile</p>
              <h1 ref={headingRef} tabIndex="-1">{p.name}</h1>
              <div className="pp-ids">
                {p.participantCode && <span className="pp-id"><span>Participant code</span><strong>{p.participantCode}</strong><CopyButton value={p.participantCode} label="participant code" /></span>}
                {p.applicationReference && <span className="pp-id"><span>Application reference</span><strong>{p.applicationReference}</strong><CopyButton value={p.applicationReference} label="application reference" /></span>}
              </div>
              <div className="pp-hero-tags">
                <span className={`pt-stage is-${stage.tone}`}><i className={`bi ${stage.icon}`} aria-hidden="true" /> {stage.label}</span>
                <span className="pp-hero-tag"><i className={`bi ${PATHWAY_ICONS[p.pathway] || "bi-signpost"}`} aria-hidden="true" /> {formatPathwayLabel(p.pathway, "Pathway not recorded")}</span>
                <span className="pp-hero-tag"><i className="bi bi-geo-alt" aria-hidden="true" /> {[p.region, p.country].filter(Boolean).join(", ") || "Location not recorded"}</span>
                {p.hasDisability && <span className="pp-hero-tag"><i className="bi bi-universal-access" aria-hidden="true" /> Disability reported</span>}
              </div>
            </div>
          </div>
          <div className="pp-hero-side">
            <p className="pp-status-line"><span>Status</span>{formatStatusLabel(p.status)}</p>
            <div className="pp-contact-actions">
              {p.contactNumber && <a className="pt-button" href={`tel:${p.contactNumber}`}><i className="bi bi-telephone" aria-hidden="true" /> Call</a>}
              {p.email && <a className="pt-button" href={`mailto:${p.email}`}><i className="bi bi-envelope" aria-hidden="true" /> Email</a>}
            </div>
            <dl className="pp-hero-facts">
              <div><dt>Applied</dt><dd>{formatDate(p.createdAt)}</dd></div>
              <div><dt>Last updated</dt><dd>{formatRelative(p.updatedAt)}</dd></div>
            </dl>
          </div>
        </header>

        <Journey steps={profile.journey} />

        <div className="pp-tabs" role="tablist" aria-label="Profile sections" onKeyDown={onTabKeyDown}>
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`pp-tab-${item.key}`}
              aria-controls={`pp-panel-${item.key}`}
              aria-selected={tab === item.key}
              tabIndex={tab === item.key ? 0 : -1}
              onClick={() => setTab(item.key)}
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" /> {item.label}
              {tabCounts[item.key] > 0 && <span className="pp-tab-count">{tabCounts[item.key]}</span>}
            </button>
          ))}
        </div>

        <div className="pp-panel" role="tabpanel" id={`pp-panel-${tab}`} aria-labelledby={`pp-tab-${tab}`}>
          {tab === "overview" && <OverviewTab profile={profile} />}
          {tab === "forms" && <FormsTab forms={profile.forms} />}
          {tab === "skills" && <SkillsTab skillsTest={profile.skillsTest} />}
          {tab === "committee" && <CommitteeTab committee={profile.committee} registration={profile.registration} />}
          {tab === "documents" && <DocumentsTab participantId={p.id} documents={profile.documents} token={token} onSessionExpired={onSessionExpired} />}
          {tab === "activity" && <ActivityTab profile={profile} />}
        </div>
      </div>
    </main>
  );
}

export default ParticipantProfilePage;
