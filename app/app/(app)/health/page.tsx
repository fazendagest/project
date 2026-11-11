import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader, MobileActionBar } from '@/components/layout/page-header'
import { HealthClient } from '@/components/health/health-client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { BruceloseCard } from '@/components/health/brucelose-card'
import { bruceloseStatus } from '@/lib/brucelose'
import { todaySP } from '@/lib/fixed-expenses'

export default async function HealthPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: records }, { data: animals }, { data: females }] = await Promise.all([
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
    supabase
      .from('animals')
      .select('id, code, name, species, sex, birth_date, status, entry_type')
      .eq('farm_id', farmId)
      .eq('species', 'bovino')
      .eq('sex', 'F')
      .eq('status', 'ativo'),
  ])
  const brucelose = bruceloseStatus(females ?? [], records ?? [], todaySP())

  return (
    <div className="pb-24 md:pb-0">
      <PageHeader
        title="Saúde"
        description="Registros de vacinas, vermifugações e medicamentos"
        actionsDesktopOnly
        actions={
          <Link href="/app/health/new">
            <Button className="h-10 gap-2"><Plus className="h-4 w-4" /> Novo Registro</Button>
          </Link>
        }
      />
      <BruceloseCard due={brucelose.due} late={brucelose.late} />
      <HealthClient initialRecords={records ?? []} animals={animals ?? []} farmId={farmId} />
      <MobileActionBar>
        <Link href="/app/health/new" className="block">
          <Button className="h-12 w-full gap-2 text-base"><Plus className="h-5 w-5" /> Novo registro</Button>
        </Link>
      </MobileActionBar>
    </div>
  )
}
