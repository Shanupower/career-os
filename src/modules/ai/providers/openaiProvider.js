import { BaseProvider } from './baseProvider.js'

export class OpenAIProvider extends BaseProvider {
  constructor() {
    super('openai')
  }

  async complete({ messages, model, temperature, maxTokens, apiKey, baseUrl }) {
    const url = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        temperature: temperature ?? 0.3,
        max_tokens: maxTokens ?? 2000,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || `OpenAI error: ${res.status}`)
    return {
      text: data.choices?.[0]?.message?.content || '',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
    }
  }

  async healthCheck({ apiKey, baseUrl }) {
    if (!apiKey) return { online: false, reason: 'API key required' }
    try {
      const url = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/models`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
      return { online: res.ok, reason: res.ok ? undefined : `HTTP ${res.status}` }
    } catch (e) {
      return { online: false, reason: e.message }
    }
  }

  async listModels({ apiKey, baseUrl }) {
    if (!apiKey) return ['gpt-4o-mini', 'gpt-4o']
    try {
      const url = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/models`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
      if (!res.ok) return ['gpt-4o-mini', 'gpt-4o']
      const data = await res.json()
      return (data.data || []).map((m) => m.id).filter((id) => id.includes('gpt')).slice(0, 20)
    } catch {
      return ['gpt-4o-mini', 'gpt-4o']
    }
  }
}
