import { maskPhone } from '@/lib/mask-phone'

describe('maskPhone', () => {
  it('masks an 11-digit mobile number', () => {
    expect(maskPhone('(48) 99999-1234')).toBe('(48) ••••-1234')
  })
  it('masks a 10-digit landline number', () => {
    expect(maskPhone('(48) 3333-5678')).toBe('(48) ••••-5678')
  })
  it('handles digits without formatting', () => {
    expect(maskPhone('48999991234')).toBe('(48) ••••-1234')
  })
  it('handles short numbers with fallback', () => {
    expect(maskPhone('1234')).toBe('••••-1234')
  })
  it('handles very short numbers', () => {
    expect(maskPhone('12')).toBe('••••')
  })
  it('returns masked last 4 for unknown length', () => {
    expect(maskPhone('123456789')).toBe('••••-6789')
  })
})
