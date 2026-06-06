function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function normalizeQuestionText(question) {
  return question.questionText || question.label || question.questionCode || "This question";
}

function isLikelyEmailQuestion(question) {
  const text = `${question.questionCode || ""} ${question.questionText || ""}`.toLowerCase();
  return question.responseType === "EMAIL" || text.includes("email");
}

function isLikelyPhoneQuestion(question) {
  const text = `${question.questionCode || ""} ${question.questionText || ""}`.toLowerCase();
  return question.responseType === "PHONE" || text.includes("phone") || text.includes("mobile") || text.includes("telephone");
}

function isLikelyAgeQuestion(question) {
  const text = `${question.questionCode || ""} ${question.questionText || ""}`.toLowerCase();
  return question.responseType === "NUMBER" && text.includes("age");
}

function isPersonNameQuestion(question) {
  return question.validationType === "PERSON_NAME" ||
    ["FIRST_NAME", "LAST_NAME", "NEXT_OF_KIN_NAME"].includes(question.questionCode);
}

function isValidPersonName(value) {
  return /^(?=.*\p{L})[\p{L}\p{M}\s'.-]+$/u.test(String(value || "").trim());
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isValidPhone(value) {
  const normalized = String(value).replace(/[\s()-]/g, "");
  return /^\+?[0-9]{7,15}$/.test(normalized);
}

function isAffirmative(value) {
  if (value === true) return true;
  return ["yes", "true", "1", "y"].includes(String(value || "").trim().toLowerCase());
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

export function validateAnswers({ questions, answers, isQuestionVisible }) {
  const errors = {};

  for (const question of questions) {
    if (!isQuestionVisible(question, answers)) continue;

    const value = answers[question.questionCode];
    const label = normalizeQuestionText(question);

    if (question.required && isEmpty(value)) {
      errors[question.questionCode] = `${label} is required.`;
      continue;
    }

    if (isEmpty(value)) continue;

    if (question.questionCode === "REGISTRATION_CONSENT" && !isAffirmative(value)) {
      errors[question.questionCode] = "You must provide consent before submitting the application.";
      continue;
    }

    if (isPersonNameQuestion(question) && !isValidPersonName(value)) {
      errors[question.questionCode] = "Use letters only. Numbers are not allowed in a name.";
      continue;
    }

    if (isLikelyEmailQuestion(question) && !isValidEmail(value)) {
      errors[question.questionCode] = "Enter a valid email address.";
      continue;
    }

    if (isLikelyPhoneQuestion(question) && !isValidPhone(value)) {
      errors[question.questionCode] = "Enter a valid phone number. Use digits only or include country code, for example +2547XXXXXXXX.";
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

        if (age > 120) {
          errors[question.questionCode] = "Enter a realistic date of birth.";
          continue;
        }
      }
    }

    if (question.responseType === "NUMBER") {
      const numberValue = Number(value);

      if (Number.isNaN(numberValue)) {
        errors[question.questionCode] = "Enter a valid number.";
        continue;
      }

      if (isLikelyAgeQuestion(question) && (numberValue < 0 || numberValue > 120)) {
        errors[question.questionCode] = "Enter a realistic age.";
        continue;
      }
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
