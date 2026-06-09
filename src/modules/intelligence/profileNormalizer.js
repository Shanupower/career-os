import { buildExportProfile } from '../../utils/exportJson.js'
import {
  COMPANY_TYPES,
  BUSINESS_SKILLS,
  PROJECT_THEMES,
  PROBLEMS_SOLVED,
  ACHIEVEMENTS,
  BEYOND_EXPERIENCE,
  WORK_ENJOY,
  WORK_AVOID,
  INDUSTRIES,
  RECRUITER_PERCEPTION,
  DIFFERENTIATORS,
  LEADERSHIP_EXAMPLES,
  WEAKNESSES_IMPROVING,
} from '../../data/questionOptions.js'

function splitCommaList(answer) {
  if (!answer || typeof answer !== 'string') return []
  return answer.split(',').map((s) => s.trim()).filter(Boolean)
}

function filterToAllowedOptions(values, allowedOptions) {
  const allowed = new Set(allowedOptions)
  return values.filter((v) => allowed.has(v))
}

function parseSingleAnswer(raw, allowedOptions) {
  const trimmed = (raw || '').trim()
  if (!trimmed) return []
  if (allowedOptions.includes(trimmed)) return [trimmed]
  return [trimmed]
}

function parseSkillsAnswer(raw) {
  return splitCommaList(raw)
}

function parseMultiAnswer(raw, allowedOptions) {
  return filterToAllowedOptions(splitCommaList(raw), allowedOptions)
}

function parseProjectsAnswer(raw, resumeProjects) {
  const values = splitCommaList(raw)
  const allowed = new Set([...PROJECT_THEMES, ...resumeProjects])
  return values.filter((v) => allowed.has(v))
}

function parseTextareaAnswer(raw) {
  return (raw || '').trim()
}

function parseQuestionnaireAnswers(answers, resumeProjects) {
  const getAnswer = (id) => answers.find((a) => a.id === id)?.answer || ''

  const preferredCompanyTypes = parseSingleAnswer(getAnswer(1), COMPANY_TYPES)
  const technicalSkills = parseSkillsAnswer(getAnswer(2))
  const productBusiness = parseMultiAnswer(getAnswer(3), BUSINESS_SKILLS)
  const projectHighlights = parseProjectsAnswer(getAnswer(4), resumeProjects)
  const technologies = parseSkillsAnswer(getAnswer(5))
  const problemsSolved = parseMultiAnswer(getAnswer(6), PROBLEMS_SOLVED)
  const achievements = parseMultiAnswer(getAnswer(7), ACHIEVEMENTS)
  const ownershipExamples = parseMultiAnswer(getAnswer(8), BEYOND_EXPERIENCE)
  const culturePreference = parseMultiAnswer(getAnswer(9), WORK_ENJOY)
  const workToAvoid = parseMultiAnswer(getAnswer(10), WORK_AVOID)
  const preferredIndustries = parseMultiAnswer(getAnswer(11), INDUSTRIES)
  const avoidedIndustries = parseMultiAnswer(getAnswer(12), INDUSTRIES)
  const recruiterPerception = parseMultiAnswer(getAnswer(13), RECRUITER_PERCEPTION)
  const candidateStrengths = parseMultiAnswer(getAnswer(14), DIFFERENTIATORS)
  const leadershipExamples = parseMultiAnswer(getAnswer(15), LEADERSHIP_EXAMPLES)
  const candidateWeaknesses = parseMultiAnswer(getAnswer(16), WEAKNESSES_IMPROVING)
  const careerNarrative = parseTextareaAnswer(getAnswer(17))

  return {
    preferredCompanyTypes,
    technicalSkills,
    productBusiness,
    projectHighlights,
    technologies,
    problemsSolved,
    achievements,
    ownershipExamples,
    culturePreference,
    workToAvoid,
    preferredIndustries,
    avoidedIndustries,
    recruiterPerception,
    candidateStrengths,
    leadershipExamples,
    candidateWeaknesses,
    careerNarrative,
    // Backward-compatible aliases for engine modules
    companyTypes: preferredCompanyTypes,
    businessSkills: productBusiness,
    proudProjects: projectHighlights,
    beyondExperience: ownershipExamples,
    workEnjoy: culturePreference,
    workAvoid: workToAvoid,
    industriesInterested: preferredIndustries,
    industriesAvoid: avoidedIndustries,
    differentiators: candidateStrengths,
    weaknesses: candidateWeaknesses,
    careerSummary: careerNarrative,
  }
}

export function normalizeProfile(rawProfile) {
  const profile = buildExportProfile(rawProfile)
  const bp = profile.basicProfile || {}
  const pd = profile.resume?.parsedData || {}
  const answers = profile.questionnaire?.answers || []
  const resumeProjects = pd.projects || []

  const questionnaire = parseQuestionnaireAnswers(answers, resumeProjects)

  const resumeSkills = pd.skills || []
  const allSkills = [...new Set([
    ...resumeSkills,
    ...questionnaire.technicalSkills,
    ...questionnaire.technologies,
  ])]

  return {
    profile,
    basicProfile: bp,
    parsedData: pd,
    resumeText: profile.resume?.rawText || '',
    repositories: {
      githubLinks: (profile.repositories?.githubLinks || []).filter((s) => s && s.trim()),
      localRepoPaths: (profile.repositories?.localRepoPaths || []).filter((s) => s && s.trim()),
    },
    questionnaire,
    allSkills,
    targetRoles: bp.targetRoles || [],
    currentRole: bp.currentRole || '',
    experienceYears: parseFloat(bp.experienceYears) || 0,
    preferredLocations: bp.preferredLocations || [],
    remotePreference: bp.remotePreference || '',
    salaryExpectation: bp.salaryExpectation || '',
    location: bp.location || '',
    fullName: bp.fullName || '',
  }
}
