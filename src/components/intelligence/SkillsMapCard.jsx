import Card from '../ui/Card'

const BUCKET_LABELS = {
  technicalSkills: 'Technical skills',
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
  cloudDevOps: 'Cloud & DevOps',
  aiAutomation: 'AI & Automation',
  productBusiness: 'Product & Business',
  leadership: 'Leadership',
  softSkills: 'Soft skills',
}

export default function SkillsMapCard({ intelligence }) {
  const map = intelligence.skillsMap
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Object.entries(BUCKET_LABELS).map(([key, label]) => {
        const skills = map[key] || []
        if (!skills.length) return null
        return (
          <Card key={key} title={label} className="!p-4">
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span key={skill} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  {skill}
                </span>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
