import { SKILLS_DICTIONARY } from '../../data/skillsDictionary.js'
import { matchSkillToBucket } from './skillBuckets.js'
import { isNonTechnicalPhrase } from './mappingPhrases.js'

function dedupe(arr) {
  return [...new Set(arr.filter(Boolean))]
}

const TECH_BUCKETS = new Set(['frontend', 'backend', 'database', 'cloudDevOps', 'aiAutomation'])

const CULTURE_PREFERENCE_ROUTING = {
  'Building products': 'productBusiness',
  'Solving hard technical problems': 'technicalSkills',
  'Mentoring others': 'leadership',
  'System design': 'technicalSkills',
  'Fast-paced environments': 'softSkills',
  'Deep focus work': 'softSkills',
  'Collaboration': 'softSkills',
  'Innovation & R&D': 'technicalSkills',
  'Data & analytics': 'technicalSkills',
  'Customer impact': 'productBusiness',
}

const RECRUITER_PERCEPTION_ROUTING = {
  'Technical expert': 'technicalSkills',
  'Product-minded engineer': 'productBusiness',
  'Strong communicator': 'softSkills',
  'Natural leader': 'leadership',
  'Reliable executor': 'softSkills',
  'Innovative problem-solver': 'technicalSkills',
  'Full-stack generalist': null,
  'Domain specialist': null,
  'Team player': 'softSkills',
  'Fast learner': 'softSkills',
}

const SOFT_SKILL_ALLOW_PATTERNS = [
  /communicat/i,
  /collaborat/i,
  /ownership/i,
  /learn/i,
  /reliab/i,
  /team/i,
  /leader/i,
  /execut/i,
  /fast-paced/i,
  /deep focus/i,
  /team player/i,
]

const TECHNICAL_SOFT_BLOCKLIST = [
  /system design/i,
  /building products/i,
  /solving hard technical/i,
  /technical expert/i,
  /data\s*&\s*analytics/i,
  /innovation/i,
  /product-minded/i,
]

function matchesSkillsDictionary(skill) {
  const lower = (skill || '').toLowerCase().trim()
  return SKILLS_DICTIONARY.some((s) => {
    const dictLower = s.toLowerCase()
    return lower === dictLower || lower.includes(dictLower) || dictLower.includes(lower)
  })
}

function isTechnicalSkill(skill) {
  if (isNonTechnicalPhrase(skill)) return false

  const bucket = matchSkillToBucket(skill)
  if (bucket === 'softSkills' || bucket === 'leadership' || bucket === 'productBusiness') {
    return false
  }
  if (bucket && TECH_BUCKETS.has(bucket)) return true

  return matchesSkillsDictionary(skill)
}

function isAllowedSoftSkill(item) {
  if (TECHNICAL_SOFT_BLOCKLIST.some((re) => re.test(item))) return false
  return SOFT_SKILL_ALLOW_PATTERNS.some((re) => re.test(item))
}

function routeLabeledItem(item, routingMap, buckets) {
  const target = routingMap[item]
  if (!target) return
  if (target === 'technicalSkills') {
    if (!buckets.technicalSkills.includes(item)) buckets.technicalSkills.push(item)
    return
  }
  if (target === 'softSkills' && isAllowedSoftSkill(item)) {
    buckets.softSkills.push(item)
    return
  }
  if (target !== 'softSkills' && buckets[target]) {
    buckets[target].push(item)
  }
}

export function classifySkills(ctx) {
  const buckets = {
    technicalSkills: [],
    frontend: [],
    backend: [],
    database: [],
    cloudDevOps: [],
    aiAutomation: [],
    productBusiness: [],
    leadership: [],
    softSkills: [],
  }

  const rawSkills = dedupe([
    ...ctx.allSkills,
    ...ctx.parsedData.skills,
    ...ctx.questionnaire.technicalSkills,
    ...ctx.questionnaire.technologies,
  ])

  for (const skill of rawSkills) {
    if (!isTechnicalSkill(skill)) continue

    buckets.technicalSkills.push(skill)
    const bucket = matchSkillToBucket(skill)
    if (bucket && buckets[bucket]) buckets[bucket].push(skill)
  }

  buckets.productBusiness = dedupe([
    ...buckets.productBusiness,
    ...ctx.questionnaire.productBusiness,
  ])

  for (const item of ctx.questionnaire.culturePreference) {
    routeLabeledItem(item, CULTURE_PREFERENCE_ROUTING, buckets)
  }

  buckets.leadership = dedupe([
    ...buckets.leadership,
    ...ctx.questionnaire.leadershipExamples,
  ])

  for (const item of ctx.questionnaire.recruiterPerception) {
    routeLabeledItem(item, RECRUITER_PERCEPTION_ROUTING, buckets)
  }

  for (const item of ctx.questionnaire.candidateStrengths) {
    if (item.toLowerCase().includes('communication') || item.toLowerCase().includes('learner')) {
      if (isAllowedSoftSkill(item)) buckets.softSkills.push(item)
    }
  }

  buckets.softSkills = dedupe(buckets.softSkills.filter(isAllowedSoftSkill))

  for (const key of Object.keys(buckets)) {
    if (key !== 'softSkills') buckets[key] = dedupe(buckets[key])
  }

  return buckets
}
