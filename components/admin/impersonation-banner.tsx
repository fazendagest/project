'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export function ImpersonationBanner({ farmName }: { farmName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleExit() {
    setLoading(true)
    await fetch('/api/admin/exit-impersonate', { method: 'POST' })
    router.push('/admin/farms')
    router.refresh()
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shrink-0">
      <span>
        Visualizando: <strong>{farmName}</strong>
      </span>
      <button
        onClick={handleExit}
        disabled={loading}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-60 px-3 py-1 rounded transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        Sair da visualização
      </button>
    </div>
  )
}
