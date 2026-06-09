import { QUESTIONS, getQuestionsBySection } from '../data/questions'

export function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function isValidEmail(email) {
  if (!isNonEmpty(email)) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidPhone(phone) {
  if (!isNonEmpty(phone)) return true
  const cleaned = phone.replace(/[\s().-]/g, '')
  return /^(\+91)?[6-9]\d{9}$/.test(cleaned) || /^\+?\d{10,15}$/.test(cleaned)
}

export function isValidUrl(url) {
  if (!isNonEmpty(url)) return false
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch { return false }
}

function validateQuestions(profile, questions) {
  const errors = []
  const answers = profile.questionnaire?.answers || []

  for (const q of questions) {
    const a = answers.find((ans) => ans.id === q.id)
    if (!a || !isNonEmpty(a.answer)) {
      errors.push(`Please answer question ${q.id}: ${q.text.slice(0, 50)}...`)
      break
    }
  }

  return errors
}

export function validateQuestion(profile, questionId) {
  const q = QUESTIONS.find((item) => item.id === questionId)
  if (!q) return { valid: true, errors: [] }
  const errors = validateQuestions(profile, [q])
  return { valid: errors.length === 0, errors }
}

export function validateQuestionnaireSection(sectionId, profile) {
  const sectionQuestions = getQuestionsBySection(sectionId)
  const errors = validateQuestions(profile, sectionQuestions)
  return { valid: errors.length === 0, errors }
}

export function validateStep(stepIndex, profile) {
  const errors = []
  switch (stepIndex) {
    case 0: break
    case 1:
      if (!profile.resume?.fileName) errors.push('Please upload a resume PDF.')
      if (!isNonEmpty(profile.resume?.rawText)) errors.push('Resume text could not be extracted.')
      break
    case 2: {
      const { fullName, email, phone } = profile.basicProfile || {}
      if (!isNonEmpty(fullName)) errors.push('Full name is required.')
      if (!isValidEmail(email)) errors.push('A valid email address is required.')
      if (isNonEmpty(phone) && !isValidPhone(phone)) errors.push('Phone number format is invalid.')
      break
    }
    case 3:
      for (const link of profile.repositories?.githubLinks || []) {
        if (!isValidUrl(link)) errors.push('Invalid GitHub URL: ' + link)
      }
      break
    case 4: {
      const sectionErrors = validateQuestions(profile, QUESTIONS)
      if (sectionErrors.length > 0) {
        errors.push(`Please answer all ${QUESTIONS.length} questions across both sections.`)
      }
      break
    }
    case 5: break
  }
  return { valid: errors.length === 0, errors }
}
