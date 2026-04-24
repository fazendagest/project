import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { CashflowClient } from '@/components/financial/cashflow-client'

export default async function CashflowPage() {
  const farmId = await getFarmId()
  if (!farmId) return null

  return (
    <div>
      <PageHeader title="Fluxo de Caixa" description="Entradas e saídas nos últimos 12 meses" />
      <CashflowClient farmId={farmId} />
    </div>
  )
}
