'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X } from 'lucide-react'
import type { DefectPhoto } from '@/types'

interface Props {
  defectId: string
  photos: DefectPhoto[]
}

const MAX_PHOTOS = 3

export function PhotoUpload({ defectId, photos: initialPhotos }: Props) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [uploading, setUploading] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || photos.length >= MAX_PHOTOS) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${defectId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('defect-photos')
      .upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('defect-photos').getPublicUrl(path)
      const { data: row } = await supabase
        .from('defect_photos')
        .insert({ defect_id: defectId, url: data.publicUrl })
        .select()
        .single()
      if (row) setPhotos(prev => [...prev, row as DefectPhoto])
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleRemove(photo: DefectPhoto) {
    const supabase = createClient()
    await supabase.from('defect_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    try {
      const url = new URL(photo.url)
      const storagePath = url.pathname.split('/defect-photos/')[1]
      if (storagePath) await supabase.storage.from('defect-photos').remove([storagePath])
    } catch {
      // best-effort storage cleanup
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">Fotos</h2>
      <div className="flex flex-wrap gap-2">
        {photos.map(photo => (
          <div key={photo.id} className="relative w-24 h-24">
            <img
              src={photo.url}
              alt="Foto do defeito"
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleRemove(photo)}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400">
            <Upload size={16} className="text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">
              {uploading ? 'Enviando...' : `${photos.length}/${MAX_PHOTOS}`}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>
    </div>
  )
}
