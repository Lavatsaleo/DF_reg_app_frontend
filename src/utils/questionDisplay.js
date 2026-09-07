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

export function resolveQuestionHelpText(question, answers = {}) {
  return getMetadataPathwayValue(question, answers, "helpTextByPathway") ||
    getMetadataCountryValue(question, answers, "helpTextByCountry") ||
    question?.helpText ||
    "";
}
