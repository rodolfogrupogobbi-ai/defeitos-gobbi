import type { Role } from '@/types'

export function canAdvanceToStage5(role: Role): boolean {
  return role === 'admin'
}

export function canAccessDashboard(role: Role): boolean {
  return role === 'admin'
}

export function canManageCatalog(role: Role): boolean {
  return role === 'admin'
}
