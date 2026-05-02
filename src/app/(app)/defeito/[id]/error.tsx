'use client'

export default function DefectError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-3">
      <h2 className="text-red-600 font-bold text-lg">Erro ao carregar defeito</h2>
      <pre className="bg-red-50 border border-red-200 p-4 rounded text-xs overflow-auto whitespace-pre-wrap">
        {error.message}
        {error.digest ? `\n\nDigest: ${error.digest}` : ''}
      </pre>
    </div>
  )
}
