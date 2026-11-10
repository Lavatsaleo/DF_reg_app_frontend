// Mirrors getPasswordProblem in backend/src/utils/passwordUtils.js. The server has the final say.
export const MIN_PASSWORD_LENGTH = 12;

const COMMON_WORDS = [
  "password", "passw0rd", "qwerty", "welcome", "letmein", "admin", "administrator", "changeme",
  "iloveyou", "sightsavers", "digitalfutures", "committee", "kenya", "nigeria", "ghana", "zambia",
];

function containsPersonalDetails(password, { email = "", fullName = "" } = {}) {
  const lower = password.toLowerCase();
  const emailName = String(email).split("@")[0].toLowerCase();
  const nameParts = String(fullName).toLowerCase().split(/\s+/).filter((part) => part.length >= 4);
  return (emailName.length >= 4 && lower.includes(emailName)) || nameParts.some((part) => lower.includes(part));
}

function isEasyToGuess(password) {
  const lower = password.toLowerCase();
  return /^(.)\1+$/.test(password)
    || /^(0123456789|1234567890|abcdefghij)/.test(lower)
    || COMMON_WORDS.includes(lower.replace(/[^a-z]/g, ""));
}

export function getPasswordChecks(password, person) {
  const value = String(password || "");
  return [
    { id: "length", label: `At least ${MIN_PASSWORD_LENGTH} characters`, met: value.length >= MIN_PASSWORD_LENGTH },
    { id: "case", label: "An uppercase and a lowercase letter", met: /[A-Z]/.test(value) && /[a-z]/.test(value) },
    { id: "number", label: "At least one number", met: /[0-9]/.test(value) },
    { id: "symbol", label: "At least one symbol, such as ! ? # or -", met: /[^A-Za-z0-9]/.test(value) },
    {
      id: "personal",
      label: "Not the person's name, email address or a common word such as “Password”",
      met: value.length > 0 && !containsPersonalDetails(value, person) && !isEasyToGuess(value),
    },
  ];
}

// The message to show when the form is submitted too early, or "" when the pair is ready.
export function getPasswordPairProblem(password, confirmPassword, person) {
  const unmet = getPasswordChecks(password, person).filter((check) => !check.met);
  if (unmet.length) return `The password does not meet every rule yet: ${unmet.map((check) => check.label.toLowerCase()).join("; ")}.`;
  if (password !== confirmPassword) return "The two passwords do not match. Type the same password in both boxes.";
  return "";
}
