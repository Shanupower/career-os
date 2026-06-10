import { aggregateAllContacts } from './outreachMetrics'

function escapeCsv(val) {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportContactsCsv(jobs) {
  const contacts = aggregateAllContacts(jobs)
  const headers = ['Name', 'Role', 'Company', 'Contact Type', 'Confidence', 'LinkedIn', 'Email', 'Job Title', 'Outreach Status', 'Last Updated']
  const lines = [headers.join(',')]

  for (const c of contacts) {
    lines.push([
      escapeCsv(c.name),
      escapeCsv(c.title),
      escapeCsv(c.company || c.jobCompany),
      escapeCsv(c.contactType),
      escapeCsv(c.confidence),
      escapeCsv(c.linkedinUrl),
      escapeCsv(c.email),
      escapeCsv(c.jobTitle),
      escapeCsv(c.outreachStatus),
      escapeCsv(c.lastUpdated || ''),
    ].join(','))
  }

  return lines.join('\n')
}

export function exportOutreachJson(jobs) {
  const payload = jobs
    .filter((j) => j.outreach && (j.outreach.contacts?.length || j.outreach.messages?.length))
    .map((j) => ({
      jobId: j.jobId,
      title: j.title,
      company: j.company,
      outreach: j.outreach,
    }))
  return JSON.stringify({ exportedAt: new Date().toISOString(), jobs: payload }, null, 2)
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadContactsCsv(jobs) {
  const csv = exportContactsCsv(jobs)
  downloadFile(csv, `outreach-contacts-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')
}

export function downloadOutreachJson(jobs) {
  const json = exportOutreachJson(jobs)
  downloadFile(json, `outreach-export-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
}
