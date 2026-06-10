import { createDiscoveryResult, PROVIDER_IDS } from './baseProvider.js'
import { normalizeContact } from '../outreachStorage.js'

export async function discover({ contact, job }) {
  if (!contact) {
    return createDiscoveryResult([], [], { provider: PROVIDER_IDS.MANUAL })
  }
  const normalized = normalizeContact({ ...contact, source: 'manual' }, job)
  return createDiscoveryResult([normalized], [], { provider: PROVIDER_IDS.MANUAL })
}

export function validateManualContact(data) {
  const errors = []
  if (!data.name?.trim()) errors.push('Name is required')
  if (!data.company?.trim() && !data.title?.trim()) {
    errors.push('Company or title is required')
  }
  return errors
}
