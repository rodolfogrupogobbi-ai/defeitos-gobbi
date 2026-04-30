export interface TemplateVars {
  client_name: string
  product_name: string
  brand: string
  company: string
  received_at: string
  protocol: string
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace('{client_name}', vars.client_name)
    .replace('{product_name}', vars.product_name)
    .replace('{brand}', vars.brand)
    .replace('{company}', vars.company)
    .replace('{received_at}', vars.received_at)
    .replace('{protocol}', vars.protocol)
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '')
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
}
