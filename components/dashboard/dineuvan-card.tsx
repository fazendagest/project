'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { TodoItem } from '@/lib/dineuvan-todo'

/** Mesma lista de respostas "está certo assim" de "Falta completar" (components/dashboard/pending-tasks.tsx). */
const DISMISSED_KEY = 'fazendagest-pendencias-dispensadas'

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]')
  } catch {
    return []
  }
}

/** "O que só você resolve" (P7; junta "Falta completar" desde a revisão do Tião, item 1): o que só o dono resolve. Cada item sai sozinho quando o dado é lançado. */
export function DineuvanCard({ items, farmId, declaredPeriods }: { items: TodoItem[]; farmId: string; declaredPeriods: string[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<string[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  useEffect(() => setDismissed(readDismissed()), [])
  const visible = items.filter(i => !dismissed.includes(i.key) && (!i.declarationPeriod || !done.includes(i.declarationPeriod)))
  if (visible.length === 0) return null

  function dismiss(key: string) {
    const next = [...dismissed, key]
    setDismissed(next)
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)) } catch { /* sem armazenamento: some só nesta visita */ }
  }

  async function markDeclared(period: string) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('farms')
      .update({ herd_declarations: Array.from(new Set([...declaredPeriods, period])) })
      .eq('id', farmId)
    setSaving(false)
    if (error) return toast.error('Não deu para gravar. Tente de novo.')
    setDone(d => [...d, period])
    router.refresh()
  }

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4" aria-labelledby="dineuvan-titulo">
      <h2 id="dineuvan-titulo" className="font-semibold text-amber-900">O que só você resolve ({visible.length})</h2>
      <p className="text-sm text-amber-900 mt-1">Sem isso, os números da fazenda ficam no achismo. Cada item sai sozinho quando é lançado.</p>
      <ul className="mt-3 space-y-2">
        {visible.map(t => {
          const external = t.href.startsWith('http')
          const button = (
            <Button className="h-11 md:h-9 w-full gap-1">
              {t.action} <ChevronRight className="h-4 w-4" />
            </Button>
          )
          return (
            <li key={t.key} className={t.soft ? 'rounded-lg border border-border bg-background p-3' : 'rounded-lg border border-amber-200 bg-background p-3'}>
              <p className="font-medium">{t.title}</p>
              {t.detail && <p className="text-sm text-muted-foreground mt-0.5">{t.detail}</p>}
              {t.why && (
                <details className="group mt-2 text-sm">
                  <summary className="inline-flex min-h-[44px] md:min-h-0 cursor-pointer list-none items-center gap-1 font-medium text-primary underline underline-offset-2 [&::-webkit-details-marker]:hidden">
                    Por que fazer?
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="mt-2 space-y-2 text-foreground">
                    {t.why.paragraphs.map(p => <p key={p}>{p}</p>)}
                    {t.why.source && <p className="text-xs text-muted-foreground">{t.why.source}</p>}
                  </div>
                </details>
              )}
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                {external ? (
                  <a href={t.href} target="_blank" rel="noopener noreferrer" className="sm:flex-none">{button}</a>
                ) : (
                  <Link href={t.href} className="sm:flex-none">{button}</Link>
                )}
                {t.declarationPeriod && (
                  <Button type="button" variant="outline" className="h-11 md:h-9" disabled={saving} onClick={() => markDeclared(t.declarationPeriod!)}>
                    Já fiz
                  </Button>
                )}
                {t.dismissLabel && (
                  <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => dismiss(t.key)}>
                    {t.dismissLabel}
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
