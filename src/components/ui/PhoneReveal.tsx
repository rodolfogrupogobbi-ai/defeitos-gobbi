'use client'
import { useState, useEffect, useRef } from 'react'
import { maskPhone } from '@/lib/mask-phone'

interface Props {
  // Secure mode: phone never in RSC payload — fetched via API after password verify
  fetchUrl?: string
  maskedPhone?: string
  // Legacy mode: phone passed directly (client components that already have it)
  phone?: string | null
  className?: string
}

export function PhoneReveal({ fetchUrl, maskedPhone, phone, className }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function startCountdown() {
    setCountdown(30)
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          setRevealed(false)
          setRevealedPhone(null)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  async function handleConfirm() {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError('Senha incorreta')
        setLoading(false)
        return
      }

      if (fetchUrl) {
        const phoneRes = await fetch(fetchUrl)
        const phoneData = await phoneRes.json()
        setRevealedPhone(phoneData.phone ?? null)
      }

      setRevealed(true)
      setShowModal(false)
      setPassword('')
      startCountdown()
    } catch {
      setError('Erro ao verificar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setShowModal(false)
    setPassword('')
    setError('')
  }

  const displayPhone = revealed
    ? (fetchUrl ? revealedPhone : phone) ?? '—'
    : (maskedPhone ?? maskPhone(phone))

  return (
    <>
      <div className={`flex items-center gap-2 ${className ?? ''}`}>
        <span className="text-sm text-gray-700">{displayPhone}</span>
        {!revealed ? (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            Ver telefone
          </button>
        ) : (
          <span className="text-xs text-gray-400">{countdown}s</span>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-xl">
            <h3 className="font-semibold text-gray-900">Confirmar identidade</h3>
            <p className="text-sm text-gray-600">
              Digite sua senha para visualizar o telefone completo.
            </p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              autoFocus
              placeholder="Sua senha"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || !password}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
