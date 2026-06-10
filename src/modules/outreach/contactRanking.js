const TYPE_PRIORITY = {
  recruiter: 100,
  talent_acquisition: 95,
  hiring_manager: 85,
  engineering_manager: 75,
  director: 60,
  vp: 55,
  cto: 50,
  founder: 45,
}

const CONFIDENCE_SCORE = { high: 30, medium: 15, low: 5 }

function scoreContact(contact) {
  const typeScore = TYPE_PRIORITY[contact.contactType] || 40
  const confScore = CONFIDENCE_SCORE[contact.confidence] || 10
  const hasLinkedIn = contact.linkedinUrl ? 10 : 0
  const hasEmail = contact.email ? 5 : 0
  return typeScore + confScore + hasLinkedIn + hasEmail
}

export function rankContacts(contacts = []) {
  const ranked = [...contacts]
    .map((c) => ({ ...c, _score: scoreContact(c) }))
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...c }) => c)

  const primary = ranked[0] || null
  const secondary = ranked[1] || null

  const reasons = []
  if (primary) {
    reasons.push(`Primary: ${primary.name} (${primary.contactType || 'contact'}, confidence: ${primary.confidence || 'medium'})`)
    if (primary.contactType === 'recruiter' || primary.contactType === 'talent_acquisition') {
      reasons.push('Recruiters are typically the best first outreach target')
    }
  }
  if (secondary) {
    reasons.push(`Secondary: ${secondary.name} (${secondary.contactType || 'contact'})`)
  }

  return {
    ranked,
    recommendedPrimaryContact: primary,
    recommendedSecondaryContact: secondary,
    reasons,
  }
}

export function suggestOutreachTiming(job) {
  const applied = job?.applicationTracking?.appliedDate
  if (!applied) {
    return { suggestedDate: null, reason: 'Apply first, then reach out in 2–3 business days' }
  }
  const appliedDate = new Date(applied)
  const suggested = new Date(appliedDate)
  suggested.setDate(suggested.getDate() + 3)
  while (suggested.getDay() === 0 || suggested.getDay() === 6) {
    suggested.setDate(suggested.getDate() + 1)
  }
  return {
    suggestedDate: suggested.toISOString().slice(0, 10),
    reason: '2–3 business days after applying if no reply',
  }
}
