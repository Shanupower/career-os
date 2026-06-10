import { BaseProvider } from './baseProvider.js'

export class GeminiProvider extends BaseProvider {
  constructor() {
    super('gemini')
  }

  async complete({ messages, model, temperature, maxTokens, apiKey }) {
    const modelId = model || 'gemini-2.0-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    const system = messages.find((m) => m.role === 'system')?.content
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: {
          temperature: temperature ?? 0.3,
          maxOutputTokens: maxTokens ?? 2000,
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || `Gemini error: ${res.status}`)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return {
      text,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      },
    }
  }

  async healthCheck({ apiKey }) {
    if (!apiKey) return { online: false, reason: 'API key required' }
    return { online: true }
  }

  async listModels() {
    return ['gemini-2.0-flash', 'gemini-1.5-pro']
  }
}
