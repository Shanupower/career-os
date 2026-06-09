export function getJobProvider(job) {
  return job.provider || job.site || ''
}

export function filterJobs(jobs, filters = {}) {
  const {
    searchText = '',
    location = '',
    site = '',
    provider = '',
    remoteOnly = false,
    status = '',
    matchLabel = '',
    priority = '',
    minScore = '',
  } = filters

  const q = searchText.trim().toLowerCase()

  return (jobs || []).filter((job) => {
    if (status && job.status !== status) return false
    if (matchLabel && job.matchLabel !== matchLabel) return false
    if (priority && job.priority !== priority) return false
    if (minScore !== '' && minScore != null) {
      const floor = Number(minScore)
      if (!Number.isNaN(floor) && (job.matchScore ?? 0) < floor) return false
    }
    if (remoteOnly && !job.isRemote) return false
    if (site && (job.site || '').toLowerCase() !== site.toLowerCase()) return false
    if (provider && getJobProvider(job).toLowerCase() !== provider.toLowerCase()) return false
    if (location && !(job.location || '').toLowerCase().includes(location.toLowerCase())) return false

    if (q) {
      const haystack = [
        job.title,
        job.company,
        job.location,
        job.site,
        job.provider,
        job.source,
        job.description,
        job.searchTerm,
      ].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })
}

export function getUniqueSites(jobs) {
  return [...new Set((jobs || []).map((j) => j.site).filter(Boolean))].sort()
}

export function getUniqueProviders(jobs) {
  return [...new Set((jobs || []).map((j) => getJobProvider(j)).filter(Boolean))].sort()
}

export function getUniqueLocations(jobs) {
  return [...new Set((jobs || []).map((j) => j.location).filter(Boolean))].sort()
}
