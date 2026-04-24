import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { AnimalForm } from '@/components/animals/animal-form'

export default async function NewAnimalPage() {
  const farmId = await getFarmId()
  if (!farmId) return null

  return (
    <div>
      <PageHeader title="Novo Animal" description="Cadastre um novo animal na fazenda" />
      <AnimalForm farmId={farmId} mode="create" />
    </div>
  )
}
