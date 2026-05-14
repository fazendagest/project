'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyPhone({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center justify-between w-full rounded-xl px-4 py-3 transition-colors"
      style={{
        background: '#FAFAF8',
        border: '1.5px dashed #D9CDB8',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5EFE2' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FAFAF8' }}
    >
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Telefone</span>
        <span className="text-sm font-semibold text-gray-900 tabular-nums">{phone}</span>
      </div>
      {copied ? (
        <div className="flex items-center gap-1 text-[#166534] text-xs font-semibold">
          <Check className="h-3.5 w-3.5 shrink-0" /> Copiado
        </div>
      ) : (
        <span className="text-xs text-gray-400 font-medium">Copiar</span>
      )}
    </button>
  )
}
