import { useState } from 'react'
import { Loader2, Search, UserPlus, ShieldAlert } from 'lucide-react'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import ContactCard from './ContactCard'
import ManualContactForm from './ManualContactForm'
import LinkedInSearchLinks from './LinkedInSearchLinks'
import OutreachComposer from './OutreachComposer'
import { rankContacts } from '../../modules/outreach/contactRanking'
import { discoverOutreachContacts } from '../../modules/outreach/outreachClient'
import { mergeDiscoveryIntoOutreach } from '../../modules/outreach/recruiterDiscovery'
import { addOutreachContact } from '../../modules/outreach/outreachStorage'
import { updateJobOutreach } from '../../modules/jobs/jobStorage'

export default function RelatedContactsPanel({ job, onJobUpdated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [deep, setDeep] = useState(false)
  const [acceptTosRisk, setAcceptTosRisk] = useState(false)
  const [tosConfirmText, setTosConfirmText] = useState('')
  const [showDeepConfig, setShowDeepConfig] = useState(false)
  const [liAt, setLiAt] = useState(() => {
    try { return localStorage.getItem('linkedin_li_at') || '' } catch { return '' }
  })
  const [scrapeInfo, setScrapeInfo] = useState(null)

  const outreach = job.outreach || { contacts: [], messages: [], activity: [], status: 'none' }
  const contacts = outreach.contacts || []
  const ranking = rankContacts(contacts)

  const handleDiscover = async () => {
    setError(null)
    setScrapeInfo(null)
    setLoading(true)
    try {
      const discovery = await discoverOutreachContacts(job, {
        deep,
        liAt: deep ? liAt : '',
        acceptTosRisk: deep ? acceptTosRisk : false,
      })
      const nextOutreach = mergeDiscoveryIntoOutreach(outreach, discovery, job)
      onJobUpdated?.({
        ...job,
        outreach: { ...nextOutreach, searchQueries: discovery.searchQueries },
      })
      setScrapeInfo(discovery.metadata?.linkedinScrape || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const persistLiAt = (value) => {
    setLiAt(value)
    try {
      if (value) localStorage.setItem('linkedin_li_at', value)
      else localStorage.removeItem('linkedin_li_at')
    } catch { /* localStorage unavailable */ }
  }

  const handleAddContact = (form) => {
    const nextJobs = updateJobOutreach([job], job.jobId, (o) => addOutreachContact(o, form, job))
    onJobUpdated?.({ ...nextJobs[0] })
    setShowAdd(false)
  }

  return (
    <details className="rounded-xl border border-stone-200 dark:border-stone-800" open={contacts.length > 0}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-200">
        Related Contacts ({contacts.length})
      </summary>
      <div className="space-y-4 border-t border-stone-200 px-4 py-4 dark:border-stone-800">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDiscover} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Find contacts
          </Button>
          <Button variant="secondary" onClick={() => setShowAdd(!showAdd)}>
            <UserPlus className="h-4 w-4" />
            Add manually
          </Button>
          <Button variant="ghost" onClick={() => setShowDeepConfig(!showDeepConfig)}>
            <ShieldAlert className="h-4 w-4" />
            Deep mode
          </Button>
        </div>

        {showDeepConfig && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-700/50 dark:bg-amber-900/20">
            <p className="mb-2 font-medium text-amber-900 dark:text-amber-200">
              LinkedIn deep mode — Terms of Service warning
            </p>
            <p className="mb-2 text-stone-700 dark:text-stone-300">
              Deep mode automates linkedin.com using your session cookie. This may violate
              LinkedIn&apos;s User Agreement and can result in <strong>permanent account suspension</strong>.
              Default search mode does not log into LinkedIn and is strongly recommended.
              See README for details.
            </p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={deep}
                onChange={(e) => {
                  setDeep(e.target.checked)
                  if (!e.target.checked) {
                    setAcceptTosRisk(false)
                    setTosConfirmText('')
                  }
                }}
                className="mt-0.5"
              />
              <span className="text-stone-700 dark:text-stone-300">
                I want to enable deep scrape via my LinkedIn session (<code>li_at</code> cookie).
              </span>
            </label>
            {deep && (
              <div className="mt-3 space-y-2">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={acceptTosRisk}
                    onChange={(e) => setAcceptTosRisk(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-stone-700 dark:text-stone-300">
                    I understand this may violate LinkedIn&apos;s Terms of Service and could ban my account.
                  </span>
                </label>
                <input
                  type="text"
                  value={tosConfirmText}
                  onChange={(e) => setTosConfirmText(e.target.value)}
                  placeholder='Type "I understand" to confirm'
                  className="w-full rounded border border-stone-300 px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-900"
                />
                <input
                  type="password"
                  value={liAt}
                  onChange={(e) => persistLiAt(e.target.value)}
                  placeholder="Paste li_at cookie value"
                  disabled={!acceptTosRisk || tosConfirmText.trim().toLowerCase() !== 'i understand'}
                  className="w-full rounded border border-stone-300 px-2 py-1 font-mono text-xs disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900"
                />
                <p className="text-[11px] text-stone-500">
                  linkedin.com → DevTools → Application → Cookies → copy the <code>li_at</code> value.
                  Stored only in this browser. Falls back to safe search if LinkedIn blocks the session.
                </p>
              </div>
            )}
          </div>
        )}

        {error && <Alert variant="error" title="Discovery error">{error}</Alert>}

        {scrapeInfo && (
          <p className="text-xs text-stone-500">
            LinkedIn {scrapeInfo.mode === 'deep' ? 'deep' : 'search'} scrape:
            {' '}{scrapeInfo.contactsFound} found across {scrapeInfo.queriesRun} queries.
            {scrapeInfo.deepFallback && <> (deep mode hit “{scrapeInfo.deepFallback}”, used safe search instead)</>}
            {scrapeInfo.error && <> — {scrapeInfo.error}</>}
          </p>
        )}

        {ranking.recommendedPrimaryContact && (
          <p className="text-xs text-stone-500">
            Recommended: <strong>{ranking.recommendedPrimaryContact.name}</strong>
            {ranking.recommendedSecondaryContact && (
              <> · Secondary: {ranking.recommendedSecondaryContact.name}</>
            )}
          </p>
        )}

        {showAdd && (
          <ManualContactForm job={job} onSubmit={handleAddContact} onCancel={() => setShowAdd(false)} />
        )}

        <LinkedInSearchLinks searchQueries={outreach.searchQueries} />

        {contacts.length > 0 && (
          <div className="space-y-2">
            {contacts.map((c) => (
              <ContactCard
                key={c.id}
                contact={c}
                job={job}
                onClick={() => setSelectedContact(selectedContact?.id === c.id ? null : c)}
              />
            ))}
          </div>
        )}

        {selectedContact && (
          <OutreachComposer
            job={job}
            contact={selectedContact}
            onJobUpdated={onJobUpdated}
            compact
          />
        )}

        <p className="text-xs text-stone-500">
          Search links open externally. Copy drafts and send manually via LinkedIn Premium.
        </p>
      </div>
    </details>
  )
}
