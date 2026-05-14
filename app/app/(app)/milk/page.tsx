import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { MilkClient } from '@/components/milk/milk-client'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function MilkPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const now = new Date()

  const [{ data: production }, { data: payments }] = await Promise.all([
    supabase.from('milk_production').select('*').eq('farm_id', farmId).order('date', { ascending: false }),
    supabase.from('milk_payments').select('*').eq('farm_id', farmId).order('reference_month', { ascending: false }),
  ])

  return (
    <div>
      <PageHeader title="Leite" description="Controle de produção e pagamentos do laticínio" />
      <MilkClient
        farmId={farmId}
        initialProduction={production ?? []}
        initialPayments={payments ?? []}
        todayStr={format(now, 'yyyy-MM-dd')}
        monthStart={format(startOfMonth(now), 'yyyy-MM-dd')}
        monthEnd={format(endOfMonth(now), 'yyyy-MM-dd')}
        yearStart={format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd')}
        currentMonth={format(now, 'yyyy-MM')}
      />
    </div>
  )
}
