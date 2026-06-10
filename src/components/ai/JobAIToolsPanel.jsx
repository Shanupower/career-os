import { useState } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import Tabs from '../ui/Tabs'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import OperationConsole from '../ui/OperationConsole'
import { useOperationLog } from '../../hooks/useOperationLog'
import { runAiFeature } from '../../modules/ai/aiClient'
import OutreachComposer from '../outreach/OutreachComposer'
import { rankContacts } from '../../modules/outreach/contactRanking'
import { isApiAvailable } from '../../utils/apiAvailability'

const TABS = [
  { id: 'analysis', label: 'Analysis' },
  { id: 'interview', label: 'Interview' },
  { id: 'outreach', label: 'Outreach' },
  { id: 'company', label: 'Company' },
  { id: 'cover', label: 'Cover Letter' },
]

const FEATURE_MAP = {
  analysis: 'jobAnalysis',
  interview: 'interviewPrep',
  outreach: 'outreach',
  company: 'companyIntelligence',
  cover: 'coverLetter',
}

function InsightBlock({ data, fields }) {
  if (!data) return null
  return (
    <div className="space-y-3 text-sm">
      {fields.map(({ key, label, list }) => (
        <div key={key}>
          {label && <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>}
          {list && Array.isArray(data[key]) ? (
            <ul className="mt-1 list-inside list-disc text-stone-700 dark:text-stone-300">
              {data[key].map((item) => <li key={String(item)}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>)}
            </ul>
          ) : (
            <p className="mt-1 text-stone-700 dark:text-stone-300">{data[key] || '—'}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function JobAIToolsPanel({ job, onJobUpdated }) {
  const [tab, setTab] = useState('analysis')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const log = useOperationLog()

  const insights = job.aiInsights || {}

  const persist = (featureKey, data, meta) => {
    const patch = {
      [featureKey]: data,
      provider: meta?.provider,
      model: meta?.model,
      generatedAt: meta?.generatedAt,
    }
    onJobUpdated?.({
      ...job,
      aiInsights: { ...(job.aiInsights || {}), ...patch },
    })
  }

  const run = async (tabId, skipCache = false) => {
    const featureId = FEATURE_MAP[tabId]
    setError(null)
    setLoading(true)
    log.start(`Starting ${featureId}…`)
    try {
      const result = await runAiFeature(featureId, { job, skipCache, onLog: log.append })
      const keyMap = {
        jobAnalysis: 'jobAnalysis',
        interviewPrep: 'interviewPrep',
        outreach: 'outreachDrafts',
        companyIntelligence: 'companyIntelligence',
        coverLetter: 'coverLetter',
      }
      persist(keyMap[featureId], result.data, result.meta)
      log.append('Done.')
    } catch (e) {
      setError(e.message)
      log.append(`Error: ${e.message}`)
    } finally {
      setLoading(false)
      log.stop()
    }
  }

  const renderContent = () => {
    if (tab === 'analysis') {
      return (
        <InsightBlock
          data={insights.jobAnalysis}
          fields={[
            { key: 'fitSummary', label: 'Fit summary' },
            { key: 'strengths', label: 'Strengths', list: true },
            { key: 'concerns', label: 'Concerns', list: true },
            { key: 'missingSkills', label: 'Missing skills', list: true },
            { key: 'recommendedActions', label: 'Actions', list: true },
            { key: 'riskLevel', label: 'Risk' },
          ]}
        />
      )
    }
    if (tab === 'interview') {
      return (
        <InsightBlock
          data={insights.interviewPrep}
          fields={[
            { key: 'cheatSheet', label: 'Cheat sheet' },
            { key: 'technicalQuestions', label: 'Technical', list: true },
            { key: 'behavioralQuestions', label: 'Behavioral', list: true },
            { key: 'revisionTopics', label: 'Revision topics', list: true },
          ]}
        />
      )
    }
    if (tab === 'outreach') {
      const contacts = job.outreach?.contacts || []
      const ranking = rankContacts(contacts)
      const primary = ranking.recommendedPrimaryContact
      return (
        <div className="space-y-4">
          {primary ? (
            <OutreachComposer job={job} contact={primary} onJobUpdated={onJobUpdated} compact />
          ) : (
            <p className="text-sm text-stone-500">
              Add contacts in Related Contacts below, or generate generic drafts.
            </p>
          )}
          {!primary && insights.outreachDrafts && (
            <div className="space-y-3 text-sm">
              {['connectionRequest', 'inMail', 'followUp', 'thankYou'].map((k) => (
                <div key={k}>
                  <p className="text-xs font-semibold uppercase text-stone-500">{k}</p>
                  <p className="mt-1 whitespace-pre-wrap text-stone-700 dark:text-stone-300">{insights.outreachDrafts[k]}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    if (tab === 'company') {
      return (
        <InsightBlock
          data={insights.companyIntelligence}
          fields={[
            { key: 'companySummary', label: 'Summary' },
            { key: 'cultureInsights', label: 'Culture', list: true },
            { key: 'likelyInterviewFocus', label: 'Interview focus', list: true },
            { key: 'risks', label: 'Risks', list: true },
          ]}
        />
      )
    }
    if (tab === 'cover') {
      const d = insights.coverLetter
      if (!d) return null
      return (
        <div className="space-y-3 text-sm">
          {['short', 'standard', 'aggressive'].map((k) => (
            <div key={k}>
              <p className="text-xs font-semibold uppercase text-stone-500">{k}</p>
              <p className="mt-1 whitespace-pre-wrap text-stone-700 dark:text-stone-300">{d[k]}</p>
            </div>
          ))}
          {insights.generatedAt && isApiAvailable() && (
            <a
              href={`/api/resumes/${job.jobId}/ai_cover_letter.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-600"
            >
              Download ai_cover_letter.md
            </a>
          )}
        </div>
      )
    }
    return null
  }

  const labels = {
    analysis: 'Analyze Job with AI',
    interview: 'Generate Interview Prep',
    outreach: 'Draft Outreach Messages',
    company: 'Research Company',
    cover: 'Generate Cover Letters',
  }

  return (
    <details className="rounded-xl border border-stone-200 dark:border-stone-800" open>
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-200">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600" />
          AI Tools
        </span>
      </summary>
      <div className="space-y-4 border-t border-stone-200 px-4 py-4 dark:border-stone-800">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        {error && <Alert variant="error" title="AI error">{error}</Alert>}
        <div className="flex gap-2">
          <Button onClick={() => run(tab)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {labels[tab]}
          </Button>
          <Button variant="ghost" onClick={() => run(tab, true)} disabled={loading} title="Regenerate">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <OperationConsole
          lines={log.lines}
          active={log.active}
          title={loading ? 'AI working…' : 'Activity log'}
        />
        <p className="text-xs text-stone-500">AI suggestions only — verify against your profile. No auto-send.</p>
        {renderContent()}
      </div>
    </details>
  )
}
