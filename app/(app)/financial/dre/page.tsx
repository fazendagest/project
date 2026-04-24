import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { DREClient } from '@/components/financial/dre-client'

export default async function DREPage() {
  const farmId = await getFarmId()
  if (!farmId) return null

  return (
    <div>
      <PageHeader title="DRE — Demonstrativo de Resultado" description="Análise de receita, custo e lucro por período" />
      <DREClient farmId={farmId} />
    </div>
  )
}
