'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ChevronRight } from 'lucide-react'

export type PendingTask = {
  key: string
  title: string
  detail?: string
  href: string
  action: string
  /** Quando a resposta pode ser "está certo assim": botão para dispensar (guardado neste aparelho). */
  dismissLabel?: string
}

const STORAGE_KEY = 'fazendagest-pendencias-dispensadas'

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

/** Lista do que falta completar. Cada item some quando é resolvido (ou dispensado). Decisão de 11/11/2026, opção A. */
export function PendingTasks({ tasks }: { tasks: PendingTask[] }) {
  const [dismissed, setDismissed] = useState<string[]>([])
  useEffect(() => setDismissed(readDismissed()), [])

  const visible = tasks.filter(t => !dismissed.includes(t.key))
  if (visible.length === 0) return null

  function dismiss(key: string) {
    const next = [...dismissed, key]
    setDismissed(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* sem armazenamento: some só nesta visita */ }
  }

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4" aria-labelledby="pendencias-titulo">
      <h2 id="pendencias-titulo" className="flex items-center gap-2 font-semibold text-amber-900">
        <AlertTriangle className="h-5 w-5" /> Falta completar ({visible.length})
      </h2>
      <p className="text-sm text-amber-900 mt-1">Sem isso, os números da fazenda ficam no achismo. Cada item some quando você resolve.</p>
      <ul className="mt-3 space-y-2">
        {visible.map(t => (
          <li key={t.key} className="rounded-lg border border-amber-200 bg-background p-3">
            <p className="font-medium">{t.title}</p>
            {t.detail && <p className="text-sm text-muted-foreground mt-0.5">{t.detail}</p>}
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <Link href={t.href} className="sm:flex-none">
                <Button className="h-11 md:h-9 w-full gap-1">
                  {t.action} <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              {t.dismissLabel && (
                <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => dismiss(t.key)}>
                  {t.dismissLabel}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
