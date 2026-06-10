import { BaseProvider } from './baseProvider.js'

export class ClaudeProvider extends BaseProvider {
  constructor() {
    super('claude')
  }

  async complete({ messages, model, temperature, maxTokens, apiKey }) {
    const system = messages.find((m) => m.role === 'system')?.content || ''
    const userMessages = messages.filter((m) => m.role !== 'system')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: maxTokens ?? 2000,
        temperature: temperature ?? 0.3,
        system,
        messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || `Claude error: ${res.status}`)
    const text = data.content?.find((c) => c.type === 'text')?.text || ''
    return {
      text,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
    }
  }

  async healthCheck({ apiKey }) {
    if (!apiKey) return { online: false, reason: 'API key required' }
    return { online: true }
  }

  async listModels() {
    return ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022']
  }
}
