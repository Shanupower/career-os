import roleData from '../data/jobRoles.json'

const ALL_ROLES = roleData.roles

export function getRoleCount() {
  return roleData.count
}

export function getAllRoleTitles() {
  return ALL_ROLES
}

export function searchRoles(query, limit = 12) {
  const trimmed = (query || '').trim().toLowerCase()
  if (!trimmed) {
    return ALL_ROLES.slice(0, limit).map((role) => ({ role, category: null }))
  }

  const terms = trimmed.split(/\s+/).filter(Boolean)
  const scored = []

  for (const role of ALL_ROLES) {
    const lower = role.toLowerCase()
    let score = 0

    if (lower.startsWith(trimmed)) score += 20
    else if (lower.includes(trimmed)) score += 10

    for (const term of terms) {
      if (lower.includes(term)) score += 5
    }

    if (score > 0) scored.push({ role, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.role.localeCompare(b.role))
    .slice(0, limit)
    .map(({ role }) => ({ role, category: null }))
}

export function roleDataMeta() {
  return { source: roleData.source, version: roleData.version, count: roleData.count }
}
