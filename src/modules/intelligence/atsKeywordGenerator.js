import { cleanKeywordBank, extractMeaningfulPhrases } from './keywordCleaner.js'

function dedupe(arr) {
  return [...new Set(arr.filter(Boolean).map((s) => String(s).trim()))]
}

const LIMITS = {
  highPriority: 20,
  mediumPriority: 25,
  supportingKeywords: 30,
}

export function generateAtsKeywords(ctx, roleStrategy, skillsMap) {
  const cleanerOptions = {
    workExperience: ctx.parsedData.workExperience,
  }

  const highPriority = cleanKeywordBank(
    dedupe([
      ...ctx.targetRoles,
      ctx.currentRole,
      ...skillsMap.technicalSkills.slice(0, 15),
    ]),
    cleanerOptions,
  ).slice(0, LIMITS.highPriority)

  const mediumPriority = cleanKeywordBank(
    dedupe([
      ...roleStrategy.secondaryTargetRoles,
      ...ctx.parsedData.projects,
      ...ctx.parsedData.certifications,
      ...extractMeaningfulPhrases(ctx.parsedData.workExperience),
    ]),
    cleanerOptions,
  ).slice(0, LIMITS.mediumPriority)

  const supportingKeywords = cleanKeywordBank(
    dedupe([
      ...ctx.parsedData.education,
      ...ctx.questionnaire.preferredIndustries,
      ...skillsMap.productBusiness,
      ...skillsMap.softSkills,
    ]),
    cleanerOptions,
  ).slice(0, LIMITS.supportingKeywords)

  const resumeKeywords = dedupe([
    ...highPriority,
    ...mediumPriority.slice(0, 10),
    ...supportingKeywords.slice(0, 5),
  ]).slice(0, 40)

  return {
    resumeKeywords,
    atsKeywordBank: {
      highPriority,
      mediumPriority,
      supportingKeywords,
    },
  }
}
