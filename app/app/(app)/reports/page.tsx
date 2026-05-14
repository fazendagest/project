import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { ReportsClient } from '@/components/reports/reports-client'

export default async function ReportsPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: animals }, { data: health }, { data: sales }, { data: costs }] = await Promise.all([
    supabase.from('animals').select('*').eq('farm_id', farmId).order('code'),
    supabase.from('health_records').select('*, animal:animal_id(code, name, species)').eq('farm_id', farmId).order('application_date', { ascending: false }),
    supabase.from('animal_costs').select('*').eq('farm_id', farmId),
    supabase.from('animal_costs').select('*').eq('farm_id', farmId),
  ])

  return (
    <div>
      <PageHeader title="Relatórios" description="Inventário, rentabilidade e históricos" />
      <ReportsClient
        animals={animals ?? []}
        healthRecords={health ?? []}
        animalCosts={costs ?? []}
        farmId={farmId}
      />
    </div>
  )
}
