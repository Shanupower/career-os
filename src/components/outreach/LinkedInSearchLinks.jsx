import { ExternalLink, Search } from 'lucide-react'

export default function LinkedInSearchLinks({ searchQueries = [] }) {
  if (!searchQueries.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        LinkedIn search links
      </p>
      <p className="text-xs text-stone-500">
        Open these manually — no automated scraping or auto-send.
      </p>
      <ul className="space-y-2">
        {searchQueries.map((q) => (
          <li key={q.url}>
            <a
              href={q.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 dark:border-stone-700 dark:text-teal-400 dark:hover:bg-teal-950/30"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1">{q.label}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
