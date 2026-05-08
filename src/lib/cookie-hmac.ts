export async function trustedDeviceCookieValue(userId: string): Promise<string> {
  const secret = process.env.COOKIE_SECRET
  if (!secret) {
    // If secret not configured, fall back to legacy value — add COOKIE_SECRET to env to enable signed cookies
    return '1'
  }
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(userId))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
