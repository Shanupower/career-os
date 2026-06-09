import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import Card from '../ui/Card'
import OperationConsole from '../ui/OperationConsole'
import QuestionField from './QuestionField'
import { QUESTIONS, QUESTION_COUNT, QUESTION_SECTIONS } from '../../data/questions'
import { SKILLS_DICTIONARY } from '../../data/skillsDictionary'
import { useProfile } from '../../context/ProfileContext'
import { saveProfileToDataDir } from '../../modules/jobs/profileSync'
import { useOperationLog } from '../../hooks/useOperationLog'
import { ensureApiAvailable } from '../../utils/apiAvailability'

// SKILLS QUESTION IDs
const SKILL_QS = [2, 5]

/** Build the canonical set of skills to pre-select from all sources */
function buildAutoSkills(parsedSkills = [], candidateIntel = null, projectIntel = null) {
  const all = new Set()

  // 1. From resume parsed skills
  for (const s of parsedSkills) if (s) all.add(s)

  // 2. From candidate-intelligence skillsMap
  if (candidateIntel?.skillsMap) {
    for (const arr of Object.values(candidateIntel.skillsMap)) {
      if (Array.isArray(arr)) arr.forEach((s) => s && all.add(s))
    }
  }

  // 3. From project intelligence aggregate techStack
  if (projectIntel?.aggregate?.techStack) {
    for (const s of projectIntel.aggregate.techStack) if (s) all.add(s)
  }
  if (projectIntel?.projects) {
    for (const p of projectIntel.projects) {
      for (const s of (p.techStack || [])) if (s) all.add(s)
    }
  }

  // Keep only skills known in the dictionary (with case-insensitive match)
  const dictLower = new Map(SKILLS_DICTIONARY.map((s) => [s.toLowerCase(), s]))
  const matched = []
  for (const raw of all) {
    const canonical = dictLower.get(raw.toLowerCase())
    if (canonical) matched.push(canonical)
  }
  return [...new Set(matched)]
}

/** Build project entries from repo intelligence for Q4 */
function buildRepoProjects(projectIntel = null) {
  if (!projectIntel?.projects?.length) return []
  return projectIntel.projects
    .filter((p) => p.name)
    .map((p) => {
      const summary = p.summary ? ` — ${p.summary}` : ''
      return `${p.name}${summary}`
    })
}

/** Fetch JSON from the local API, returns null on error */
async function fetchJson(url) {
  if (!(await ensureApiAvailable())) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default function QuestionnaireForm({ questionIndex = 0 }) {
  const { profile, updateProfile } = useProfile()
  const [projectIntel, setProjectIntel] = useState(null)
  const [candidateIntel, setCandidateIntel] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const scanLog = useOperationLog()
  const seeded = useRef(false)

  const hasRepos = (profile.repositories?.githubLinks?.filter(Boolean).length || 0) +
    (profile.repositories?.localRepoPaths?.filter(Boolean).length || 0) > 0

  // Load both intelligence files once on mount
  useEffect(() => {
    Promise.all([
      fetchJson('/api/projects/intelligence'),
      fetchJson('/api/intelligence/candidate'),
    ]).then(([proj, cand]) => {
      if (proj) setProjectIntel(proj)
      if (cand) setCandidateIntel(cand)
    })
  }, [])

  // Auto-seed skill questions once intelligence is loaded
  useEffect(() => {
    if (seeded.current) return
    const parsedSkills = profile.resume?.parsedData?.skills || []
    if (!parsedSkills.length && !candidateIntel && !projectIntel) return

    const autoSkills = buildAutoSkills(parsedSkills, candidateIntel, projectIntel)
    if (!autoSkills.length) return

    let didSeed = false
    updateProfile((prev) => {
      const answers = [...prev.questionnaire.answers]
      for (const qid of SKILL_QS) {
        const idx = answers.findIndex((a) => a.id === qid)
        const current = idx >= 0 ? answers[idx].answer || '' : ''
        // Only seed if there's no real answer yet (empty or a single leftover)
        if (current.split(',').filter(Boolean).length > 1) continue
        const entry = { id: qid, question: `Q${qid}`, answer: autoSkills.join(', ') }
        if (idx >= 0) answers[idx] = entry
        else answers.push(entry)
        didSeed = true
      }
      if (!didSeed) return prev
      answers.sort((a, b) => a.id - b.id)
      return { ...prev, questionnaire: { answers } }
    })
    seeded.current = true
  }, [candidateIntel, projectIntel, profile.resume?.parsedData?.skills, updateProfile])

  const getAnswer = (id) => {
    const found = profile.questionnaire.answers.find((a) => a.id === id)
    return found?.answer || ''
  }

  const setAnswer = (id, question, answer) => {
    updateProfile((prev) => {
      const answers = [...prev.questionnaire.answers]
      const idx = answers.findIndex((a) => a.id === id)
      const entry = { id, question, answer }
      if (idx >= 0) answers[idx] = entry
      else answers.push(entry)
      answers.sort((a, b) => a.id - b.id)
      return { ...prev, questionnaire: { answers } }
    })
  }

  const handleScanRepos = async () => {
    setScanning(true)
    scanLog.start('Saving profile to disk…')
    setScanMsg('')
    await saveProfileToDataDir(profile)
    scanLog.append('Cloning / scanning repos with Claude Code (1–3 min)…')
    try {
      const res = await fetch('/api/projects/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      if (data.stdout) {
        for (const line of data.stdout.split('\n').filter(Boolean)) scanLog.append(line)
      }
      if (data.stderr) {
        for (const line of data.stderr.split('\n').filter(Boolean)) scanLog.append(line)
      }
      if (data.payload) {
        setProjectIntel(data.payload)
        seeded.current = false
        const n = data.payload.projects?.length || 0
        scanLog.append(`Done — ${n} repo(s) analyzed.`)
        setScanMsg(`Scanned ${n} repo(s). Skills and projects updated.`)
      } else {
        setScanMsg(data.stderr || 'Scan completed.')
        scanLog.append(data.stderr || 'Scan finished.')
      }
    } catch (e) {
      setScanMsg(`Error: ${e.message}`)
      scanLog.append(`Error: ${e.message}`)
    } finally {
      setScanning(false)
      scanLog.stop()
    }
  }

  const currentQuestion = QUESTIONS[questionIndex]
  const section = currentQuestion?.section ?? 1
  const sectionMeta = QUESTION_SECTIONS.find((s) => s.id === section)
  const answeredCount = QUESTIONS.filter((q) => isNonEmpty(getAnswer(q.id))).length
  const repoProjects = buildRepoProjects(projectIntel)
  const allParsedSkills = buildAutoSkills(
    profile.resume?.parsedData?.skills || [],
    candidateIntel,
    projectIntel,
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {QUESTION_COUNT} questions in 2 sections. Role, location, remote, and salary were already captured on the Profile step.
        </p>

        {section === 1 && hasRepos && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 dark:border-teal-800 dark:bg-teal-900/20">
            <button
              type="button"
              onClick={handleScanRepos}
              disabled={scanning}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {projectIntel ? 'Re-scan repos' : 'Scan GitHub repos'}
            </button>
            <p className="text-xs text-teal-800 dark:text-teal-300">
              {scanMsg || (projectIntel
                ? `Last scan: ${projectIntel.meta?.scannedAt ? new Date(projectIntel.meta.scannedAt).toLocaleDateString() : 'done'} · ${projectIntel.projects?.length || 0} repo(s)`
                : 'Claude Code will mine your repos for skills, quantifiable metrics, and project summaries.'
              )}
            </p>
            <OperationConsole
              lines={scanLog.lines}
              active={scanLog.active}
              title={scanning ? 'Scanning repos…' : 'Scan log'}
              className="mt-2 w-full"
            />
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-stone-500">
            <span>Question {questionIndex + 1} of {QUESTION_COUNT}</span>
            <span>{answeredCount}/{QUESTION_COUNT} answered</span>
          </div>
          <p className="mb-2 text-xs text-stone-500">
            Section {section} of 2 — {sectionMeta?.title}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-teal-600 transition-all duration-300"
              style={{ width: `${(answeredCount / QUESTION_COUNT) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {currentQuestion && (
        <Card className="!p-4">
          <QuestionField
            question={currentQuestion}
            answer={getAnswer(currentQuestion.id)}
            onChange={(answer) => setAnswer(currentQuestion.id, currentQuestion.text, answer)}
            profile={profile}
            allParsedSkills={allParsedSkills}
            repoProjects={repoProjects}
          />
        </Card>
      )}
    </div>
  )
}

function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
}
