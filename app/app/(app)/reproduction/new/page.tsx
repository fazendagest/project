import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { ReproductionForm } from '@/components/reproduction/reproduction-form'

export default async function NewReproPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: females }, { data: males }] = await Promise.all([
    supabase.from('animals').select('id, code, name, species').eq('farm_id', farmId).eq('sex', 'F').eq('status', 'ativo').order('code'),
    supabase.from('animals').select('id, code, name, species').eq('farm_id', farmId).eq('sex', 'M').eq('status', 'ativo').order('code'),
  ])

  return (
    <div>
      <PageHeader title="Nova Cobertura" description="Registre cobertura ou inseminação" />
      <ReproductionForm farmId={farmId} females={females ?? []} males={males ?? []} mode="create" />
    </div>
  )
}
