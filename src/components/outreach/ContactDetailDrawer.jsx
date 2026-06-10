import { useState } from 'react'
import { X } from 'lucide-react'
import Button from '../ui/Button'
import OutreachComposer from './OutreachComposer'
import OutreachActivityTimeline from './OutreachActivityTimeline'
import { getSuggestedFollowUpDate } from '../../modules/outreach/followUpEngine'
import { markMessageSentOnJob, markRepliedOnJob } from '../../modules/outreach/outreachAi'
import { addOutreachActivity } from '../../modules/outreach/outreachStorage'

export default function ContactDetailDrawer({
  contact,
  job,
  onClose,
  onJobUpdated,
  onScheduleFollowUp,
}) {
  const [note, setNote] = useState('')

  if (!contact || !job) return null

  const outreach = job.outreach || {}
  const messages = (outreach.messages || []).filter((m) => m.contactId === contact.id)
  const lastDraft = messages.filter((m) => m.status === 'draft').pop()

  const handleMarkSent = () => {
    const msgId = lastDraft?.id || messages[messages.length - 1]?.id
    if (!msgId) return
    onJobUpdated?.(markMessageSentOnJob(job, msgId))
  }

  const handleMarkReplied = () => {
    onJobUpdated?.(markRepliedOnJob(job))
  }

  const handleScheduleFollowUp = () => {
    const date = getSuggestedFollowUpDate()
    onScheduleFollowUp?.(job.jobId, date)
    const nextOutreach = addOutreachActivity(
      outreach,
      'follow_up_sent',
      `Follow-up scheduled for ${date}`,
    )
    onJobUpdated?.({ ...job, outreach: nextOutreach })
  }

  const handleAddNote = () => {
    if (!note.trim()) return
    const nextOutreach = addOutreachActivity(outreach, 'note_added', note.trim())
    onJobUpdated?.({ ...job, outreach: nextOutreach })
    setNote('')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl dark:bg-stone-950">
        <div className="sticky top-0 flex items-start justify-between border-b border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
          <div>
            <h2 className="font-display text-lg font-semibold">{contact.name}</h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {contact.title} · {contact.company || job.company}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100 dark:hover:bg-stone-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-4">
          <OutreachComposer job={job} contact={contact} onJobUpdated={onJobUpdated} compact />

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleMarkSent}>Mark sent</Button>
            <Button variant="secondary" onClick={handleMarkReplied}>Mark replied</Button>
            <Button variant="ghost" onClick={handleScheduleFollowUp}>Schedule follow-up</Button>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Add note</h4>
            <textarea
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button className="mt-2" variant="ghost" onClick={handleAddNote}>Save note</Button>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Activity</h4>
            <OutreachActivityTimeline activity={outreach.activity} />
          </div>
        </div>
      </aside>
    </div>
  )
}
