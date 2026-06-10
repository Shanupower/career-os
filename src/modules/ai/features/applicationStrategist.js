import { buildApplicationContext } from '../aiContextBuilder.js'
import { runAiFeature } from '../aiClient.js'

export async function runApplicationStrategy(options = {}) {
  const applications = buildApplicationContext()
  return runAiFeature('applicationStrategy', { extra: { applications }, ...options })
}
