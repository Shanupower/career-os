import { describe, it, expect } from 'vitest'
import { classifySkills } from '../../src/modules/intelligence/skillsClassifier.js'

const EMPTY_QUESTIONNAIRE = {
  technicalSkills: [],
  technologies: [],
  productBusiness: [],
  culturePreference: [],
  leadershipExamples: [],
  recruiterPerception: [],
  candidateStrengths: [],
}

function baseCtx(overrides = {}) {
  const { questionnaire: qOverride, parsedData: pdOverride, ...rest } = overrides
  return {
    allSkills: [],
    parsedData: { skills: [], ...pdOverride },
    questionnaire: { ...EMPTY_QUESTIONNAIRE, ...qOverride },
    ...rest,
  }
}

describe('classifySkills', () => {
  it('classifies technical skills into buckets', () => {
    const buckets = classifySkills(baseCtx({
      parsedData: { skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'] },
    }))
    expect(buckets.technicalSkills).toContain('React')
    expect(buckets.technicalSkills).toContain('Node.js')
    expect(buckets.frontend).toContain('React')
    expect(buckets.backend).toContain('Node.js')
    expect(buckets.database).toContain('PostgreSQL')
    expect(buckets.cloudDevOps).toContain('AWS')
  })

  it('routes culture preferences to appropriate buckets', () => {
    const buckets = classifySkills(baseCtx({
      questionnaire: {
        culturePreference: ['Building products', 'Collaboration'],
      },
    }))
    expect(buckets.productBusiness).toContain('Building products')
    expect(buckets.softSkills).toContain('Collaboration')
  })

  it('deduplicates skills across sources', () => {
    const buckets = classifySkills(baseCtx({
      allSkills: ['React'],
      parsedData: { skills: ['React'] },
      questionnaire: { technicalSkills: ['React'], technologies: [] },
    }))
    expect(buckets.technicalSkills.filter((s) => s === 'React').length).toBe(1)
  })

  it('excludes non-technical phrases from technicalSkills', () => {
    const buckets = classifySkills(baseCtx({
      parsedData: { skills: ['Team player', 'React'] },
    }))
    expect(buckets.technicalSkills).toContain('React')
    expect(buckets.technicalSkills).not.toContain('Team player')
  })
})
