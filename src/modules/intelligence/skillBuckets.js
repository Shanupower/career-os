export const SKILL_BUCKETS = {
  frontend: [
    'react', 'vue', 'angular', 'next.js', 'html', 'css', 'tailwind', 'sass', 'javascript',
    'typescript', 'frontend', 'ui', 'ux', 'figma', 'flutter', 'react native', 'ios', 'android',
  ],
  backend: [
    'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'java', 'python', 'go', 'rust',
    'ruby', 'php', 'api', 'graphql', 'grpc', 'microservices', 'backend', 'server',
  ],
  database: [
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'sqlite', 'oracle',
    'sql', 'database', 'kafka', 'rabbitmq', 'spark', 'hadoop',
  ],
  cloudDevOps: [
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'jenkins', 'github actions',
    'linux', 'nginx', 'devops', 'sre', 'cloud', 'infrastructure',
  ],
  aiAutomation: [
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp', 'computer vision', 'ai',
    'automation', 'llm', 'data science', 'mlops',
  ],
  productBusiness: [
    'product', 'roadmap', 'stakeholder', 'agile', 'scrum', 'jira', 'business', 'go-to-market',
    'user research', 'prioritization', 'requirements',
  ],
  leadership: [
    'lead', 'manager', 'director', 'head', 'cto', 'mentor', 'ownership', 'team lead',
    'hiring', 'strategic',
  ],
  softSkills: [
    'communication', 'collaboration', 'problem-solving', 'mentoring', 'customer', 'empathy',
    'fast learner', 'team player',
  ],
}

export function matchSkillToBucket(skill) {
  const lower = (skill || '').toLowerCase()
  const matches = []
  for (const [bucket, keywords] of Object.entries(SKILL_BUCKETS)) {
    if (keywords.some((kw) => lower.includes(kw) || kw.includes(lower))) {
      matches.push(bucket)
    }
  }
  return matches[0] || null
}
