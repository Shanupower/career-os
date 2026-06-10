export const AI_SETTINGS_KEY = 'job-dashboard-ai-settings'

export const DEFAULT_AI_SETTINGS = {
  provider: 'claude-code',
  model: 'sonnet',
  temperature: 0.3,
  maxTokens: 2000,
  apiKey: '',
  baseUrl: '',
  features: {
    jobAnalysis: true,
    resumeEnhancement: true,
    coverLetter: true,
    interviewPrep: true,
    outreach: true,
    careerStrategy: true,
    skillGap: true,
    applicationStrategy: true,
    companyIntelligence: true,
  },
}

export const PROVIDER_DEFAULTS = {
  'claude-code': { model: 'sonnet', baseUrl: '' },
  mock: { model: 'mock', baseUrl: '' },
  ollama: { model: 'llama3.2', baseUrl: 'http://localhost:11434' },
  openai: { model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1' },
  claude: { model: 'claude-sonnet-4-20250514', baseUrl: 'https://api.anthropic.com' },
  gemini: { model: 'gemini-2.0-flash', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  openrouter: { model: 'anthropic/claude-sonnet-4', baseUrl: 'https://openrouter.ai/api/v1' },
}

export function maskApiKey(key) {
  if (!key || key.length < 8) return key ? '****' : ''
  return `${key.slice(0, 3)}****${key.slice(-4)}`
}

export function loadAiSettings() {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_AI_SETTINGS }
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw), features: { ...DEFAULT_AI_SETTINGS.features, ...JSON.parse(raw).features } }
  } catch {
    return { ...DEFAULT_AI_SETTINGS }
  }
}

export function saveAiSettings(settings) {
  const merged = {
    ...DEFAULT_AI_SETTINGS,
    ...settings,
    features: { ...DEFAULT_AI_SETTINGS.features, ...settings.features },
  }
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(merged))
  return merged
}

export function settingsForApi(settings) {
  return {
    provider: settings.provider,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
  }
}
