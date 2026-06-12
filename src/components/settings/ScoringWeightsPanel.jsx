import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { loadIntelligence, saveIntelligence } from '../../modules/intelligence/intelligenceExport'
import { saveIntelligenceToDataDir } from '../../modules/jobs/intelligenceSync'
import { runScoring } from '../../modules/jobs/pipelineRunner'

const WEIGHT_KEYS = [
  { key: 'roleMatch', label: 'Role match' },
  { key: 'skillMatch', label: 'Skill match' },
  { key: 'industryMatch', label: 'Industry match' },
  { key: 'experienceMatch', label: 'Experience match' },
  { key: 'locationMatch', label: 'Location match' },
  { key: 'cultureMatch', label: 'Culture match' },
]

const DEFAULT_WEIGHTS = {
  roleMatch: 25,
  skillMatch: 25,
  industryMatch: 15,
  experienceMatch: 15,
  locationMatch: 10,
  cultureMatch: 10,
}

function normalizeWeights(weights) {
  const total = WEIGHT_KEYS.reduce((sum, { key }) => sum + (weights[key] || 0), 0) || 100
  const normalized = {}
  for (const { key } of WEIGHT_KEYS) {
    normalized[key] = Math.round(((weights[key] || 0) / total) * 100)
  }
  const drift = 100 - WEIGHT_KEYS.reduce((sum, { key }) => sum + normalized[key], 0)
  if (drift !== 0) {
    normalized.roleMatch = Math.max(0, normalized.roleMatch + drift)
  }
  return normalized
}

export default function ScoringWeightsPanel() {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [saving, setSaving] = useState(false)
  const [rescoring, setRescoring] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    const intel = loadIntelligence()
    if (intel?.scoringWeights) {
      setWeights({ ...DEFAULT_WEIGHTS, ...intel.scoringWeights })
    }
  }, [])

  const total = WEIGHT_KEYS.reduce((sum, { key }) => sum + (weights[key] || 0), 0)

  const handleSlider = (key, value) => {
    setWeights((prev) => ({ ...prev, [key]: Number(value) }))
    setStatus(null)
  }

  const handleSave = async (andRescore = false) => {
    setError(null)
    setStatus(null)
    setSaving(true)
    try {
      const intel = loadIntelligence()
      if (!intel) throw new Error('Generate candidate intelligence first (Module 2).')
      const normalized = normalizeWeights(weights)
      const next = { ...intel, scoringWeights: normalized }
      saveIntelligence(next)
      const saved = await saveIntelligenceToDataDir(next)
      if (!saved.ok) throw new Error(saved.reason || 'Failed to save intelligence')
      setWeights(normalized)
      setStatus('Scoring weights saved.')
      if (andRescore) {
        setRescoring(true)
        await runScoring()
        setStatus('Weights saved and all jobs re-scored.')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
      setRescoring(false)
    }
  }

  return (
    <Card title="Scoring weights">
      <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
        Adjust how jobs are ranked. Weights are normalized to 100% on save.
        Example: increase Location if you care more about where you work than industry fit.
      </p>
      <div className="space-y-3">
        {WEIGHT_KEYS.map(({ key, label }) => (
          <div key={key}>
            <div className="mb-1 flex justify-between text-xs text-stone-600 dark:text-stone-400">
              <span>{label}</span>
              <span>{weights[key]}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={weights[key]}
              onChange={(e) => handleSlider(key, e.target.value)}
              className="w-full accent-teal-600"
            />
          </div>
        ))}
        <p className="text-xs text-stone-500">Current total: {total}% (normalized to 100% on save)</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => handleSave(false)} disabled={saving || rescoring}>
          {saving && !rescoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save weights
        </Button>
        <Button variant="secondary" onClick={() => handleSave(true)} disabled={saving || rescoring}>
          {rescoring ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save &amp; re-score jobs
        </Button>
        <Button variant="ghost" onClick={() => setWeights(DEFAULT_WEIGHTS)} disabled={saving}>
          Reset defaults
        </Button>
      </div>
      {status && <p className="mt-2 text-xs text-teal-700 dark:text-teal-300">{status}</p>}
      {error && <Alert variant="error" title="Weights error" className="mt-2">{error}</Alert>}
    </Card>
  )
}
