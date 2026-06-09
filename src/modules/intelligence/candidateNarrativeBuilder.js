function dedupe(arr) {
  return [...new Set(arr.filter(Boolean))]
}

function trimToMaxSentences(text, maxSentences = 3) {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''

  const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
  if (!sentences) return trimmed

  const complete = sentences
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxSentences)

  return complete.join(' ').trim()
}

function extractWorkDomains(workExperience) {
  if (!Array.isArray(workExperience)) return []
  return workExperience
    .flatMap((w) => {
      if (typeof w === 'string') return [w]
      return [w.company, w.industry, w.title].filter(Boolean)
    })
    .map((s) => String(s).trim())
    .filter(Boolean)
}

const CANDIDATE_TYPES = [
  { label: 'Technical Product Builder', score: (ctx, skills) => {
    let s = 0
    if (ctx.targetRoles.some((r) => /product/i.test(r))) s += 3
    if (skills.productBusiness.length > 0) s += 2
    if (skills.frontend.length > 0 && skills.backend.length > 0) s += 2
    return s
  }},
  { label: 'Full Stack Product Engineer', score: (ctx, skills) => {
    let s = 0
    if (skills.frontend.length > 0 && skills.backend.length > 0) s += 3
    if (ctx.targetRoles.some((r) => /full stack|fullstack/i.test(r))) s += 3
    return s
  }},
  { label: 'Frontend Developer', score: (ctx, skills) => {
    let s = 0
    if (skills.frontend.length > skills.backend.length) s += 3
    if (ctx.currentRole.toLowerCase().includes('frontend')) s += 2
    return s
  }},
  { label: 'Backend Developer', score: (ctx, skills) => {
    let s = 0
    if (skills.backend.length > skills.frontend.length) s += 3
    if (ctx.currentRole.toLowerCase().includes('backend')) s += 2
    return s
  }},
  { label: 'Business-Oriented Technology Leader', score: (ctx, skills) => {
    let s = 0
    if (skills.leadership.length > 0) s += 2
    if (skills.productBusiness.length > 2) s += 2
    if (ctx.questionnaire.leadershipExamples.length > 0) s += 2
    return s
  }},
  { label: 'Early CTO / Product-Tech Operator', score: (ctx) => {
    let s = 0
    if (ctx.targetRoles.some((r) => /cto|head|founder/i.test(r))) s += 4
    if (ctx.questionnaire.ownershipExamples.length > 1) s += 2
    return s
  }},
  { label: 'Data Analyst', score: (ctx, skills) => {
    let s = 0
    if (skills.database.length > 0 && skills.aiAutomation.length === 0) s += 1
    if (ctx.targetRoles.some((r) => /data|analyst|bi/i.test(r))) s += 4
    return s
  }},
]

export function inferSeniorityLevel(ctx) {
  const roleText = [ctx.currentRole, ...ctx.targetRoles].join(' ').toLowerCase()
  if (/\b(cto|founder|chief|vp|vice president)\b/.test(roleText)) return 'Executive / Founder-Level'
  if (/\b(director|head of)\b/.test(roleText)) return 'Executive / Founder-Level'
  if (/\b(manager|engineering manager|product manager)\b/.test(roleText) && ctx.experienceYears >= 5) {
    return 'Manager'
  }
  if (ctx.questionnaire.leadershipExamples.length >= 2 && ctx.experienceYears >= 5) return 'Lead'

  const years = ctx.experienceYears
  if (years <= 1) return 'Entry-Level'
  if (years <= 3) return 'Junior'
  if (years <= 5) return 'Mid-Level'
  if (years <= 8) return 'Senior'
  return 'Lead'
}

export function inferCandidateType(ctx, skillsMap) {
  let best = { label: 'Full Stack Product Engineer', score: 0 }
  for (const type of CANDIDATE_TYPES) {
    const score = type.score(ctx, skillsMap)
    if (score > best.score) best = { label: type.label, score }
  }
  return best.label
}

function buildCareerNarrative(ctx, skillsMap) {
  const q17 = ctx.questionnaire.careerNarrative || ctx.questionnaire.careerSummary
  if (q17) return trimToMaxSentences(q17, 3)

  const parts = []
  if (ctx.currentRole) {
    const yearsPart = ctx.experienceYears > 0 ? ` with ${ctx.experienceYears} years of experience` : ''
    parts.push(`I am a ${ctx.currentRole}${yearsPart}.`)
  }

  const topSkills = skillsMap.technicalSkills.slice(0, 3)
  if (topSkills.length > 0) {
    parts.push(`My core technical skills include ${topSkills.join(', ')}.`)
  }

  const project = ctx.questionnaire.projectHighlights[0] || ctx.parsedData.projects[0]
  if (project) {
    parts.push(`A highlight project: ${project}.`)
  }

  return trimToMaxSentences(
    parts.join(' ') || 'Career narrative pending — complete questionnaire Q17 for a personal summary.',
    3,
  )
}

export function buildCandidateSummary(ctx, skillsMap) {
  const seniorityLevel = inferSeniorityLevel(ctx)
  const candidateType = inferCandidateType(ctx, skillsMap)
  const primaryRole = ctx.targetRoles[0] || ctx.currentRole || 'technology roles'

  const pitchParts = []
  if (seniorityLevel) pitchParts.push(seniorityLevel)
  if (candidateType) pitchParts.push(candidateType)
  if (ctx.experienceYears > 0) pitchParts.push(`with ${ctx.experienceYears} years experience`)
  pitchParts.push(`targeting ${primaryRole}`)
  const oneLinePitch = pitchParts.join(' ').replace(/\s+/g, ' ').trim() + '.'

  const careerNarrative = buildCareerNarrative(ctx, skillsMap)

  const perceptions = ctx.questionnaire.recruiterPerception.slice(0, 3).join(', ')
  const diffs = ctx.questionnaire.candidateStrengths.slice(0, 2).join(', ')
  const positioningStatement = [perceptions, diffs].filter(Boolean).join('. ')
    || 'Positioning statement will improve with questionnaire answers on perception and differentiators.'

  return {
    candidateType,
    seniorityLevel,
    oneLinePitch,
    careerNarrative,
    positioningStatement,
  }
}

export function buildExperienceMap(ctx) {
  return {
    yearsOfExperience: ctx.experienceYears > 0 ? String(ctx.experienceYears) : (ctx.basicProfile?.experienceYears || ''),
    domainsWorkedIn: dedupe([
      ...ctx.questionnaire.problemsSolved,
      ...extractWorkDomains(ctx.parsedData.workExperience),
    ]),
    projectHighlights: dedupe([
      ...ctx.questionnaire.projectHighlights,
      ...ctx.parsedData.projects.slice(0, 5),
    ]),
    ownershipExamples: dedupe([...ctx.questionnaire.ownershipExamples]),
    leadershipExamples: dedupe([...ctx.questionnaire.leadershipExamples]),
    businessImpactExamples: dedupe([
      ...ctx.questionnaire.achievements,
      ...ctx.questionnaire.problemsSolved.filter((p) => /cost|revenue|performance|scale/i.test(p)),
    ]),
  }
}

export function buildJobFitPreferences(ctx) {
  return {
    preferredCompanyTypes: dedupe(ctx.questionnaire.preferredCompanyTypes || []),
    preferredIndustries: ctx.questionnaire.preferredIndustries,
    avoidedIndustries: ctx.questionnaire.avoidedIndustries,
    preferredLocations: ctx.preferredLocations.length ? ctx.preferredLocations : (ctx.location ? [ctx.location] : []),
    remotePreference: ctx.remotePreference,
    salaryExpectation: ctx.salaryExpectation,
    culturePreference: ctx.questionnaire.culturePreference,
    workToAvoid: ctx.questionnaire.workToAvoid,
  }
}
