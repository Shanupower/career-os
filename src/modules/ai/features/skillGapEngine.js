import { buildSkillGapContext } from '../aiContextBuilder.js'
import { runAiFeature } from '../aiClient.js'

export async function runSkillGapAnalysis(options = {}) {
  const skillGap = buildSkillGapContext()
  return runAiFeature('skillGap', { extra: { skillGap }, ...options })
}
