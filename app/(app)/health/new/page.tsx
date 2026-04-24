import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { HealthForm } from '@/components/health/health-form'

export default async function NewHealthPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const { data: animals } = await supabase
    .from('animals')
    .select('id, code, name, species')
    .eq('farm_id', farmId)
    .eq('status', 'ativo')
    .order('code')

  return (
    <div>
      <PageHeader title="Novo Registro de Saúde" description="Registre vacinas, vermifugações e medicamentos" />
      <HealthForm farmId={farmId} animals={animals ?? []} mode="create" />
    </div>
  )
}
