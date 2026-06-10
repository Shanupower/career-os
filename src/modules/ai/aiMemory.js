const MEMORY_KEY = 'job-dashboard-ai-memory'

export function getDefaultMemory() {
  return {
    careerGoals: [],
    preferredCompanies: [],
    preferredIndustries: [],
    avoidIndustries: [],
    identifiedWeaknesses: [],
    identifiedStrengths: [],
    recommendedSkills: [],
    applicationLessons: [],
    interviewLessons: [],
    updatedAt: null,
  }
}

export function loadAiMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY)
    if (!raw) return getDefaultMemory()
    return { ...getDefaultMemory(), ...JSON.parse(raw) }
  } catch {
    return getDefaultMemory()
  }
}

export function saveAiMemory(memory) {
  const next = { ...memory, updatedAt: new Date().toISOString() }
  localStorage.setItem(MEMORY_KEY, JSON.stringify(next))
  return next
}

function dedupeAppend(arr, items) {
  const set = new Set((arr || []).map((s) => String(s).toLowerCase().trim()))
  const out = [...(arr || [])]
  for (const item of items || []) {
    const key = String(item).toLowerCase().trim()
    if (key && !set.has(key)) {
      set.add(key)
      out.push(item)
    }
  }
  return out
}

export function mergeFeatureIntoMemory(featureId, result) {
  const memory = loadAiMemory()
  if (!result) return memory

  if (featureId === 'jobAnalysis') {
    memory.identifiedStrengths = dedupeAppend(memory.identifiedStrengths, result.strengths)
    memory.identifiedWeaknesses = dedupeAppend(memory.identifiedWeaknesses, result.missingSkills)
  }
  if (featureId === 'skillGap') {
    memory.recommendedSkills = dedupeAppend(memory.recommendedSkills, result.highImpactSkills)
  }
  if (featureId === 'careerStrategy') {
    memory.careerGoals = dedupeAppend(memory.careerGoals, [result.careerDirection].filter(Boolean))
    memory.recommendedSkills = dedupeAppend(memory.recommendedSkills, result.recommendedCertifications)
  }
  if (featureId === 'applicationStrategy') {
    memory.applicationLessons = dedupeAppend(memory.applicationLessons, result.recommendedChanges)
  }
  if (featureId === 'interviewPrep') {
    memory.interviewLessons = dedupeAppend(memory.interviewLessons, result.revisionTopics)
  }

  return saveAiMemory(memory)
}
