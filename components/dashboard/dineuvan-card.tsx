'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { TodoItem } from '@/lib/dineuvan-todo'

/** "Para ver com o Dineuvan" (P7): o que só o dono resolve. Cada item sai sozinho quando o dado é lançado. */
export function DineuvanCard({ items, farmId, declaredPeriods }: { items: TodoItem[]; farmId: string; declaredPeriods: string[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<string[]>([])
  const visible = items.filter(i => !i.declarationPeriod || !done.includes(i.declarationPeriod))
  if (visible.length === 0) return null

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
      <h2 id="dineuvan-titulo" className="font-semibold text-amber-900">Para ver com o Dineuvan ({visible.length})</h2>
      <p className="text-sm text-amber-900 mt-1">O que só o dono resolve. Cada item sai sozinho quando é lançado.</p>
      <ul className="mt-3 space-y-2">
        {visible.map(t => {
          const external = t.href.startsWith('http')
          const button = (
            <Button className="h-11 md:h-9 w-full gap-1">
              {t.action} <ChevronRight className="h-4 w-4" />
            </Button>
          )
          return (
            <li key={t.key} className="rounded-lg border border-amber-200 bg-background p-3">
              <p className="font-medium">{t.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{t.detail}</p>
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
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
