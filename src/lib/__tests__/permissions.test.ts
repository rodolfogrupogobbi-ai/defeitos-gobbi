import { canAdvanceToStage5, canAccessDashboard, canManageCatalog } from '@/lib/permissions'

describe('permissions', () => {
  it('admin can advance to stage 5', () => {
    expect(canAdvanceToStage5('admin')).toBe(true)
  })
  it('cashier cannot advance to stage 5', () => {
    expect(canAdvanceToStage5('cashier')).toBe(false)
  })
  it('admin can access dashboard', () => {
    expect(canAccessDashboard('admin')).toBe(true)
  })
  it('cashier cannot access dashboard', () => {
    expect(canAccessDashboard('cashier')).toBe(false)
  })
  it('admin can manage catalog', () => {
    expect(canManageCatalog('admin')).toBe(true)
  })
  it('cashier cannot manage catalog', () => {
    expect(canManageCatalog('cashier')).toBe(false)
  })
})
