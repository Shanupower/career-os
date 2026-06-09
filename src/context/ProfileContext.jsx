import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { loadProfile, saveProfile, clearProfile as clearStorage, getDefaultProfile } from '../utils/storage'
import { extractProfileFromResume } from '../utils/profileExtractor'
import { SKILLS_DICTIONARY } from '../data/skillsDictionary'

// Seed Q2 and Q5 with resume skills so the questionnaire is pre-filled on arrival.
const SKILL_QS = [2, 5]
function seedSkillAnswers(profile, skills) {
  if (!skills?.length) return profile
  const dictLower = new Map(SKILLS_DICTIONARY.map((s) => [s.toLowerCase(), s]))
  const matched = [...new Set(
    skills.map((s) => dictLower.get(s.toLowerCase())).filter(Boolean)
  )]
  if (!matched.length) return profile
  const answers = [...profile.questionnaire.answers]
  for (const qid of SKILL_QS) {
    const idx = answers.findIndex((a) => a.id === qid)
    const current = idx >= 0 ? answers[idx].answer || '' : ''
    if (current.split(',').filter(Boolean).length > 1) continue  // already answered
    const entry = { id: qid, question: `Q${qid}`, answer: matched.join(', ') }
    if (idx >= 0) answers[idx] = entry
    else answers.push(entry)
  }
  answers.sort((a, b) => a.id - b.id)
  return { ...profile, questionnaire: { answers } }
}

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => loadProfile())
  const [currentStep, setCurrentStep] = useState(() => profile.meta?.lastStep ?? 0)

  useEffect(() => {
    const saved = loadProfile()
    setProfile(saved)
    setCurrentStep(saved.meta?.lastStep ?? 0)
  }, [])

  const updateProfile = useCallback((updater) => {
    setProfile((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      return saveProfile(next)
    })
  }, [])

  const setStep = useCallback((step) => {
    setCurrentStep(step)
    setProfile((prev) => saveProfile({ ...prev, meta: { ...prev.meta, lastStep: step } }))
  }, [])

  const applyResumeExtraction = useCallback((rawText) => {
    const extracted = extractProfileFromResume(rawText)
    setProfile((prev) => {
      const githubLinks = [...(prev.repositories?.githubLinks || [])]
      if (extracted.githubUrl && !githubLinks.includes(extracted.githubUrl)) {
        githubLinks.push(extracted.githubUrl)
      }
      let next = {
        ...prev,
        basicProfile: { ...prev.basicProfile, ...extracted.basicProfile },
        resume: {
          ...prev.resume,
          parsedData: { ...prev.resume.parsedData, ...extracted.parsedData },
        },
        repositories: { ...prev.repositories, githubLinks },
        _confidence: { ...prev._confidence, ...extracted.confidence },
      }
      next = seedSkillAnswers(next, extracted.parsedData?.skills || [])
      return saveProfile(next)
    })
    return extracted
  }, [])

  const markFieldEdited = useCallback((fieldKey) => {
    setProfile((prev) => saveProfile({
      ...prev,
      _editedFields: { ...prev._editedFields, [fieldKey]: true },
    }))
  }, [])

  const resetProfile = useCallback(() => {
    clearStorage()
    const fresh = getDefaultProfile()
    setProfile(fresh)
    setCurrentStep(0)
  }, [])

  const markOnboardingComplete = useCallback(() => {
    setProfile((prev) => saveProfile({
      ...prev,
      meta: {
        ...prev.meta,
        onboardingComplete: true,
        completedAt: new Date().toISOString(),
      },
    }))
  }, [])

  const startProfileEdit = useCallback(() => {
    setCurrentStep(1)
    setProfile((prev) => saveProfile({ ...prev, meta: { ...prev.meta, lastStep: 1 } }))
  }, [])

  return (
    <ProfileContext.Provider value={{
      profile,
      currentStep,
      updateProfile,
      setStep,
      applyResumeExtraction,
      markFieldEdited,
      resetProfile,
      markOnboardingComplete,
      startProfileEdit,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
