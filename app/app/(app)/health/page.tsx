import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { HealthClient } from '@/components/health/health-client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function HealthPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: records }, { data: animals }] = await Promise.all([
    supabase
      .from('health_records')
      .select('*, animal:animal_id(code, name, species)')
      .eq('farm_id', farmId)
      .order('application_date', { ascending: false }),
    supabase
      .from('animals')
      .select('id, code, name, species')
      .eq('farm_id', farmId)
      .eq('status', 'ativo')
      .order('code'),
  ])

  return (
    <div>
      <PageHeader
        title="Saúde"
        description="Registros de vacinas, vermifugações e medicamentos"
        actions={
          <Link href="/app/health/new">
            <Button className="h-10 gap-2"><Plus className="h-4 w-4" /> Novo Registro</Button>
          </Link>
        }
      />
      <HealthClient initialRecords={records ?? []} animals={animals ?? []} farmId={farmId} />
    </div>
  )
}
