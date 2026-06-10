const TYPE_LABELS = {
  message_generated: 'Message generated',
  message_sent: 'Message sent',
  reply_received: 'Reply received',
  follow_up_sent: 'Follow-up sent',
  note_added: 'Note added',
  contact_added: 'Contact added',
  contacts_discovered: 'Contacts discovered',
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function OutreachActivityTimeline({ activity = [] }) {
  if (!activity.length) {
    return <p className="text-sm text-stone-500">No activity yet.</p>
  }

  return (
    <ol className="space-y-3 border-l-2 border-stone-200 pl-4 dark:border-stone-700">
      {activity.map((item, i) => (
        <li key={`${item.date}-${i}`} className="relative">
          <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-teal-500" />
          <p className="text-xs text-stone-500">{formatDate(item.date)}</p>
          <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
            {TYPE_LABELS[item.type] || item.type}
          </p>
          {item.notes && (
            <p className="text-sm text-stone-600 dark:text-stone-400">{item.notes}</p>
          )}
        </li>
      ))}
    </ol>
  )
}
