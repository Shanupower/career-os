import {
  getAdjacentRoles,
  getStretchRoles,
  expandRoleVariants,
  getAvoidRolesFromWorkAvoid,
} from './roleAdjacencyMap.js'

function dedupe(arr) {
  return [...new Set(arr.filter(Boolean))]
}

export function generateRoleStrategy(ctx) {
  const primary = dedupe(ctx.targetRoles)
  const secondary = []
  for (const role of primary) {
    secondary.push(...getAdjacentRoles(role).slice(0, 5))
  }
  const secondaryDeduped = dedupe(secondary).filter((r) => !primary.includes(r)).slice(0, 10)

  const stretch = getStretchRoles(primary).filter(
    (r) => !primary.includes(r) && !secondaryDeduped.includes(r),
  )

  const avoid = dedupe([
    ...getAvoidRolesFromWorkAvoid(ctx.questionnaire.workToAvoid),
  ])

  const searchRoleVariants = expandRoleVariants([...primary, ...secondaryDeduped])

  return {
    primaryTargetRoles: primary,
    secondaryTargetRoles: secondaryDeduped,
    stretchRoles: stretch.slice(0, 8),
    avoidRoles: avoid,
    searchRoleVariants: searchRoleVariants.slice(0, 20),
  }
}
