import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { PerAnimalClient } from '@/components/financial/per-animal-client'
import { PlantelSummaryTable } from '@/components/financial/plantel-summary-table'
import { buildPlantelRows } from '@/lib/plantel-utils'

export default async function PerAnimalPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data }, { data: activeAnimals }] = await Promise.all([
    supabase.from('animal_costs').select('*').eq('farm_id', farmId).order('entry_date', { ascending: false }),
    supabase.from('animals').select('id, market_value').eq('farm_id', farmId).eq('status', 'ativo'),
  ])

  const activeCosts = (data ?? []).filter(a => a.status === 'ativo')
  const plantelRows = buildPlantelRows(activeCosts, activeAnimals ?? [])

  return (
    <div>
      <PageHeader title="Rentabilidade por Animal" description="Custo, venda e lucro por animal" />
      {plantelRows.length > 0 && (
        <div className="mb-6">
          <PlantelSummaryTable rows={plantelRows} title="Resumo por Espécie" />
        </div>
      )}
      <PerAnimalClient initialData={data ?? []} />
    </div>
  )
}
