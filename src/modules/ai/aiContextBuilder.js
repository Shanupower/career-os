import { loadProfile } from '../../utils/storage.js'
import { loadIntelligence } from '../intelligence/intelligenceExport.js'
import { loadJobs } from '../jobs/jobStorage.js'
import { computeJobStats } from '../jobs/jobStats.js'
import { loadAiMemory } from './aiMemory.js'

function truncate(str, max = 4000) {
  if (!str) return ''
  return str.length > max ? `${str.slice(0, max)}…` : str
}

function summarizeProfile(profile) {
  const bp = profile?.basicProfile || {}
  return {
    name: bp.fullName,
    email: bp.email,
    currentRole: bp.currentRole,
    targetRoles: bp.targetRoles,
    locations: bp.preferredLocations,
    skills: profile?.resume?.parsedData?.skills?.slice(0, 30),
    experienceYears: bp.experienceYears,
  }
}

function summarizeJob(job) {
  if (!job) return null
  return {
    jobId: job.jobId,
    title: job.title,
    company: job.company,
    location: job.location,
    description: truncate(job.description?.replace(/<[^>]+>/g, ' '), 3000),
    matchScore: job.matchScore,
    matchLabel: job.matchLabel,
    priority: job.priority,
    applyRecommendation: job.applyRecommendation,
    matchedSkills: job.matchedSkills,
    missingSkills: job.missingSkills,
    redFlags: job.redFlags,
    reasons: job.reasons,
    scoreBreakdown: job.scoreBreakdown,
    applicationTracking: job.applicationTracking,
    tailoredAssets: job.tailoredAssets ? { generatedAt: job.tailoredAssets.generatedAt } : null,
    outreach: job.outreach ? {
      status: job.outreach.status,
      contactCount: job.outreach.contacts?.length || 0,
      recentActivity: (job.outreach.activity || []).slice(0, 5),
      recruiterFromCrm: {
        name: job.applicationTracking?.recruiterName,
        email: job.applicationTracking?.recruiterEmail,
        linkedin: job.applicationTracking?.recruiterLinkedIn,
      },
    } : null,
  }
}

export function buildSkillGapContext() {
  const jobs = loadJobs().jobs
    .filter((j) => typeof j.matchScore === 'number')
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 100)

  const skillCounts = {}
  for (const job of jobs) {
    for (const skill of job.missingSkills || []) {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1
    }
  }

  const topMissing = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([skill, count]) => ({ skill, count }))

  return { topMissing, jobCount: jobs.length }
}

export function buildApplicationContext() {
  const jobs = loadJobs().jobs.filter((j) => j.applicationTracking?.applied || j.applicationTracking?.interviewStage)
  return {
    applied: jobs.filter((j) => j.applicationTracking?.applied).map(summarizeJob),
    rejected: jobs.filter((j) => j.applicationTracking?.interviewStage === 'Rejected').map(summarizeJob),
    interviewing: jobs.filter((j) => {
      const s = j.applicationTracking?.interviewStage
      return s && !['Applied', 'Rejected', 'Offer', 'Withdrawn'].includes(s)
    }).map(summarizeJob),
    offers: jobs.filter((j) => j.applicationTracking?.interviewStage === 'Offer').map(summarizeJob),
  }
}

export function buildAiContext({ featureId, job, message, extra } = {}) {
  const profile = loadProfile()
  const intelligence = loadIntelligence()
  const jobState = loadJobs()
  const stats = computeJobStats(jobState.jobs)
  const memory = loadAiMemory()

  const base = {
    profile: summarizeProfile(profile),
    intelligenceSummary: intelligence?.candidateSummary || null,
    roleStrategy: intelligence?.roleStrategy?.primaryRoles?.slice(0, 5) || [],
    jobStats: {
      total: stats.total,
      scored: stats.scored,
      avgScore: stats.avgScore,
      p1: stats.p1,
      crmApplied: stats.crmApplied,
      crmInterviewing: stats.crmInterviewing,
    },
    memory,
    ...extra,
  }

  if (job) base.job = summarizeJob(job)
  if (featureId === 'skillGap') base.skillGap = buildSkillGapContext()
  if (featureId === 'applicationStrategy') base.applications = buildApplicationContext()
  if (featureId === 'careerStrategy') {
    base.topJobs = jobState.jobs
      .filter((j) => typeof j.matchScore === 'number')
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)
      .map(summarizeJob)
    base.applications = buildApplicationContext()
  }
  if (featureId === 'chat') base.message = message
  if (featureId === 'outreach' && extra?.contact) {
    base.contact = {
      name: extra.contact.name,
      title: extra.contact.title,
      company: extra.contact.company,
      contactType: extra.contact.contactType,
    }
    base.messageType = extra.messageType || 'inmail'
    base.outreachRules = [
      'Connection request must be under 300 characters',
      'InMail must be under 1000 characters',
      'Never claim a referral or prior relationship',
      'Never state that the application was already reviewed',
      'Draft only — user sends manually via LinkedIn',
    ]
  }

  return base
}
