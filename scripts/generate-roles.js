const TechRolesLibrary = require('@sparring/tech-roles-library')
const fs = require('fs')
const path = require('path')

const lib = new TechRolesLibrary({ language: 'en' })
const meta = lib.getAllRolesWithMetadata()
const titles = new Set()

meta.roles.forEach((r) => {
  titles.add(r.role)
  r.availableLevels.forEach((l) => {
    titles.add(l.level.replace(/^L\d+\s*-\s*/i, '').trim())
  })
})

const sorted = [...titles].sort((a, b) => a.localeCompare(b))
const out = {
  source: '@sparring/tech-roles-library',
  version: require('@sparring/tech-roles-library/package.json').version,
  count: sorted.length,
  roles: sorted,
}

const outPath = path.join(__dirname, '../src/data/jobRoles.json')
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')
console.log('Generated', sorted.length, 'roles ->', outPath)
