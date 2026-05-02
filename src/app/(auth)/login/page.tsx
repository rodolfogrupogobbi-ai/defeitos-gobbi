'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [lockoutCountdown, setLockoutCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function startLockout() {
    const until = Date.now() + LOCKOUT_SECONDS * 1000
    setLockoutUntil(until)
    setLockoutCountdown(LOCKOUT_SECONDS)
    timerRef.current = setInterval(() => {
      const remaining = Math.ceil((until - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval(timerRef.current!)
        setLockoutUntil(null)
        setLockoutCountdown(0)
        setAttempts(0)
      } else {
        setLockoutCountdown(remaining)
      }
    }, 1000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lockoutUntil && Date.now() < lockoutUntil) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= MAX_ATTEMPTS) {
        startLockout()
        setError('')
      } else {
        setError('E-mail ou senha incorretos.')
      }
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/auth/send-otp', { method: 'POST' })
      const data = await res.json()
      if (data.skip) {
        router.push('/kanban')
      } else {
        router.push('/verificar-dispositivo')
      }
    } catch {
      setLoading(false)
      router.push('/verificar-dispositivo')
    }
  }

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 60%, var(--navy-light) 100%)' }}
    >
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="h-1.5" style={{ background: 'var(--orange)' }} />
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--navy)' }}>Grupo Gobbi</h1>
          <p className="text-sm text-gray-500 mb-6">Controle de Defeitos</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLocked}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
                style={{ ['--tw-ring-color' as string]: 'var(--navy)' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLocked}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
                style={{ ['--tw-ring-color' as string]: 'var(--navy)' }}
              />
            </div>
            {isLocked && (
              <p className="text-sm" style={{ color: 'var(--orange-dark)' }}>
                Muitas tentativas. Aguarde {lockoutCountdown} segundos.
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || isLocked}
              className="px-6 py-3 text-white text-base font-semibold rounded-md transition-colors disabled:opacity-50"
              style={{ background: loading || isLocked ? 'var(--orange-dark)' : 'var(--orange)' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
