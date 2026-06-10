import { BaseProvider } from './baseProvider.js'

export class OllamaProvider extends BaseProvider {
  constructor() {
    super('ollama')
  }

  async complete({ messages, model, temperature, maxTokens, baseUrl }) {
    const url = `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/api/chat`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3.2',
        messages,
        stream: false,
        options: { temperature: temperature ?? 0.3, num_predict: maxTokens ?? 2000 },
      }),
    })
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
    const data = await res.json()
    return {
      text: data.message?.content || '',
      usage: { inputTokens: 0, outputTokens: 0 },
    }
  }

  async healthCheck({ baseUrl }) {
    try {
      const url = `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/api/tags`
      const res = await fetch(url)
      return { online: res.ok }
    } catch (e) {
      return { online: false, reason: e.message }
    }
  }

  async listModels({ baseUrl }) {
    try {
      const url = `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/api/tags`
      const res = await fetch(url)
      if (!res.ok) return []
      const data = await res.json()
      return (data.models || []).map((m) => m.name)
    } catch {
      return []
    }
  }
}
