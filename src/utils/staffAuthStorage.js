const STAFF_SESSION_KEY = "digitalFuturesStaffSession";

export function loadStaffSession() {
  try {
    const raw = window.localStorage.getItem(STAFF_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.token || !session?.user) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveStaffSession(session) {
  if (!session?.token || !session?.user) return;
  window.localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
}

export function clearStaffSession() {
  window.localStorage.removeItem(STAFF_SESSION_KEY);
}
