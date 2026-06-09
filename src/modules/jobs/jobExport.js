const CSV_COLUMNS = [
  'title',
  'company',
  'location',
  'provider',
  'source',
  'site',
  'isRemote',
  'datePosted',
  'status',
  'jobUrl',
  'salary',
  'employmentType',
  'searchTerm',
  'searchLocation',
]

function escapeCsv(value) {
  const str = String(value ?? '')
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function downloadJobsJson(data, filename = 'discovered_jobs.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function downloadJobsCsv(jobs) {
  const header = CSV_COLUMNS.join(',')
  const rows = (jobs || []).map((job) =>
    CSV_COLUMNS.map((col) => {
      if (col === 'isRemote') return escapeCsv(job.isRemote ? 'true' : 'false')
      return escapeCsv(job[col])
    }).join(','),
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'discovered_jobs.csv'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
