const ADJACENCY = {
  'technical product manager': [
    'Product Manager - Technical', 'Technical PM', 'Product Owner', 'Platform Product Manager',
    'SaaS Product Manager', 'AI Product Manager',
  ],
  'product manager': [
    'Technical Product Manager', 'Product Owner', 'Associate Product Manager', 'Growth Product Manager',
  ],
  'full stack developer': [
    'Full Stack Engineer', 'Software Engineer', 'Web Developer', 'Full Stack Product Engineer',
  ],
  'full stack engineer': [
    'Full Stack Developer', 'Software Engineer', 'Web Developer',
  ],
  'software engineer': [
    'Full Stack Developer', 'Backend Developer', 'Frontend Developer', 'Software Developer',
  ],
  'frontend developer': [
    'Frontend Engineer', 'UI Engineer', 'React Developer', 'Web Developer',
  ],
  'backend developer': [
    'Backend Engineer', 'API Developer', 'Node.js Developer', 'Python Developer',
  ],
  'solutions architect': [
    'Cloud Architect', 'Technical Architect', 'Enterprise Architect', 'System Architect',
  ],
  'engineering manager': [
    'Engineering Lead', 'Tech Lead', 'Development Manager', 'Head of Engineering',
  ],
  'data analyst': [
    'Business Analyst', 'Data Analyst', 'Analytics Engineer', 'BI Analyst',
  ],
  'devops engineer': [
    'Site Reliability Engineer', 'Platform Engineer', 'Cloud Engineer', 'Infrastructure Engineer',
  ],
}

const STRETCH_BY_FAMILY = {
  fullstack: [
    'Senior Full Stack Engineer',
    'Lead Full Stack Engineer',
    'Staff Full Stack Engineer',
    'Principal Software Engineer',
    'Engineering Manager',
    'Head of Engineering',
  ],
  backend: [
    'Senior Backend Engineer',
    'Lead Backend Engineer',
    'Staff Backend Engineer',
    'Principal Backend Engineer',
    'Engineering Manager',
  ],
  frontend: [
    'Senior Frontend Engineer',
    'Lead Frontend Engineer',
    'Staff Frontend Engineer',
    'Principal Frontend Engineer',
    'Engineering Manager',
  ],
  product: [
    'Senior Technical Product Manager',
    'Lead Product Manager',
    'Group Product Manager',
    'Head of Product',
    'Director of Product',
  ],
  generic: [
    'Senior Software Engineer',
    'Lead Software Engineer',
    'Staff Software Engineer',
    'Principal Software Engineer',
    'Engineering Manager',
  ],
}

const UNNATURAL_STRETCH_PATTERN = /\b(head of|director of)\s+.+\s+engineer\b/i

function detectRoleFamily(role) {
  const lower = (role || '').toLowerCase()
  if (/product|technical product|\bpm\b/.test(lower)) return 'product'
  if (/frontend|front-end|ui engineer/.test(lower)) return 'frontend'
  if (/backend|back-end|api developer/.test(lower)) return 'backend'
  if (/full.?stack|software engineer|software developer|web developer/.test(lower)) return 'fullstack'
  return 'generic'
}

export function getAdjacentRoles(role) {
  const key = (role || '').toLowerCase().trim()
  for (const [pattern, variants] of Object.entries(ADJACENCY)) {
    if (key.includes(pattern) || pattern.includes(key)) return variants
  }
  return []
}

export function getStretchRoles(primaryRoles) {
  const stretch = []
  const families = new Set(primaryRoles.map(detectRoleFamily))

  for (const family of families) {
    stretch.push(...(STRETCH_BY_FAMILY[family] || STRETCH_BY_FAMILY.generic))
  }

  return [...new Set(stretch)]
    .filter((role) => !UNNATURAL_STRETCH_PATTERN.test(role))
    .slice(0, 8)
}

export function expandRoleVariants(roles) {
  const variants = new Set(roles)
  for (const role of roles) {
    getAdjacentRoles(role).forEach((v) => variants.add(v))
    const words = role.split(/\s+/)
    if (words.length > 2) variants.add(words.slice(0, 2).join(' '))
  }
  return [...variants]
}

const AVOID_ROLE_HINTS = {
  'heavy on-call': ['Site Reliability Engineer', 'DevOps Engineer', 'NOC Engineer'],
  'on-call': ['Site Reliability Engineer', 'DevOps Engineer'],
  'legacy-only': ['Maintenance Engineer', 'Legacy Systems Developer'],
  'repetitive': ['Data Entry', 'Manual QA Tester'],
}

export function getAvoidRolesFromWorkAvoid(workAvoidItems) {
  const avoid = []
  const lower = workAvoidItems.join(' ').toLowerCase()
  for (const [hint, roles] of Object.entries(AVOID_ROLE_HINTS)) {
    if (lower.includes(hint)) avoid.push(...roles)
  }
  return [...new Set(avoid)]
}
