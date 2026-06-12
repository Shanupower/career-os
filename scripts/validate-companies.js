#!/usr/bin/env node
/**
 * Validate companies/*.json schema for ATS configs.
 * Usage: node scripts/validate-companies.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const COMPANIES = path.join(ROOT, 'companies')

let errors = 0

function fail(msg) {
  console.error(`ERROR: ${msg}`)
  errors += 1
}

function loadJson(file) {
  const raw = fs.readFileSync(file, 'utf-8')
  return JSON.parse(raw)
}

function validateGreenhouse() {
  const file = path.join(COMPANIES, 'greenhouse.json')
  if (!fs.existsSync(file)) return fail('missing companies/greenhouse.json')
  const data = loadJson(file)
  if (!Array.isArray(data)) return fail('greenhouse.json must be an array')
  const boards = new Set()
  for (const [i, entry] of data.entries()) {
    if (!entry || typeof entry !== 'object') fail(`greenhouse[${i}] must be an object`)
    if (!entry.board || typeof entry.board !== 'string') fail(`greenhouse[${i}] missing board`)
    if (!entry.company || typeof entry.company !== 'string') fail(`greenhouse[${i}] missing company`)
    if (boards.has(entry.board)) fail(`duplicate greenhouse board: ${entry.board}`)
    boards.add(entry.board)
  }
  console.log(`greenhouse.json: ${data.length} entries`)
}

function validateSlugList(name) {
  const file = path.join(COMPANIES, `${name}.json`)
  if (!fs.existsSync(file)) return fail(`missing companies/${name}.json`)
  const data = loadJson(file)
  if (!Array.isArray(data)) return fail(`${name}.json must be an array`)
  const slugs = new Set()
  for (const [i, slug] of data.entries()) {
    if (typeof slug !== 'string' || !slug.trim()) fail(`${name}[${i}] must be a non-empty string`)
    if (slugs.has(slug)) fail(`duplicate ${name} slug: ${slug}`)
    slugs.add(slug)
  }
  console.log(`${name}.json: ${data.length} entries`)
}

validateGreenhouse()
validateSlugList('lever')
validateSlugList('ashby')

if (errors) {
  console.error(`\n${errors} validation error(s)`)
  process.exit(1)
}
console.log('\nAll company configs valid.')
process.exit(0)
