import { renderTemplate, buildWhatsAppUrl } from '@/lib/whatsapp'

describe('renderTemplate', () => {
  it('replaces all known placeholders', () => {
    const template = 'Olá, {client_name}! Produto: {product_name}, Marca: {brand}.'
    const result = renderTemplate(template, {
      client_name: 'João',
      product_name: 'Tênis',
      brand: 'Nike',
      company: '',
      received_at: '',
      protocol: '',
    })
    expect(result).toBe('Olá, João! Produto: Tênis, Marca: Nike.')
  })
  it('replaces company, received_at, protocol', () => {
    const template = '{company} em {received_at} - prot {protocol}'
    const result = renderTemplate(template, {
      client_name: '',
      product_name: '',
      brand: '',
      company: 'MPB',
      received_at: '01/05/2026',
      protocol: 'ABC123',
    })
    expect(result).toBe('MPB em 01/05/2026 - prot ABC123')
  })
  it('leaves unknown placeholders untouched', () => {
    const result = renderTemplate('Olá {client_name} {unknown}', {
      client_name: 'Ana',
      product_name: '',
      brand: '',
      company: '',
      received_at: '',
      protocol: '',
    })
    expect(result).toBe('Olá Ana {unknown}')
  })
})

describe('buildWhatsAppUrl', () => {
  it('produces a wa.me URL with encoded message', () => {
    const url = buildWhatsAppUrl('5551999999999', 'Olá!')
    expect(url).toBe('https://wa.me/5551999999999?text=Ol%C3%A1!')
  })
  it('strips non-numeric characters from phone', () => {
    const url = buildWhatsAppUrl('(51) 9 9999-9999', 'teste')
    expect(url).toContain('wa.me/51999999999')
  })
  it('handles phone with country code already stripped', () => {
    const url = buildWhatsAppUrl('51999998888', 'hi')
    expect(url).toContain('wa.me/51999998888')
  })
})
