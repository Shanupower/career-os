import { useState } from 'react'
import { Check, Copy, Loader2, Sparkles } from 'lucide-react'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import OperationConsole from '../ui/OperationConsole'
import { useOperationLog } from '../../hooks/useOperationLog'
import { MESSAGE_TYPES } from '../../modules/outreach/outreachStorage'
import { generateOutreachMessage } from '../../modules/outreach/outreachAi'

const CHAR_LIMITS = {
  connection_request: 300,
  linkedin_message: 1000,
  inmail: 1000,
  follow_up: 1000,
  thank_you: 1000,
  interview_follow_up: 1000,
}

const TYPE_LABELS = {
  connection_request: 'Connection request',
  linkedin_message: 'LinkedIn message',
  inmail: 'InMail',
  follow_up: 'Follow-up',
  thank_you: 'Thank you',
  interview_follow_up: 'Interview follow-up',
}

export default function OutreachComposer({ job, contact, onJobUpdated, compact = false }) {
  const [messageType, setMessageType] = useState('inmail')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const log = useOperationLog()

  const limit = CHAR_LIMITS[messageType] || 1000
  const overLimit = body.length > limit

  const handleGenerate = async () => {
    setError(null)
    setLoading(true)
    log.start('Drafting outreach message…')
    try {
      const result = await generateOutreachMessage({ job, contact, messageType, onLog: log.append })
      setBody(result.body)
      onJobUpdated?.({
        ...job,
        outreach: result.outreach,
        aiInsights: result.aiInsights,
      })
      log.append('Message ready — review before sending.')
    } catch (e) {
      setError(e.message)
      log.append(`Error: ${e.message}`)
    } finally {
      setLoading(false)
      log.stop()
    }
  }

  const handleCopy = async () => {
    if (!body) return
    await navigator.clipboard.writeText(body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`space-y-3 ${compact ? '' : 'rounded-xl border border-stone-200 p-4 dark:border-stone-800'}`}>
      {!compact && (
        <div>
          <h4 className="text-sm font-medium text-stone-800 dark:text-stone-200">Message composer</h4>
          {contact && (
            <p className="text-xs text-stone-500">
              To: {contact.name}{contact.title ? ` · ${contact.title}` : ''}
            </p>
          )}
        </div>
      )}

      <label className="block text-sm">
        <span className="text-xs text-stone-500">Message type</span>
        <select
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
          value={messageType}
          onChange={(e) => setMessageType(e.target.value)}
        >
          {MESSAGE_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
          ))}
        </select>
      </label>

      {error && <Alert variant="error" title="Error">{error}</Alert>}

      <OperationConsole
        lines={log.lines}
        active={log.active}
        title={loading ? 'Generating message…' : 'Activity log'}
      />

      <div className="flex gap-2">
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate message
        </Button>
        {body && (
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </div>

      <textarea
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
        rows={compact ? 4 : 6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Generate a draft or paste your own message…"
      />
      <p className={`text-xs ${overLimit ? 'text-red-600' : 'text-stone-500'}`}>
        {body.length} / {limit} characters · Copy and send manually via LinkedIn
      </p>
    </div>
  )
}
