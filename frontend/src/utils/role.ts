export type AuthRole = 'USER' | 'ADMIN' | 'STAFF' | ''

export function extractRole(user: Record<string, unknown> | null): AuthRole {
  if (!user) return ''
  const role = user.role
  if (typeof role !== 'string') return ''
  const normalized = role.toUpperCase()
  if (normalized === 'CLIENT') {
    return 'USER'
  }
  if (normalized === 'USER' || normalized === 'ADMIN' || normalized === 'STAFF') {
    return normalized
  }
  return ''
}

export function isUserRole(user: Record<string, unknown> | null): boolean {
  return extractRole(user) === 'USER'
}
