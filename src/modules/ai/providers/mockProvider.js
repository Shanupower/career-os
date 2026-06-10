import { BaseProvider } from './baseProvider.js'

const MOCK_RESPONSES = {
  jobAnalysis: {
    fitSummary: 'Strong alignment with target role based on skills and experience in context.',
    strengths: ['Relevant technical stack', 'Matching seniority level', 'Location fit'],
    concerns: ['Some missing skills noted in score'],
    missingSkills: ['Kubernetes'],
    recommendedActions: ['Highlight cloud projects in resume', 'Prepare examples for missing skills'],
    salaryThoughts: 'Within expected range for role and location.',
    riskLevel: 'low',
    confidence: 'medium',
  },
  resumeEnhancement: {
    atsScoreEstimate: '78/100',
    keywordCoverage: 'Good coverage of role keywords from job description',
    missingKeywords: ['CI/CD', 'Terraform'],
    bulletSuggestions: ['Add quantified impact to recent project bullets (from verified profile only)'],
    summarySuggestions: ['Lead with target role and years of experience'],
    improvementPriority: ['Add missing ATS keywords', 'Strengthen summary'],
  },
  coverLetter: {
    short: 'Brief cover letter draft based on your profile and this role.',
    standard: 'Standard cover letter connecting your experience to the role requirements.',
    aggressive: 'Bold pitch emphasizing unique value and readiness to contribute.',
  },
  interviewPrep: {
    technicalQuestions: ['Describe a challenging system you built', 'How do you approach debugging production issues?'],
    behavioralQuestions: ['Tell me about a time you led a project', 'Describe a conflict with a teammate'],
    systemDesignQuestions: ['Design a URL shortener', 'Design a job queue system'],
    starAnswers: ['Prepare STAR stories from verified work experience in profile'],
    companyQuestions: ['What excites you about this company?', 'Questions about team structure'],
    revisionTopics: ['Review missing skills from score', 'Practice system design basics'],
    cheatSheet: 'Key skills to mention: from matched skills in context. Company: review job description.',
  },
  outreach: {
    connectionRequest: 'Hi — I applied for the [role] role and would love to connect.',
    inMail: 'Hello, I recently applied for [role] at [company]. My background in [skills] aligns well…',
    followUp: 'Following up on my application for [role]. Happy to share more about my experience.',
    thankYou: 'Thank you for your time today. I enjoyed learning about the team and role.',
  },
  companyIntelligence: {
    companySummary: 'Company context derived from job description and role requirements.',
    cultureInsights: ['Tech-forward environment suggested by stack', 'Growth-stage signals in posting'],
    likelyInterviewFocus: ['Technical depth', 'Culture fit', 'Role-specific skills'],
    productInsights: ['Infer product domain from job description'],
    risks: ['Verify company details independently'],
  },
  careerStrategy: {
    careerDirection: 'Continue targeting senior engineering roles aligned with your profile.',
    bestRoleTargets: ['Staff Engineer', 'Senior Software Engineer'],
    roleTransitions: ['Deepen cloud/platform skills for staff-level roles'],
    salaryGrowthPlan: ['Target P1 scored roles', 'Negotiate after offer stage'],
    recommendedProjects: ['Open-source contribution in primary stack'],
    recommendedCertifications: ['Cloud certification in your provider of choice'],
    priorityActions: ['Apply to top P1 jobs', 'Close skill gaps from scoring'],
  },
  skillGap: {
    skillGapReport: [{ skill: 'Kubernetes', frequency: 12, priority: 'high' }],
    highImpactSkills: ['Kubernetes', 'Terraform'],
    quickWins: ['Docker', 'CI/CD'],
    longTermSkills: ['System design', 'Staff-level leadership'],
  },
  applicationStrategy: {
    patterns: ['Strong response on P1 roles', 'Lower conversion on stretch roles'],
    resumeIssues: ['Ensure tailored resume highlights role-specific keywords'],
    targetingIssues: ['Focus on roles matching primary target titles'],
    industryInsights: ['Tech hiring active in your target locations'],
    recommendedChanges: ['Prioritize P1 apply recommendations', 'Follow up within 5 days'],
  },
  chat: {
    answer: 'Based on your Career OS data, focus on P1 jobs with highest match scores and close top missing skills.',
    suggestedActions: ['Review Jobs tab filters', 'Run skill gap analysis'],
  },
}

export class MockProvider extends BaseProvider {
  constructor() {
    super('mock')
  }

  async complete({ messages, featureId }) {
    await new Promise((r) => setTimeout(r, 300))
    const data = MOCK_RESPONSES[featureId] || MOCK_RESPONSES.chat
    if (featureId === 'chat') {
      const userMsg = messages?.find((m) => m.role === 'user')?.content || ''
      return {
        text: JSON.stringify({
          answer: `Mock response: ${userMsg.slice(0, 200)}. Configure a real provider in Settings for live AI.`,
          suggestedActions: ['Check Settings → AI', 'Try Ollama locally'],
        }),
        usage: { inputTokens: 100, outputTokens: 80 },
      }
    }
    return {
      text: JSON.stringify(data),
      usage: { inputTokens: 150, outputTokens: 200 },
    }
  }

  async healthCheck() {
    return { online: true }
  }

  async listModels() {
    return ['mock']
  }
}
