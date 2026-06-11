#!/usr/bin/env node
/**
 * Save candidate intelligence to data/intelligence/candidate-intelligence.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
export const INTELLIGENCE_PATH = path.join(ROOT, 'data/intelligence/candidate-intelligence.json')

export function saveIntelligenceToDisk(intelligence) {
  if (!intelligence || typeof intelligence !== 'object') {
    throw new Error('Invalid intelligence payload')
  }
  const clone = JSON.parse(JSON.stringify(intelligence))
  fs.mkdirSync(path.dirname(INTELLIGENCE_PATH), { recursive: true })
  fs.writeFileSync(INTELLIGENCE_PATH, JSON.stringify(clone, null, 2), 'utf-8')
  return { path: INTELLIGENCE_PATH, savedAt: clone.meta?.generatedAt || new Date().toISOString() }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const input = fs.readFileSync(0, 'utf-8')
  const intelligence = JSON.parse(input)
  const result = saveIntelligenceToDisk(intelligence)
  console.log(`Saved intelligence → ${result.path}`)
}
