'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificarDispositivoPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [sending, setSending] = useState(true)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [initialSendError, setInitialSendError] = useState(false)

  useEffect(() => {
    fetch('/api/auth/send-otp', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.email) setMaskedEmail(data.email)
        if (data.sendError) setInitialSendError(true)
      })
      .catch(() => setInitialSendError(true))
      .finally(() => setSending(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push('/kanban')
      } else if (data.expired) {
        setCode('')
        setError('Código inválido. Por segurança, o código foi invalidado. Solicite um novo abaixo.')
      } else {
        setError('Código inválido ou expirado. Verifique e tente novamente.')
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setResendSuccess(false)
    setError('')
    setInitialSendError(false)
    try {
      const res = await fetch('/api/auth/send-otp', { method: 'POST' })
      const data = await res.json()
      if (data.email) setMaskedEmail(data.email)
      if (data.rateLimited) {
        setError('Aguarde 90 segundos antes de solicitar um novo código.')
      } else if (data.sendError) {
        setError('Não foi possível enviar o e-mail. Verifique com o administrador.')
      } else {
        setResendSuccess(true)
      }
    } catch {
      setError('Erro ao reenviar. Tente novamente.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Verificar dispositivo</h1>
          {sending ? (
            <p className="text-sm text-gray-500 mt-1">Enviando código de verificação...</p>
          ) : initialSendError ? (
            <p className="text-sm text-red-600 mt-1">
              Não foi possível enviar o e-mail de verificação. Use o botão abaixo para tentar novamente.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              Enviamos um código de 6 dígitos para{' '}
              {maskedEmail ? <strong>{maskedEmail}</strong> : 'seu e-mail'}.
              {' '}Digite-o abaixo.
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            autoFocus
            className="text-center text-2xl font-mono tracking-widest rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>
        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || sending}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {resending ? 'Enviando...' : 'Reenviar código'}
          </button>
          {resendSuccess && (
            <p className="text-xs text-green-600 mt-1">Código reenviado!</p>
          )}
        </div>
      </div>
    </div>
  )
}
