import { resolveQuestionText } from "./questionDisplay";

function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

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
    ["FIRST_NAME", "MIDDLE_NAME", "LAST_NAME"].includes(question.questionCode);
}

function isValidPersonName(value) {
  return /^(?=.*\p{L})[\p{L}\p{M}\s'.-]+$/u.test(String(value || "").trim());
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidCountryPhone(value, country) {
  const digits = digitsOnly(value);
  const rules = {
    Kenya: [/^(?:01|07)\d{8}$/, /^(?:1|7)\d{8}$/, /^254(?:1|7)\d{8}$/],
    Nigeria: [/^(?:070|080|081|090|091)\d{8}$/, /^(?:70|80|81|90|91)\d{8}$/, /^234(?:70|80|81|90|91)\d{8}$/],
    Zambia: [/^09\d{8}$/, /^9\d{8}$/, /^2609\d{8}$/],
    Ghana: [/^(?:02|03|05)\d{8}$/, /^(?:2|3|5)\d{8}$/, /^233(?:2|3|5)\d{8}$/],
  };
  const patterns = rules[country];
  if (!patterns) return /^\d{7,15}$/.test(digits);
  return patterns.some((pattern) => pattern.test(digits));
}

function isValidIdentification(value) {
  const clean = String(value || "").trim();
  return clean.length >= 3 && /^[\p{L}\p{N}\s/_.()+#&-]+$/u.test(clean);
}

function isValidCardIdentification(value, answers) {
  const clean = String(value || "").trim();
  const country = answers.COUNTRY;
  const idType = String(answers.NATIONAL_ID_TYPE || "");

  if (country === "Ghana" && idType.startsWith("Ghana Card")) {
    return /^GHA-[A-Za-z0-9-]{11}$/.test(clean) && clean.length === 15;
  }

  if (country === "Nigeria" && idType.includes("National Identification Number")) {
    return /^\d{11}$/.test(clean);
  }

  return isValidIdentification(clean);
}

function countWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function validateExclusiveOptions(question, value, errors) {
  const exclusiveOptions = question.metadata?.exclusiveOptions;
  if (!Array.isArray(value) || !Array.isArray(exclusiveOptions) || value.length <= 1) return;

  const selectedExclusive = value.find((item) => exclusiveOptions.includes(item));
  if (selectedExclusive) {
    errors[question.questionCode] = `${selectedExclusive} cannot be selected together with another option.`;
  }
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

    validateExclusiveOptions(question, value, errors);
    if (errors[question.questionCode]) continue;

    if (isPersonNameQuestion(question) && !isValidPersonName(value)) {
      errors[question.questionCode] = "Use letters only. Numbers are not allowed in a name.";
      continue;
    }

    if (question.validationType === "IDENTIFICATION" && !isValidIdentification(value)) {
      errors[question.questionCode] = "Enter a valid identification number using letters, numbers or the punctuation used on the identification document.";
      continue;
    }

    if (question.validationType === "CARD_IDENTIFICATION" && !isValidCardIdentification(value, answers)) {
      errors[question.questionCode] = "Enter the identification number in the format stated for the selected country and identification type.";
      continue;
    }

    if (isLikelyEmailQuestion(question) && !isValidEmail(value)) {
      errors[question.questionCode] = "Enter a valid email address.";
      continue;
    }

    if (isLikelyPhoneQuestion(question) && !isValidCountryPhone(value, answers.COUNTRY)) {
      errors[question.questionCode] =
        `Enter a phone number in the format stated for ${answers.COUNTRY || "the selected country"}.`;
      continue;
    }

    if (question.responseType === "DATE") {
      const dateValue = new Date(value);
      if (Number.isNaN(dateValue.getTime())) {
        errors[question.questionCode] = "Enter a valid date.";
        continue;
      }

      if (question.questionCode === "DATE_OF_BIRTH" && dateValue > new Date()) {
        errors[question.questionCode] = "Date of birth cannot be in the future.";
        continue;
      }
    }

    const maxWords = Number(question.metadata?.maxWords);
    if (Number.isFinite(maxWords) && maxWords > 0 && countWords(value) > maxWords) {
      errors[question.questionCode] = `Keep your response to ${maxWords} words or fewer.`;
    }
  }

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
