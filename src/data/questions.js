import {
  COMPANY_TYPES,
  BUSINESS_SKILLS,
  PROJECT_THEMES,
  PROBLEMS_SOLVED,
  ACHIEVEMENTS,
  BEYOND_EXPERIENCE,
  WORK_ENJOY,
  WORK_AVOID,
  INDUSTRIES,
  RECRUITER_PERCEPTION,
  DIFFERENTIATORS,
  LEADERSHIP_EXAMPLES,
  WEAKNESSES_IMPROVING,
} from './questionOptions.js'

export const QUESTION_SECTIONS = [
  {
    id: 1,
    title: 'Skills & experience',
    description: 'Your technical background, projects, and what you have accomplished.',
  },
  {
    id: 2,
    title: 'Preferences & story',
    description: 'Work style, industries, how you want to be seen, and your career summary.',
  },
]

// Role, location, remote, and salary are collected on the Profile step.
export const QUESTIONS = [
  {
    id: 1,
    section: 1,
    text: 'What type of company do you prefer: startup, mid-size, enterprise, or no preference?',
    type: 'single',
    options: COMPANY_TYPES,
  },
  {
    id: 2,
    section: 1,
    text: 'What are your strongest technical skills?',
    type: 'skills',
  },
  {
    id: 3,
    section: 1,
    text: 'What are your strongest business/product skills?',
    type: 'multi',
    options: BUSINESS_SKILLS,
  },
  {
    id: 4,
    section: 1,
    text: 'Which projects are you most proud of and why?',
    type: 'projects',
    options: PROJECT_THEMES,
  },
  {
    id: 5,
    section: 1,
    text: 'What technologies have you used in real-world projects?',
    type: 'skills',
  },
  {
    id: 6,
    section: 1,
    text: 'What kind of problems have you solved in your past work?',
    type: 'multi',
    options: PROBLEMS_SOLVED,
  },
  {
    id: 7,
    section: 1,
    text: 'What are your biggest achievements so far?',
    type: 'multi',
    options: ACHIEVEMENTS,
  },
  {
    id: 8,
    section: 1,
    text: 'What responsibilities have you handled beyond your years of experience?',
    type: 'multi',
    options: BEYOND_EXPERIENCE,
  },
  {
    id: 9,
    section: 2,
    text: 'What kind of work do you enjoy most?',
    type: 'multi',
    options: WORK_ENJOY,
  },
  {
    id: 10,
    section: 2,
    text: 'What kind of work do you want to avoid?',
    type: 'multi',
    options: WORK_AVOID,
  },
  {
    id: 11,
    section: 2,
    text: 'What industries are you interested in?',
    type: 'multi',
    options: INDUSTRIES,
  },
  {
    id: 12,
    section: 2,
    text: 'What industries do you want to avoid?',
    type: 'multi',
    options: INDUSTRIES,
  },
  {
    id: 13,
    section: 2,
    text: 'How do you want recruiters to perceive you?',
    type: 'multi',
    options: RECRUITER_PERCEPTION,
  },
  {
    id: 14,
    section: 2,
    text: 'What makes you different from other candidates?',
    type: 'multi',
    options: DIFFERENTIATORS,
  },
  {
    id: 15,
    section: 2,
    text: 'What are your leadership or ownership examples?',
    type: 'multi',
    options: LEADERSHIP_EXAMPLES,
  },
  {
    id: 16,
    section: 2,
    text: 'What are your weaknesses or areas you are improving?',
    type: 'multi',
    options: WEAKNESSES_IMPROVING,
  },
  {
    id: 17,
    section: 2,
    text: 'Write a short personal career summary in your own words.',
    type: 'textarea',
  },
]

export const QUESTION_COUNT = QUESTIONS.length

export function getQuestionsBySection(sectionId) {
  return QUESTIONS.filter((q) => q.section === sectionId)
}
