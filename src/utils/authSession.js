import axios from "axios";

const STORAGE_KEY = "sightsavers-staff-session";
const LAST_ACTIVITY_KEY = "sightsavers-staff-last-activity";

export function loadStaffSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.token || !session?.user) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveStaffSession(session) {
  const sessionWithActivity = {
    ...session,
    lastActivityAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionWithActivity));
    window.localStorage.setItem(LAST_ACTIVITY_KEY, sessionWithActivity.lastActivityAt);
  } catch {
    // Ignore local storage failures.
  }
  applyAuthToken(sessionWithActivity?.token);
}

export function clearStaffSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // Ignore local storage failures.
  }
  applyAuthToken("");
}

export function markStaffActivity() {
  const timestamp = new Date().toISOString();

  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, timestamp);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...session,
          lastActivityAt: timestamp,
        })
      );
    }
  } catch {
    // Ignore local storage failures.
  }
}

export function applyAuthToken(token) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
}
