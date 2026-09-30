function getMetadataCountryValue(question, answers, key) {
  const country = answers?.COUNTRY;
  const valuesByCountry = question?.metadata?.[key];

  if (!country || !valuesByCountry || typeof valuesByCountry !== "object") return null;

  return valuesByCountry[country] || null;
}

function getMetadataPathwayValue(question, answers, key) {
  const pathway = answers?.COURSE_APPLIED_FOR;
  const valuesByPathway = question?.metadata?.[key];

  if (!pathway || !valuesByPathway || typeof valuesByPathway !== "object") return null;

  return valuesByPathway[pathway] || null;
}

export function resolveQuestionText(question, answers = {}) {
  return getMetadataPathwayValue(question, answers, "labelByPathway") ||
    getMetadataCountryValue(question, answers, "labelByCountry") ||
    question?.questionText ||
    question?.label ||
    question?.questionCode ||
    "This question";
}

const PHONE_INFO_BY_COUNTRY = {
  Kenya: "With +254 already shown, enter 9 digits beginning with 1 or 7 (for example, 712345678).",
  Nigeria: "With +234 already shown, enter 10 digits beginning with 70, 80, 81, 90 or 91.",
  Ghana: "With +233 already shown, enter 9 digits beginning with 2, 3 or 5.",
  Zambia: "With +260 already shown, enter 9 digits beginning with 9.",
};

const NATIONAL_ID_INFO_BY_COUNTRY = {
  Kenya: "Enter your 8-digit national ID number or passport number.",
  Nigeria: "Enter your 11-digit NIN or passport number.",
  Zambia: "Enter your NRC number, including any slashes, or your passport number.",
};

const CARD_INFO_BY_COUNTRY = {
  Ghana: "For a Ghana Card, enter its 15-character number beginning with GHA-. Otherwise, enter the number exactly as printed on your chosen document.",
  Nigeria: "For a NIN, enter its 11 digits. Otherwise, enter the number exactly as printed on your chosen document.",
};

export function resolveQuestionHelpText(question, answers = {}) {
  const country = answers?.COUNTRY;
  const code = question?.questionCode;

  if (code === "DATE_OF_BIRTH") {
    const min = Number(question?.metadata?.minEligibleAge || 18);
    const max = Number(question?.metadata?.maxEligibleAge || 35);
    return `Age range for this pathway: ${min}–${max} years.`;
  }

  if (question?.responseType === "PHONE" && PHONE_INFO_BY_COUNTRY[country]) {
    return PHONE_INFO_BY_COUNTRY[country];
  }

  if (code === "NATIONAL_ID_NUMBER") {
    return NATIONAL_ID_INFO_BY_COUNTRY[country] || "Enter the number exactly as printed on your ID or passport.";
  }

  if (code === "NATIONAL_ID_CARD_NUMBER") {
    return CARD_INFO_BY_COUNTRY[country] || "Enter the number exactly as printed on your identification document.";
  }

  if (code === "FIRST_NAME") {
    return "Enter your name exactly as it appears on your identification document.";
  }

  if (code === "EDUCATION_LEVEL") {
    return country === "Nigeria"
      ? "Choose your highest completed qualification. In Nigeria, selection starts from HND, bachelor's degree or postgraduate level."
      : "Choose the highest level of education you have completed.";
  }

  if (code === "ACCESSIBILITY_NEEDS") {
    return "Your answer helps us plan accessibility support; it does not determine selection.";
  }

  if (code === "TRAINING_START_READINESS") {
    return "This helps the programme team plan training dates.";
  }

  if (code === "TRAINING_AVAILABILITY") {
    return question?.metadata?.blockingAnswer === "No"
      ? "You must be available for an average of 5 hours per week for at least 3 months."
      : "This pathway involves in-person training over nine months.";
  }

  if (code === "DEVICE_ACCESS") {
    return "Training activities take place throughout the week.";
  }

  const fromMetadata =
    getMetadataPathwayValue(question, answers, "helpTextByPathway") ||
    getMetadataCountryValue(question, answers, "helpTextByCountry");

  if (fromMetadata) return fromMetadata;

  // Keep source questionnaire wording intact, but hide internal drafting notes from applicants.
  const original = question?.helpText || "";
  if (/pending (?:country-team|team) (?:decision|discussion)/i.test(original)) return "";
  if (/^Purpose:/i.test(original)) return "";

  return original;
}
