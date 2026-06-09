import { normalizeProfile } from './profileNormalizer.js'
import { classifySkills } from './skillsClassifier.js'
import { generateRoleStrategy } from './roleStrategyGenerator.js'
import { generateAtsKeywords } from './atsKeywordGenerator.js'
import { generateSearchStrategy } from './searchStrategyGenerator.js'
import {
  buildCandidateSummary,
  buildExperienceMap,
  buildJobFitPreferences,
} from './candidateNarrativeBuilder.js'
import { validateIntelligenceMapping } from './intelligenceValidators.js'
import { runIntelligenceQualityChecks } from './intelligenceQualityChecks.js'
import { buildCandidateStrengths } from './strengthsBuilder.js'

const SCORING_WEIGHTS = {
  roleMatch: 25,
  skillMatch: 25,
  industryMatch: 15,
  experienceMatch: 15,
  locationMatch: 10,
  cultureMatch: 10,
}

/** @typedef {import('../../types/career-os.d.ts').Profile} Profile */
/** @typedef {import('../../types/career-os.d.ts').CandidateIntelligence} CandidateIntelligence */

/**
 * @param {Profile} rawProfile
 * @param {object} [options]
 * @returns {CandidateIntelligence}
 */
export function generateCandidateIntelligence(rawProfile, options = {}) {
  const ctx = normalizeProfile(rawProfile)
  const skillsMap = classifySkills(ctx)
  const roleStrategy = generateRoleStrategy(ctx)
  const { resumeKeywords, atsKeywordBank } = generateAtsKeywords(ctx, roleStrategy, skillsMap)
  const searchStrategy = generateSearchStrategy(ctx, roleStrategy, skillsMap)
  const candidateSummary = buildCandidateSummary(ctx, skillsMap)
  const experienceMap = buildExperienceMap(ctx)
  const jobFitPreferences = buildJobFitPreferences(ctx)

  const candidateStrengths = buildCandidateStrengths(ctx, skillsMap)

  const candidateWeaknesses = ctx.questionnaire.candidateWeaknesses.slice(0, 6)

  const intelligence = {
    candidateSummary,
    roleStrategy,
    skillsMap,
    experienceMap,
    jobFitPreferences,
    candidateStrengths,
    candidateWeaknesses,
    resumeKeywords,
    atsKeywordBank,
    searchStrategy,
    scoringWeights: { ...SCORING_WEIGHTS },
    meta: {
      generatedAt: new Date().toISOString(),
      sourceProfileVersion: ctx.profile.meta?.profileVersion || '1.0',
      intelligenceVersion: '1.0',
    },
  }

  if (typeof options.enrichFn === 'function') {
    return options.enrichFn(intelligence, ctx)
  }

  if (options.validateMapping !== false) {
    validateIntelligenceMapping(intelligence)
  }

  if (options.qualityChecks !== false) {
    runIntelligenceQualityChecks(intelligence)
  }

  return intelligence
}
