const SYSTEM_PROMPT = `You are a career copilot inside a personal Career OS dashboard.
Use ONLY facts from the provided context. Never invent employers, dates, metrics, degrees, or skills not in context.
Output valid JSON matching the requested schema. No markdown fences.
For resume suggestions: label all edits as suggestions only — never state fabricated achievements.`

export function buildMessages(featureId, context) {
  const userPrompt = buildUserPrompt(featureId, context)
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]
}

function buildUserPrompt(featureId, context) {
  const ctx = JSON.stringify(context, null, 0).slice(0, 12000)

  const schemas = {
    jobAnalysis: `Return JSON: {"fitSummary":"","strengths":[],"concerns":[],"missingSkills":[],"recommendedActions":[],"salaryThoughts":"","riskLevel":"low|medium|high","confidence":"low|medium|high"}`,
    resumeEnhancement: `Return JSON: {"atsScoreEstimate":"","keywordCoverage":"","missingKeywords":[],"bulletSuggestions":[],"summarySuggestions":[],"improvementPriority":[]}. Suggestions only — do not invent facts.`,
    coverLetter: `Return JSON: {"short":"","standard":"","aggressive":""}`,
    interviewPrep: `Return JSON: {"technicalQuestions":[],"behavioralQuestions":[],"systemDesignQuestions":[],"starAnswers":[],"companyQuestions":[],"revisionTopics":[],"cheatSheet":""}`,
    outreach: `Return JSON: {"connectionRequest":"","inMail":"","followUp":"","thankYou":""}. Draft only — no sending. Rules: connectionRequest < 300 chars; inMail < 1000 chars; never claim referral, prior relationship, or that application was reviewed; personalize using contact name/title when provided.`,
    companyIntelligence: `Return JSON: {"companySummary":"","cultureInsights":[],"likelyInterviewFocus":[],"productInsights":[],"risks":[]}`,
    careerStrategy: `Return JSON: {"careerDirection":"","bestRoleTargets":[],"roleTransitions":[],"salaryGrowthPlan":[],"recommendedProjects":[],"recommendedCertifications":[],"priorityActions":[]}`,
    skillGap: `Return JSON: {"skillGapReport":[],"highImpactSkills":[],"quickWins":[],"longTermSkills":[]}`,
    applicationStrategy: `Return JSON: {"patterns":[],"resumeIssues":[],"targetingIssues":[],"industryInsights":[],"recommendedChanges":[]}`,
    chat: `Answer the user's question using context. Return JSON: {"answer":"","suggestedActions":[]}`,
  }

  if (featureId === 'chat') {
    return `Context:\n${ctx}\n\nUser question: ${context.message || ''}\n\n${schemas.chat}`
  }

  return `Feature: ${featureId}\nContext:\n${ctx}\n\n${schemas[featureId] || schemas.jobAnalysis}`
}

export function parseAiResponse(text, featureId) {
  if (!text) throw new Error('Empty AI response')
  let cleaned = text.trim()
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) cleaned = fence[1].trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1)
  try {
    return JSON.parse(cleaned)
  } catch {
    if (featureId === 'chat') return { answer: text, suggestedActions: [] }
    throw new Error('AI returned invalid JSON')
  }
}
