import { BaseProvider } from './baseProvider.js'

export class OpenRouterProvider extends BaseProvider {
  constructor() {
    super('openrouter')
  }

  async complete({ messages, model, temperature, maxTokens, apiKey, baseUrl }) {
    const url = `${(baseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '')}/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Career OS',
      },
      body: JSON.stringify({
        model: model || 'anthropic/claude-sonnet-4',
        messages,
        temperature: temperature ?? 0.3,
        max_tokens: maxTokens ?? 2000,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || `OpenRouter error: ${res.status}`)
    return {
      text: data.choices?.[0]?.message?.content || '',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
    }
  }

  async healthCheck({ apiKey }) {
    if (!apiKey) return { online: false, reason: 'API key required' }
    return { online: true }
  }

  async listModels({ apiKey, baseUrl }) {
    if (!apiKey) return ['anthropic/claude-sonnet-4', 'openai/gpt-4o-mini']
    try {
      const url = `${(baseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '')}/models`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
      if (!res.ok) return ['anthropic/claude-sonnet-4']
      const data = await res.json()
      return (data.data || []).slice(0, 30).map((m) => m.id)
    } catch {
      return ['anthropic/claude-sonnet-4']
    }
  }
}
