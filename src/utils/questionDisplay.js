function getMetadataCountryValue(question, answers, key) {
  const country = answers?.COUNTRY;
  const valuesByCountry = question?.metadata?.[key];

  if (!country || !valuesByCountry || typeof valuesByCountry !== "object") return null;

  return valuesByCountry[country] || null;
}

export function resolveQuestionText(question, answers = {}) {
  return getMetadataCountryValue(question, answers, "labelByCountry") ||
    question?.questionText ||
    question?.label ||
    question?.questionCode ||
    "This question";
}

export function resolveQuestionHelpText(question, answers = {}) {
  return getMetadataCountryValue(question, answers, "helpTextByCountry") || question?.helpText || "";
}
