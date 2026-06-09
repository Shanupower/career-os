import Card from '../ui/Card'
import StatCard from '../ui/StatCard'

export default function ApplicationDashboard({ stats }) {
  if (!stats) return null
  return (
    <Card title="Application CRM" className="!p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Applied" value={stats.crmApplied} />
        <StatCard label="Interviewing" value={stats.crmInterviewing} />
        <StatCard label="Offers" value={stats.crmOffers} />
        <StatCard label="Rejected" value={stats.crmRejected} />
        <StatCard label="Follow-ups due" value={stats.crmFollowUpsDue} />
      </div>
    </Card>
  )
}
