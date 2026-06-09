import { useCallback, useEffect, useRef, useState } from 'react'
import { Briefcase, Download, Loader2, MoreHorizontal, RefreshCw } from 'lucide-react'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import IntelligenceTabs from './IntelligenceTabs'
import IntelligenceEmptyState from './IntelligenceEmptyState'
import IntelligenceSummaryCard from './IntelligenceSummaryCard'
import RoleStrategyCard from './RoleStrategyCard'
import SkillsMapCard from './SkillsMapCard'
import AtsKeywordsCard from './AtsKeywordsCard'
import SearchStrategyCard from './SearchStrategyCard'
import { useProfile } from '../../context/ProfileContext'
import { generateCandidateIntelligence } from '../../modules/intelligence/candidateIntelligenceEngine'
import { validateProfileForIntelligence } from '../../modules/intelligence/intelligenceValidators'
import {
  downloadCandidateIntelligence,
  loadIntelligence,
  saveIntelligence,
} from '../../modules/intelligence/intelligenceExport'
import { saveIntelligenceToDataDir } from '../../modules/jobs/intelligenceSync'
import { VIEWS } from '../../modules/appNavigation'
import { isApiAvailable } from '../../utils/apiAvailability'

export default function CandidateIntelligenceScreen({ onNavigate }) {
  const { profile } = useProfile()
  const [intelligence, setIntelligence] = useState(() => loadIntelligence())
  const [activeTab, setActiveTab] = useState('summary')
  const [validation, setValidation] = useState(null)
  const [diskSyncNote, setDiskSyncNote] = useState(null)
  const [loading, setLoading] = useState(() => !loadIntelligence())
  const [menuOpen, setMenuOpen] = useState(false)
  const initialSyncDone = useRef(false)

  const syncToDisk = useCallback(async (data) => {
    const result = await saveIntelligenceToDataDir(data)
    if (result.ok) setDiskSyncNote('Intelligence synced to disk')
    return result
  }, [])

  const runGeneration = useCallback(async () => {
    const v = validateProfileForIntelligence(profile)
    setValidation(v)
    if (!v.valid) return null
    setLoading(true)
    try {
      const generated = generateCandidateIntelligence(profile)
      saveIntelligence(generated)
      setIntelligence(generated)
      await syncToDisk(generated)
      return generated
    } finally {
      setLoading(false)
    }
  }, [profile, syncToDisk])

  useEffect(() => {
    const v = validateProfileForIntelligence(profile)
    setValidation(v)
    if (!v.valid) {
      const cached = loadIntelligence()
      if (cached) {
        setIntelligence(cached)
        setLoading(false)
        return
      }
      setIntelligence(null)
      setLoading(false)
      return
    }
    const cached = loadIntelligence()
    if (cached) {
      setIntelligence(cached)
      setLoading(false)
      if (!initialSyncDone.current) {
        initialSyncDone.current = true
        void syncToDisk(cached)
      }
      return
    }
    runGeneration()
  }, [profile, runGeneration, syncToDisk])

  const handleRegenerate = async () => {
    await runGeneration()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExport = async () => {
    if (intelligence) {
      const result = await downloadCandidateIntelligence(intelligence)
      if (result?.ok) setDiskSyncNote('Intelligence synced to disk')
    }
    setMenuOpen(false)
  }

  const renderTab = () => {
    if (!intelligence) return null
    switch (activeTab) {
      case 'summary': return <IntelligenceSummaryCard intelligence={intelligence} />
      case 'roles': return <RoleStrategyCard intelligence={intelligence} />
      case 'skills': return <SkillsMapCard intelligence={intelligence} />
      case 'ats': return <AtsKeywordsCard intelligence={intelligence} />
      case 'search': return <SearchStrategyCard intelligence={intelligence} />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      {!validation?.valid ? (
        <div className="space-y-4">
          {validation?.errors?.length > 0 && (
            <Alert variant="error" title="Profile incomplete">
              <ul className="list-inside list-disc text-sm">
                {validation.errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </Alert>
          )}
          <IntelligenceEmptyState
            onBack={onNavigate ? () => onNavigate(VIEWS.PROFILE) : undefined}
            showCompleteCta
            message="Your profile is incomplete. Finish your profile to generate candidate intelligence."
          />
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-500">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm">Generating candidate intelligence…</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {validation.warnings?.length > 0 && (
            <Alert variant="info" title="Suggestions">
              <ul className="list-inside list-disc text-sm">
                {validation.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </Alert>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Generated {intelligence?.meta?.generatedAt
                  ? new Date(intelligence.meta.generatedAt).toLocaleString()
                  : '—'}
              </p>
              {diskSyncNote && isApiAvailable() && (
                <p className="text-xs text-teal-700 dark:text-teal-300">{diskSyncNote}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onNavigate?.(VIEWS.JOBS)} disabled={!intelligence}>
                <Briefcase className="h-4 w-4" />
                Discover Jobs
              </Button>
              <div className="relative">
                <Button variant="secondary" onClick={() => setMenuOpen(!menuOpen)}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                    <button type="button" onClick={handleRegenerate} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-800">
                      <RefreshCw className="h-4 w-4" /> Regenerate
                    </button>
                    <button type="button" onClick={handleExport} disabled={!intelligence} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50">
                      <Download className="h-4 w-4" /> Export JSON
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <IntelligenceTabs active={activeTab} onChange={setActiveTab} />
          {renderTab()}
        </div>
      )}
    </div>
  )
}
