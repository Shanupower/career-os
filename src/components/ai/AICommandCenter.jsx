import { useState } from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { runAiFeature } from '../../modules/ai/aiClient'

const QUICK_PROMPTS = [
  'Which jobs should I prioritize?',
  'Which skills should I learn next?',
  'Why might my applications not be converting?',
  'How should I prepare for interviews this week?',
]

const CHAT_STORAGE_KEY = 'job-dashboard-ai-chat'

function loadChat() {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveChat(messages) {
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)))
  } catch {
    /* ignore */
  }
}

export default function AICommandCenter() {
  const [messages, setMessages] = useState(() => loadChat())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async (text) => {
    const question = (text || input).trim()
    if (!question || loading) return

    const userMsg = { role: 'user', content: question, at: new Date().toISOString() }
    const next = [...messages, userMsg]
    setMessages(next)
    saveChat(next)
    setInput('')
    setLoading(true)

    try {
      const result = await runAiFeature('chat', { message: question, skipCache: true })
      const assistantMsg = {
        role: 'assistant',
        content: result.data.answer,
        actions: result.data.suggestedActions,
        at: new Date().toISOString(),
      }
      const updated = [...next, assistantMsg]
      setMessages(updated)
      saveChat(updated)
    } catch (e) {
      const errMsg = { role: 'assistant', content: `Error: ${e.message}`, at: new Date().toISOString() }
      const updated = [...next, errMsg]
      setMessages(updated)
      saveChat(updated)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Context-aware career assistant. Uses your profile, intelligence, jobs, and applications.
      </p>

      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => send(p)}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            {p}
          </button>
        ))}
      </div>

      <Card className="!p-0">
        <div className="flex h-[420px] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-stone-500">Ask anything about your career pipeline.</p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${m.at}-${i}`}
                className={`rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'ml-8 bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-100'
                    : 'mr-8 bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.actions?.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs opacity-80">
                    {m.actions.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {loading && (
              <p className="flex items-center gap-2 text-sm text-stone-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </p>
            )}
          </div>
          <div className="flex gap-2 border-t border-stone-200 p-3 dark:border-stone-800">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask your career copilot…"
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
            />
            <Button onClick={() => send()} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>

      <p className="flex items-center gap-1 text-xs text-stone-500">
        <Sparkles className="h-3 w-3" />
        Configure provider in Settings. Mock provider works offline.
      </p>
    </div>
  )
}
