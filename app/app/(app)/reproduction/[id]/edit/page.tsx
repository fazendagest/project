import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { ReproductionForm } from '@/components/reproduction/reproduction-form'
import { notFound } from 'next/navigation'

export default async function EditReproPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: record }, { data: females }, { data: males }] = await Promise.all([
    supabase.from('reproduction_records').select('*').eq('id', params.id).eq('farm_id', farmId).single(),
    supabase.from('animals').select('id, code, name, species').eq('farm_id', farmId).eq('sex', 'F').eq('status', 'ativo').order('code'),
    supabase.from('animals').select('id, code, name, species').eq('farm_id', farmId).eq('sex', 'M').eq('status', 'ativo').order('code'),
  ])

  if (!record) notFound()

  return (
    <div>
      <PageHeader title="Editar Registro Reprodutivo" />
      <ReproductionForm farmId={farmId} females={females ?? []} males={males ?? []} record={record} mode="edit" />
    </div>
  )
}
