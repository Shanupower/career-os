import Card from '../ui/Card'

function KeywordSection({ title, keywords, color }) {
  if (!keywords?.length) return null
  return (
    <Card title={title} className="!p-4">
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw) => (
          <span key={kw} className={`rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
            {kw}
          </span>
        ))}
      </div>
    </Card>
  )
}

export default function AtsKeywordsCard({ intelligence }) {
  const bank = intelligence.atsKeywordBank
  return (
    <div className="space-y-4">
      <KeywordSection
        title="Resume keywords"
        keywords={intelligence.resumeKeywords}
        color="bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
      />
      <KeywordSection
        title="High priority ATS"
        keywords={bank.highPriority}
        color="bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
      />
      <KeywordSection
        title="Medium priority ATS"
        keywords={bank.mediumPriority}
        color="bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
      />
      <KeywordSection
        title="Supporting keywords"
        keywords={bank.supportingKeywords}
        color="bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
      />
    </div>
  )
}
