'use client'
import { useEffect, useState } from 'react'
import type { Profile, Role } from '@/types'

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('cashier')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadProfiles() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').order('name')
    setProfiles(data ?? [])
  }

  useEffect(() => { loadProfiles() }, [])

  async function createUser() {
    if (!email || !name || !password) {
      setError('Preencha todos os campos')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erro ao criar usuário')
      setLoading(false)
      return
    }
    setSuccess(`Usuário ${name} criado com sucesso!`)
    setEmail('')
    setName('')
    setPassword('')
    setRole('cashier')
    loadProfiles()
    setLoading(false)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Novo usuário</h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Nome</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Perfil</label>
          <select value={role} onChange={e => setRole(e.target.value as Role)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
            <option value="admin">Admin</option>
            <option value="cashier">Caixa</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <button
          onClick={createUser}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Criando...' : 'Criar Usuário'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Usuários cadastrados</h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {profiles.map(p => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                p.role === 'admin'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {p.role === 'admin' ? 'Admin' : 'Caixa'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
