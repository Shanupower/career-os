import SelectField from '../ui/SelectField'
import MultiSelectField from '../ui/MultiSelectField'
import Textarea from '../ui/Textarea'
import { SKILLS_DICTIONARY } from '../../data/skillsDictionary'

function parseAnswer(answer) {
  if (!answer || typeof answer !== 'string') return []
  return answer.split(',').map((s) => s.trim()).filter(Boolean)
}

function joinAnswer(values) {
  return values.filter(Boolean).join(', ')
}

export default function QuestionField({ question, answer, onChange, profile, allParsedSkills = [], repoProjects = [] }) {
  const label = `${question.id}. ${question.text}`
  // allParsedSkills is the merged set from resume + candidate-intel + project-intel
  // Fall back to resume-only if the parent hasn't computed it yet
  const parsedSkills = allParsedSkills.length
    ? allParsedSkills
    : (profile?.resume?.parsedData?.skills || [])
  const parsedProjects = profile?.resume?.parsedData?.projects || []

  switch (question.type) {
    case 'single':
      return (
        <SelectField
          label={label}
          value={answer || ''}
          onChange={onChange}
          options={question.options}
        />
      )

    case 'multi':
      return (
        <MultiSelectField
          label={label}
          selected={parseAnswer(answer)}
          onChange={(vals) => onChange(joinAnswer(vals))}
          options={question.options}
        />
      )

    case 'skills':
      return (
        <MultiSelectField
          label={label}
          hint="Skills from your resume and repositories are auto-selected. Deselect anything wrong, or add more."
          selected={parseAnswer(answer)}
          onChange={(vals) => onChange(joinAnswer(vals))}
          options={SKILLS_DICTIONARY}
          suggested={parsedSkills}
        />
      )

    case 'projects': {
      // Merge resume projects + repo project names; deduplicate by lowercased prefix
      const merged = [...new Set([
        ...parsedProjects,
        ...repoProjects,
        ...(question.options || []),
      ])]
      return (
        <MultiSelectField
          label={label}
          hint={repoProjects.length
            ? 'Projects from your resume and GitHub repos. Select those you want featured.'
            : 'Select parsed projects from your resume and themes that describe why you\'re proud.'}
          selected={parseAnswer(answer)}
          onChange={(vals) => onChange(joinAnswer(vals))}
          options={merged}
          suggested={[...parsedProjects, ...repoProjects]}
        />
      )
    }

    case 'textarea':
      return (
        <Textarea
          label={label}
          value={answer || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder="Write a short summary in your own words..."
        />
      )

    default:
      return null
  }
}
