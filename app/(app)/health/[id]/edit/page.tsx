import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { HealthForm } from '@/components/health/health-form'
import { notFound } from 'next/navigation'

export default async function EditHealthPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: record }, { data: animals }] = await Promise.all([
    supabase.from('health_records').select('*').eq('id', params.id).eq('farm_id', farmId).single(),
    supabase.from('animals').select('id, code, name, species').eq('farm_id', farmId).eq('status', 'ativo').order('code'),
  ])

  if (!record) notFound()

  return (
    <div>
      <PageHeader title="Editar Registro de Saúde" />
      <HealthForm farmId={farmId} animals={animals ?? []} record={record} mode="edit" />
    </div>
  )
}
