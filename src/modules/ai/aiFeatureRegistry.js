export const AI_FEATURES = {
  jobAnalysis: {
    id: 'jobAnalysis',
    label: 'Job Analyst',
    apiPath: '/api/ai/job-analysis',
    settingsKey: 'jobAnalysis',
  },
  resumeEnhancement: {
    id: 'resumeEnhancement',
    label: 'Resume Strategist',
    apiPath: '/api/ai/resume-enhance',
    settingsKey: 'resumeEnhancement',
  },
  coverLetter: {
    id: 'coverLetter',
    label: 'Cover Letter Specialist',
    apiPath: '/api/ai/cover-letter',
    settingsKey: 'coverLetter',
  },
  interviewPrep: {
    id: 'interviewPrep',
    label: 'Interview Coach',
    apiPath: '/api/ai/interview-prep',
    settingsKey: 'interviewPrep',
  },
  outreach: {
    id: 'outreach',
    label: 'Outreach Assistant',
    apiPath: '/api/ai/outreach',
    settingsKey: 'outreach',
  },
  careerStrategy: {
    id: 'careerStrategy',
    label: 'Career Strategist',
    apiPath: '/api/ai/career-strategy',
    settingsKey: 'careerStrategy',
  },
  skillGap: {
    id: 'skillGap',
    label: 'Skill Gap Engine',
    apiPath: '/api/ai/skill-gap',
    settingsKey: 'skillGap',
  },
  applicationStrategy: {
    id: 'applicationStrategy',
    label: 'Application Strategist',
    apiPath: '/api/ai/application-strategy',
    settingsKey: 'applicationStrategy',
  },
  companyIntelligence: {
    id: 'companyIntelligence',
    label: 'Company Intelligence',
    apiPath: '/api/ai/company-intelligence',
    settingsKey: 'companyIntelligence',
  },
  chat: {
    id: 'chat',
    label: 'AI Command Center',
    apiPath: '/api/ai/chat',
    settingsKey: 'careerStrategy',
  },
}

export function getFeature(featureId) {
  return AI_FEATURES[featureId] || null
}

export function isFeatureEnabled(settings, featureId) {
  const feature = getFeature(featureId)
  if (!feature) return false
  return settings?.features?.[feature.settingsKey] !== false
}
