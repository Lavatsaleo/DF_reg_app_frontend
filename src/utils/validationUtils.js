import { resolveQuestionText } from "./questionDisplay";

function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

const MIN_ELIGIBLE_AGE = 18;
const MAX_ELIGIBLE_AGE = 33;

function normalizeQuestionText(question, answers) {
  return resolveQuestionText(question, answers);
}

function isLikelyEmailQuestion(question) {
  const text = `${question.questionCode || ""} ${question.questionText || ""}`.toLowerCase();
  return question.responseType === "EMAIL" || text.includes("email");
}

function isLikelyPhoneQuestion(question) {
  const text = `${question.questionCode || ""} ${question.questionText || ""}`.toLowerCase();
  return question.responseType === "PHONE" || text.includes("phone") || text.includes("mobile") || text.includes("telephone");
}

function isPersonNameQuestion(question) {
  return question.validationType === "PERSON_NAME" ||
    ["FIRST_NAME", "MIDDLE_NAME", "LAST_NAME", "NEXT_OF_KIN_NAME", "JURAT_INTERPRETER_NAME", "JURAT_INTERPRETER_SIGNATURE"].includes(question.questionCode);
}

function isValidPersonName(value) {
  return /^(?=.*\p{L})[\p{L}\p{M}\s'.-]+$/u.test(String(value || "").trim());
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isValidPhone(value) {
  return /^\d{7,15}$/.test(String(value || "").trim());
}

function isAffirmative(value) {
  if (value === true) return true;
  const normalized = String(value || "").trim().toLowerCase();
  return ["yes", "true", "1", "y"].includes(normalized) || normalized.startsWith("yes -");
}

function isValidIdNumber(value) {
  const clean = String(value || "").trim();
  return clean.length >= 3 && /^[0-9\s/_.()+#&-]+$/.test(clean);
}

function getAgeFromDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDifference = today.getMonth() - date.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }

  return age;
}

function validateRankGroups(questions, answers, errors) {
  const groups = new Map();

  questions.forEach((question) => {
    const groupName = question.metadata?.rankGroup;
    if (!groupName) return;

    const group = groups.get(groupName) || [];
    group.push(question);
    groups.set(groupName, group);
  });

  groups.forEach((groupQuestions) => {
    const answered = groupQuestions
      .map((question) => ({ question, value: answers[question.questionCode] }))
      .filter(({ value }) => !isEmpty(value));

    const valueCounts = answered.reduce((map, item) => {
      map.set(item.value, (map.get(item.value) || 0) + 1);
      return map;
    }, new Map());

    answered.forEach(({ question, value }) => {
      if ((valueCounts.get(value) || 0) > 1) {
        errors[question.questionCode] = "Each course must have a different rank. Use each rank from 1 to 4 only once.";
      }
    });
  });
}

export function validateAnswers({ questions, answers, isQuestionVisible }) {
  const errors = {};
  const visibleQuestions = questions.filter((question) => isQuestionVisible(question, answers));

  for (const question of visibleQuestions) {
    const value = answers[question.questionCode];
    const label = normalizeQuestionText(question, answers);

    if (question.required && isEmpty(value)) {
      errors[question.questionCode] = `${label} is required.`;
      continue;
    }

    if (isEmpty(value)) continue;

    if (["REGISTRATION_CONSENT", "CONSENT_INFORMATION_READ"].includes(question.questionCode) && !isAffirmative(value)) {
      errors[question.questionCode] = "You must answer Yes to continue with the application.";
      continue;
    }

    if (isPersonNameQuestion(question) && !isValidPersonName(value)) {
      errors[question.questionCode] = "Use letters only. Numbers are not allowed in a name.";
      continue;
    }

    if (question.validationType === "ID_NUMBER" && !isValidIdNumber(value)) {
      errors[question.questionCode] = "Use numbers and special characters only. Letters are not allowed.";
      continue;
    }

    if (isLikelyEmailQuestion(question) && !isValidEmail(value)) {
      errors[question.questionCode] = "Enter a valid email address.";
      continue;
    }

    if (isLikelyPhoneQuestion(question) && !isValidPhone(value)) {
      errors[question.questionCode] = "Enter a valid phone number using numbers only, for example 712345678. The country code is added from the country selected above.";
      continue;
    }

    if (question.responseType === "DATE") {
      const dateValue = new Date(value);

      if (Number.isNaN(dateValue.getTime())) {
        errors[question.questionCode] = "Enter a valid date.";
        continue;
      }

      if (question.questionCode === "DATE_OF_BIRTH") {
        const age = getAgeFromDate(value);

        if (age === null || age < 0) {
          errors[question.questionCode] = "Date of birth cannot be in the future.";
          continue;
        }

        if (age < MIN_ELIGIBLE_AGE || age > MAX_ELIGIBLE_AGE) {
          errors[question.questionCode] = `Physical Academy applicants must be ${MIN_ELIGIBLE_AGE} to ${MAX_ELIGIBLE_AGE} years old.`;
          continue;
        }
      }
    }
  }

  validateRankGroups(visibleQuestions, answers, errors);
  return errors;
}

export function calculateFormProgress({ groupedQuestions, answers }) {
  const visibleQuestions = Object.values(groupedQuestions).flat();
  const requiredQuestions = visibleQuestions.filter((question) => question.required);

  const completedRequired = requiredQuestions.filter((question) => {
    const value = answers[question.questionCode];
    return !isEmpty(value);
  }).length;

  const totalRequired = requiredQuestions.length;
  const percentage = totalRequired === 0 ? 100 : Math.round((completedRequired / totalRequired) * 100);

  return {
    visibleQuestions: visibleQuestions.length,
    totalRequired,
    completedRequired,
    percentage,
  };
}
