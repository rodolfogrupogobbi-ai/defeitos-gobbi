import { daysElapsed, getAlertLevel } from '@/lib/date-utils'

describe('daysElapsed', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(daysElapsed(today)).toBe(0)
  })
  it('returns correct count for a past date', () => {
    const past = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
    expect(daysElapsed(past)).toBe(5)
  })
})

describe('getAlertLevel', () => {
  it('returns null for reimbursed_to_store stage regardless of age', () => {
    expect(getAlertLevel('reimbursed_to_store', '2020-01-01')).toBeNull()
  })
  it('returns null for closed stages (improcedente)', () => {
    expect(getAlertLevel('improcedente', '2020-01-01')).toBeNull()
  })
  it('returns null for closed stages (doacao)', () => {
    expect(getAlertLevel('doacao', '2020-01-01')).toBeNull()
  })
  it('returns null for closed stages (nao_enviado)', () => {
    expect(getAlertLevel('nao_enviado', '2020-01-01')).toBeNull()
  })
  it('returns null when under 15 days', () => {
    const recent = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
    expect(getAlertLevel('received', recent)).toBeNull()
  })
  it('returns yellow at exactly 15 days', () => {
    const d = new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0]
    expect(getAlertLevel('received', d)).toBe('yellow')
  })
  it('returns yellow between 15 and 30 days', () => {
    const d = new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0]
    expect(getAlertLevel('received', d)).toBe('yellow')
  })
  it('returns red over 30 days', () => {
    const d = new Date(Date.now() - 35 * 86400000).toISOString().split('T')[0]
    expect(getAlertLevel('received', d)).toBe('red')
  })
})
