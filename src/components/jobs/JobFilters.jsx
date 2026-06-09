import Card from '../ui/Card'
import Input from '../ui/Input'
import SelectField from '../ui/SelectField'
import { JOB_STATUSES } from '../../modules/jobs/jobStorage'
import { MATCH_LABELS, PRIORITIES, hasMatchScores } from '../../modules/jobs/matchScore'

export default function JobFilters({ filters, sites, providers, jobs, onChange }) {
  const showScoreFilters = hasMatchScores(jobs)
  return (
    <Card title="Filters" className="!p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Input
          label="Search"
          value={filters.searchText}
          onChange={(e) => onChange({ searchText: e.target.value })}
          placeholder="Title, company, description…"
        />
        <Input
          label="Location"
          value={filters.location}
          onChange={(e) => onChange({ location: e.target.value })}
          placeholder="Filter by location"
        />
        <SelectField
          label="Site"
          value={filters.site}
          onChange={(v) => onChange({ site: v })}
          options={sites}
          placeholder="All sites"
        />
        <SelectField
          label="Provider"
          value={filters.provider}
          onChange={(v) => onChange({ provider: v })}
          options={providers}
          placeholder="All providers"
        />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(v) => onChange({ status: v })}
          options={JOB_STATUSES}
          placeholder="All statuses"
        />
        {showScoreFilters && (
          <>
            <Input
              label="Min score"
              type="number"
              min={0}
              max={100}
              value={filters.minScore}
              onChange={(e) => onChange({ minScore: e.target.value })}
              placeholder="e.g. 55"
            />
            <SelectField
              label="Match label"
              value={filters.matchLabel}
              onChange={(v) => onChange({ matchLabel: v })}
              options={MATCH_LABELS}
              placeholder="All labels"
            />
            <SelectField
              label="Priority"
              value={filters.priority}
              onChange={(v) => onChange({ priority: v })}
              options={PRIORITIES.filter((p) => p !== 'Reject')}
              placeholder="All priorities"
            />
          </>
        )}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
        <input
          type="checkbox"
          checked={filters.remoteOnly}
          onChange={(e) => onChange({ remoteOnly: e.target.checked })}
          className="rounded border-stone-300 text-teal-600 focus:ring-teal-500"
        />
        Remote only
      </label>
    </Card>
  )
}
