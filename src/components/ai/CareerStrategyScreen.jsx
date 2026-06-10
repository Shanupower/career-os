import { useState } from 'react'
import { Loader2, Sparkles, Target } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { runAiFeature } from '../../modules/ai/aiClient'
import { runSkillGapAnalysis } from '../../modules/ai/features/skillGapEngine'
import { loadAiMemory } from '../../modules/ai/aiMemory'

export default function CareerStrategyScreen() {
  const [strategy, setStrategy] = useState(null)
  const [skillGap, setSkillGap] = useState(null)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState(null)
  const memory = loadAiMemory()

  const runStrategy = async () => {
    setError(null)
    setLoading('strategy')
    try {
      const result = await runAiFeature('careerStrategy')
      setStrategy(result.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading('')
    }
  }

  const runSkillGap = async () => {
    setError(null)
    setLoading('skillGap')
    try {
      const result = await runSkillGapAnalysis()
      setSkillGap(result.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600 dark:text-stone-400">
        AI career advisor based on your profile, scores, and applications. Suggestions only — you decide what to act on.
      </p>

      {error && <Alert variant="error" title="Error">{error}</Alert>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={runStrategy} disabled={Boolean(loading)}>
          {loading === 'strategy' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Career Strategy
        </Button>
        <Button variant="secondary" onClick={runSkillGap} disabled={Boolean(loading)}>
          {loading === 'skillGap' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          Run Skill Gap Analysis
        </Button>
      </div>

      {strategy && (
        <Card title="Career direction">
          <div className="space-y-4 text-sm">
            <p className="text-stone-800 dark:text-stone-200">{strategy.careerDirection}</p>
            {strategy.bestRoleTargets?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Best role targets</p>
                <p className="mt-1">{strategy.bestRoleTargets.join(', ')}</p>
              </div>
            )}
            {strategy.priorityActions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Priority actions</p>
                <ul className="mt-1 list-inside list-disc">
                  {strategy.priorityActions.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </div>
            )}
            {strategy.recommendedCertifications?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Certifications</p>
                <p className="mt-1">{strategy.recommendedCertifications.join(', ')}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {skillGap && (
        <Card title="Skill gap report">
          <div className="space-y-3 text-sm">
            {skillGap.highImpactSkills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">High impact</p>
                <p className="mt-1">{skillGap.highImpactSkills.join(', ')}</p>
              </div>
            )}
            {skillGap.quickWins?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Quick wins</p>
                <p className="mt-1">{skillGap.quickWins.join(', ')}</p>
              </div>
            )}
            {skillGap.longTermSkills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Long term</p>
                <p className="mt-1">{skillGap.longTermSkills.join(', ')}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {(memory.recommendedSkills?.length > 0 || memory.careerGoals?.length > 0) && (
        <Card title="AI memory">
          <div className="text-sm text-stone-600 dark:text-stone-400">
            {memory.careerGoals?.length > 0 && <p>Goals: {memory.careerGoals.join(', ')}</p>}
            {memory.recommendedSkills?.length > 0 && <p className="mt-2">Skills: {memory.recommendedSkills.join(', ')}</p>}
          </div>
        </Card>
      )}
    </div>
  )
}
