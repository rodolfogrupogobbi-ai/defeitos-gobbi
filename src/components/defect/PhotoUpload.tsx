'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X } from 'lucide-react'

interface PhotoUploadProps {
  defectId: string
  existingUrl: string | null
  onUploaded: (url: string) => void
}

export function PhotoUpload({ defectId, existingUrl, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(existingUrl)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${defectId}.${ext}`
    const { error } = await supabase.storage
      .from('defect-photos')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('defect-photos').getPublicUrl(path)
      setPreview(data.publicUrl)
      onUploaded(data.publicUrl)
    }
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">Foto do produto</label>
      {preview ? (
        <div className="relative w-32 h-32">
          <img src={preview} alt="Foto do defeito" className="w-full h-full object-cover rounded-lg" />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400">
          <Upload size={20} className="text-gray-400" />
          <span className="text-xs text-gray-400 mt-1">
            {uploading ? 'Enviando...' : 'Adicionar foto'}
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
  )
}
