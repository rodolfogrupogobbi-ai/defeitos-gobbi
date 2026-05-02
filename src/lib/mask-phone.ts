export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ••••-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ••••-${digits.slice(6)}`
  }
  if (digits.length >= 4) {
    return `••••-${digits.slice(-4)}`
  }
  return '••••'
}
