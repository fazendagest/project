import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { ReproductionClient } from '@/components/reproduction/reproduction-client'
import { ReproductionTabs } from '@/components/reproduction/reproduction-tabs'
import { differenceInMonths, parseISO } from 'date-fns'
import { todaySPDate } from '@/lib/today'

export default async function ReproductionPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: records }, { data: females }, { data: males }, { data: checks }] = await Promise.all([
    supabase
      .from('reproduction_records')
      .select('*, female:female_id(code, name, species), male:male_id(code, name)')
      .eq('farm_id', farmId)
      .order('coverage_date', { ascending: false }),
    supabase
      .from('animals')
      .select('id, code, name, species, birth_date')
      .eq('farm_id', farmId)
      .eq('sex', 'F')
      .eq('status', 'ativo')
      .order('code'),
    supabase
      .from('animals')
      .select('id, code, name, species')
      .eq('farm_id', farmId)
      .eq('sex', 'M')
      .eq('status', 'ativo')
      .order('code'),
    supabase
      .from('pregnancy_checks')
      .select('*, animal:animal_id(code, name)')
      .eq('farm_id', farmId)
      .order('exam_date', { ascending: false }),
  ])

  // Diagnóstico: vacas e novilhas de gado com 1 ano ou mais (sem data de nascimento entra, para não esconder vaca antiga).
  const now = todaySPDate()
  const checkFemales = (females ?? [])
    .filter(f => f.species === 'bovino' && (!f.birth_date || differenceInMonths(now, parseISO(f.birth_date)) >= 12))
    .map(f => ({ id: f.id, code: f.code, name: f.name }))
    .sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code, 'pt-BR'))

  // Coberturas de cada fêmea: o diagnóstico sugere o parto pela que vale para a data do exame.
  const coverages: Record<string, string[]> = {}
  for (const r of records ?? []) (coverages[r.female_id] ??= []).push(r.coverage_date)

  return (
    <div>
      <PageHeader title="Reprodução" description="Diagnóstico de gestação, coberturas e partos" />
      <ReproductionTabs checks={checks ?? []} checkFemales={checkFemales} coverages={coverages} farmId={farmId}>
        <ReproductionClient
          initialRecords={records ?? []}
          females={females ?? []}
          males={males ?? []}
          farmId={farmId}
        />
      </ReproductionTabs>
    </div>
  )
}
