import Card from '../ui/Card'

function RoleList({ title, roles, variant }) {
  if (!roles?.length) return null
  const colors = {
    primary: 'bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
    secondary: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    stretch: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
    avoid: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200',
    variants: 'bg-stone-50 text-stone-600 dark:bg-stone-900 dark:text-stone-400',
  }
  return (
    <Card title={title} className="!p-4">
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <span key={role} className={`rounded-md px-2 py-1 text-xs font-medium ${colors[variant]}`}>
            {role}
          </span>
        ))}
      </div>
    </Card>
  )
}

export default function RoleStrategyCard({ intelligence }) {
  const r = intelligence.roleStrategy
  return (
    <div className="space-y-4">
      <RoleList title="Primary target roles" roles={r.primaryTargetRoles} variant="primary" />
      <RoleList title="Secondary target roles" roles={r.secondaryTargetRoles} variant="secondary" />
      <RoleList title="Stretch roles" roles={r.stretchRoles} variant="stretch" />
      <RoleList title="Roles to avoid" roles={r.avoidRoles} variant="avoid" />
      <RoleList title="Search role variants" roles={r.searchRoleVariants} variant="variants" />
    </div>
  )
}
