/*
 * Where an unfinished application is kept on the device while it is being filled in.
 *
 * Applicants often use shared or public computers (cyber cafes, offices, partner centres), so:
 * - answers are kept in sessionStorage, which belongs to this browser tab only and is removed
 *   when the tab or browser is closed (never in localStorage, which stays for every later user);
 * - a copy older than DEVICE_DRAFT_MAX_AGE_MS is ignored and removed, in case the browser
 *   restores the tab later;
 * - to continue on another visit, the applicant uses Check status and the code emailed to them.
 */

export const DRAFT_STORAGE_PREFIX = "df-application-draft-v5-";

// Matches the inactivity limit of the application form (see useInactivityLock).
export const DEVICE_DRAFT_MAX_AGE_MS = 20 * 60 * 1000;

// Keys used by earlier versions, which kept answers in localStorage with no time limit.
const LEGACY_LOCAL_KEY_PREFIXES = ["sightsavers-registration-draft-"];
const LEGACY_LOCAL_KEYS = ["sightsavers-submitted-applications"];

function storage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function keyFor(pathwayId) {
  return `${DRAFT_STORAGE_PREFIX}${pathwayId}`;
}

export function readDeviceDraft(pathwayId) {
  const store = storage();
  if (!store || !pathwayId) return null;
  try {
    const raw = store.getItem(keyFor(pathwayId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    const savedAt = Date.parse(draft?.savedAt || "");
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > DEVICE_DRAFT_MAX_AGE_MS) {
      store.removeItem(keyFor(pathwayId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function writeDeviceDraft(pathwayId, payload) {
  const store = storage();
  if (!store || !pathwayId) return false;
  try {
    store.setItem(keyFor(pathwayId), JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function removeDeviceDraft(pathwayId) {
  try {
    storage()?.removeItem(keyFor(pathwayId));
  } catch {
    // Storage unavailable: nothing was kept.
  }
}

// Removes every unfinished application from this browser tab.
export function clearAllDeviceDrafts() {
  const store = storage();
  if (!store) return;
  try {
    Object.keys(store)
      .filter((key) => key.startsWith(DRAFT_STORAGE_PREFIX))
      .forEach((key) => store.removeItem(key));
  } catch {
    // Storage unavailable: nothing was kept.
  }
}

// Removes applicant data that earlier versions left in localStorage on this computer.
export function purgeLegacyApplicantData() {
  try {
    const store = window.localStorage;
    Object.keys(store)
      .filter((key) => LEGACY_LOCAL_KEYS.includes(key) || LEGACY_LOCAL_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)))
      .forEach((key) => store.removeItem(key));
  } catch {
    // Storage unavailable: nothing to remove.
  }
}

/*
 * Participant registration: after the emailed code, this browser tab holds a session for the
 * registration link. It is kept for this tab only and removed on exit or inactivity.
 */
const REGISTRATION_SESSION_KEY = "df-registration-session-v1";

// Only the start of the link is kept, to tell links apart; the link itself is never stored here.
function linkFingerprint(linkToken) {
  return String(linkToken || "").slice(0, 12);
}

export function readRegistrationSession(linkToken) {
  try {
    const saved = JSON.parse(storage()?.getItem(REGISTRATION_SESSION_KEY) || "null");
    return saved && saved.link === linkFingerprint(linkToken) ? saved.token : "";
  } catch {
    return "";
  }
}

export function writeRegistrationSession(linkToken, sessionToken) {
  try {
    storage()?.setItem(REGISTRATION_SESSION_KEY, JSON.stringify({ link: linkFingerprint(linkToken), token: sessionToken }));
  } catch {
    // Storage unavailable: the session lasts until the page is reloaded.
  }
}

export function clearRegistrationSession() {
  try {
    storage()?.removeItem(REGISTRATION_SESSION_KEY);
  } catch {
    // Storage unavailable: nothing was kept.
  }
}
