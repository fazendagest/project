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
      className="flex items-center justify-between w-full bg-gray-50 hover:bg-gray-100 border rounded-xl px-4 py-3 transition-colors"
    >
      <span className="text-sm font-medium text-gray-700">{phone}</span>
      {copied ? (
        <Check className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <Copy className="h-4 w-4 text-gray-400 shrink-0" />
      )}
    </button>
  )
}
