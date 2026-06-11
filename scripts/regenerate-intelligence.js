import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { generateCandidateIntelligence } from '../src/modules/intelligence/candidateIntelligenceEngine.js'
import { validateIntelligenceMapping } from '../src/modules/intelligence/intelligenceValidators.js'
import { runIntelligenceQualityChecks } from '../src/modules/intelligence/intelligenceQualityChecks.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const profilePath = join(root, 'fixtures/candidate-profile.sample.json')
const outputPath = join(root, 'fixtures/candidate-intelligence.json')

const profile = JSON.parse(readFileSync(profilePath, 'utf8'))
const intelligence = generateCandidateIntelligence(profile, {
  validateMapping: false,
  qualityChecks: false,
})
const mapping = validateIntelligenceMapping(intelligence)
const quality = runIntelligenceQualityChecks(intelligence)

writeFileSync(outputPath, JSON.stringify(intelligence, null, 2))

console.log(`Wrote ${outputPath}`)
const totalWarnings = mapping.warnings.length + quality.warnings.length
if (totalWarnings === 0) {
  console.log('validateIntelligenceMapping: no warnings')
  console.log('runIntelligenceQualityChecks: passed')
} else {
  console.warn(`Total warnings: ${totalWarnings}`)
  process.exitCode = 1
}
