// Shared labels and formatting for the participant directory and profile pages.
import { formatPathwayLabel, formatStatusLabel } from "./displayLabels";

export const STAGE_META = {
  review: { label: "Awaiting review", tone: "teal", icon: "bi-hourglass-split" },
  "skills-test": { label: "Skills test", tone: "orange", icon: "bi-laptop" },
  selected: { label: "Selected", tone: "yellow", icon: "bi-stars" },
  verification: { label: "Verification", tone: "blue", icon: "bi-patch-check" },
  enrolled: { label: "Enrolled", tone: "green", icon: "bi-mortarboard" },
  "not-eligible": { label: "Not eligible", tone: "grey", icon: "bi-slash-circle" },
  "not-selected": { label: "Not selected", tone: "red", icon: "bi-x-circle" },
};

export const PATHWAY_ICONS = {
  PHYSICAL_ACADEMY: "bi-building",
  VIRTUAL_ACADEMY: "bi-laptop",
  DIGITAL_ENTREPRENEURSHIP: "bi-shop",
};

export const DOCUMENT_TYPE_LABELS = {
  NATIONAL_ID: "National ID",
  PASSPORT: "Passport",
  BIRTH_CERTIFICATE: "Birth certificate",
  MEDICAL_DOCUMENT: "Medical document",
  REFERRAL_LETTER: "Referral letter",
  CONSENT_FORM: "Consent form",
  DISABILITY_DOCUMENT: "Disability document",
  EDUCATION_CERTIFICATE: "Education certificate",
  OTHER: "Other document",
};

export { formatPathwayLabel, formatStatusLabel };

export function getStageMeta(stage) {
  return STAGE_META[stage] || STAGE_META.review;
}

export function getInitials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";
}

// A stable colour per person, from a small palette that keeps black text readable.
const AVATAR_COLOURS = ["#ffc81f", "#4fcdb0", "#ffb38a", "#c9e39a", "#ffd9a8", "#b9ebe0", "#f6c3c6", "#e3dcff"];
export function getAvatarColour(seed) {
  let hash = 0;
  for (const char of String(seed || "")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatRelative(value) {
  if (!value) return "";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatYesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

export function formatDuration(seconds) {
  const total = Number(seconds || 0);
  if (!total) return "—";
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes ? `${minutes} min ${rest} s` : `${rest} s`;
}

// One answer from a form, as text (arrays and dates are handled by the caller for display).
export function formatAnswerText(value, type) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (type === "DATE" && !Number.isNaN(new Date(value).getTime())) return formatDate(value);
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function formatDecision(value) {
  if (!value) return "No decision yet";
  return { SELECTED: "Selected", NOT_SELECTED: "Not selected", NEEDS_MORE_INFORMATION: "Needs more information" }[value] || formatStatusLabel(value);
}
