'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PhoneReveal } from '@/components/ui/PhoneReveal'
import type { Brand, BrandContact } from '@/types'

type BrandWithContacts = Brand & { contacts: BrandContact[] }

export default function MarcasPage() {
  const [brands, setBrands] = useState<BrandWithContacts[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [contactForms, setContactForms] = useState<Record<string, Partial<BrandContact>>>({})

  async function load() {
    const supabase = createClient()
    const { data: brandsData } = await supabase.from('brands').select('*').order('name')
    const { data: contactsData } = await supabase
      .from('brand_contacts')
      .select('*')
      .order('name')
    const result: BrandWithContacts[] = (brandsData ?? []).map(b => ({
      ...b,
      contacts: (contactsData ?? []).filter(c => c.brand_id === b.id),
    }))
    setBrands(result)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addBrand() {
    if (!newName.trim()) return
    const supabase = createClient()
    await supabase.from('brands').insert({ name: newName.trim() })
    setNewName('')
    load()
  }

  async function toggle(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('brands').update({ active: !active }).eq('id', id)
    load()
  }

  async function addContact(brandId: string) {
    const form = contactForms[brandId] ?? {}
    if (!form.name?.trim()) return
    const supabase = createClient()
    await supabase.from('brand_contacts').insert({
      brand_id: brandId,
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      role: form.role?.trim() || null,
    })
    setContactForms(prev => ({ ...prev, [brandId]: {} }))
    load()
  }

  async function removeContact(contactId: string) {
    const supabase = createClient()
    await supabase.from('brand_contacts').delete().eq('id', contactId)
    load()
  }

  function updateForm(brandId: string, field: keyof BrandContact, value: string) {
    setContactForms(prev => ({
      ...prev,
      [brandId]: { ...(prev[brandId] ?? {}), [field]: value },
    }))
  }

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addBrand()}
          placeholder="Nome da marca"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addBrand}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Adicionar
        </button>
      </div>

      <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200">
        {brands.map(b => (
          <li key={b.id}>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className={`text-sm font-medium ${!b.active ? 'text-gray-400 line-through' : ''}`}>
                {b.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className="text-xs text-blue-600 hover:underline px-2 py-1"
                >
                  {expandedId === b.id ? '▲ Fechar' : `▼ Contatos (${b.contacts.length})`}
                </button>
                <button
                  onClick={() => toggle(b.id, b.active)}
                  className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                >
                  {b.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>

            {expandedId === b.id && (
              <div className="px-4 pb-4 space-y-3 bg-gray-50 border-t border-gray-100">
                {b.contacts.length === 0 ? (
                  <p className="text-xs text-gray-400 pt-3">Nenhum contato cadastrado.</p>
                ) : (
                  <ul className="space-y-2 pt-3">
                    {b.contacts.map(c => (
                      <li key={c.id} className="flex items-start justify-between gap-4 text-sm">
                        <div className="space-y-0.5">
                          <p className="font-medium text-gray-900">{c.name}</p>
                          {c.role && <p className="text-xs text-gray-500">{c.role}</p>}
                          {c.phone && <PhoneReveal phone={c.phone} className="text-xs" />}
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="text-xs text-blue-600 hover:underline block"
                            >
                              {c.email}
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => removeContact(c.id)}
                          className="text-xs text-red-500 hover:text-red-700 shrink-0"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600">Adicionar contato</p>
                  <input
                    value={contactForms[b.id]?.name ?? ''}
                    onChange={e => updateForm(b.id, 'name', e.target.value)}
                    placeholder="Nome *"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={contactForms[b.id]?.role ?? ''}
                      onChange={e => updateForm(b.id, 'role', e.target.value)}
                      placeholder="Cargo"
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      value={contactForms[b.id]?.phone ?? ''}
                      onChange={e => updateForm(b.id, 'phone', e.target.value)}
                      placeholder="Telefone"
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    value={contactForms[b.id]?.email ?? ''}
                    onChange={e => updateForm(b.id, 'email', e.target.value)}
                    placeholder="E-mail"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => addContact(b.id)}
                    disabled={!contactForms[b.id]?.name?.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {brands.length === 0 && (
          <li className="px-4 py-4 text-sm text-gray-400 text-center">Nenhuma marca cadastrada</li>
        )}
      </ul>
    </div>
  )
}
