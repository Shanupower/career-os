import { MockProvider } from './providers/mockProvider.js'
import { ClaudeCodeProvider } from './providers/claudeCodeProvider.js'
import { OllamaProvider } from './providers/ollamaProvider.js'
import { OpenAIProvider } from './providers/openaiProvider.js'
import { ClaudeProvider } from './providers/claudeProvider.js'
import { GeminiProvider } from './providers/geminiProvider.js'
import { OpenRouterProvider } from './providers/openrouterProvider.js'

const providers = {
  'claude-code': new ClaudeCodeProvider(),
  mock: new MockProvider(),
  ollama: new OllamaProvider(),
  openai: new OpenAIProvider(),
  claude: new ClaudeProvider(),
  gemini: new GeminiProvider(),
  openrouter: new OpenRouterProvider(),
}

/** Providers that work without an API key. */
export const KEYLESS_PROVIDERS = new Set(['mock', 'ollama', 'claude-code'])

export const PROVIDER_NAMES = Object.keys(providers)

export function getProvider(name) {
  return providers[name] || providers.mock
}

export async function checkProviderHealth(settings) {
  const provider = getProvider(settings.provider)
  const health = await provider.healthCheck(settings)
  return { provider: settings.provider, ...health }
}

export async function listProviderModels(settings) {
  const provider = getProvider(settings.provider)
  return provider.listModels(settings)
}
