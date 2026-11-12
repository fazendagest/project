import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/helpers'
import { daysAgoSP } from '@/lib/today'

/**
 * Aviso de atenção quando a fazenda tem animais ativos e não lançou compra de
 * alimentação (sal, milho, ração) nos últimos 30 dias. Sem esse custo o sistema
 * não sabe quanto o gado custa nem se a venda dá lucro.
 */
export async function MissingCostsAlert({ farmId }: { farmId: string }) {
  const supabase = await createClient()
  const since = daysAgoSP(30)

  const [{ count: activeAnimals }, { data: lastFeed }] = await Promise.all([
    supabase.from('animals').select('id', { count: 'exact', head: true }).eq('farm_id', farmId).eq('status', 'ativo'),
    supabase.from('feed_stock').select('purchase_date').eq('farm_id', farmId)
      .order('purchase_date', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!activeAnimals) return null
  if (lastFeed?.purchase_date && lastFeed.purchase_date >= since) return null

  return (
    <div role="status" className="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-semibold">Faltam os custos do gado</p>
        <p className="text-sm">
          {lastFeed?.purchase_date
            ? <>A última compra de sal, milho ou ração lançada foi em {formatDate(lastFeed.purchase_date)}.</>
            : <>Nenhuma compra de sal, milho ou ração foi lançada até hoje.</>}
          {' '}Sem esses gastos, o sistema não mostra quanto o rebanho custa nem se a venda vai dar lucro.
        </p>
        <Link
          href="/app/feeding"
          className="inline-flex min-h-11 md:min-h-9 items-center rounded-md bg-amber-900 px-4 text-sm font-medium text-white hover:bg-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950"
        >
          Lançar compra de sal ou milho
        </Link>
      </div>
    </div>
  )
}
