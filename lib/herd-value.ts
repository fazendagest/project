// Valor do rebanho "se vendesse hoje (estimado)". Decisão de 11/11/2026 (opção A, Henrique):
// por animal ativo vale o valor digitado; sem valor digitado, o preço do IFAG.
// Cavalos são de trabalho e ficam fora da soma. Nunca chamar isto de lucro.
import { animalCategory, ANIMAL_GROUPS } from '@/lib/helpers'
import { marketReference, referenceName, TYPED_ABOVE_LIMIT, type IfagPrices } from '@/lib/market-reference'
import type { Invested } from '@/lib/investment'

export type HerdAnimal = {
  id: string
  species: string
  sex: string
  birth_date?: string | null
  breed?: string | null
  is_breeder?: boolean | null
  is_fat?: boolean | null
  weight_arrobas?: number | null
  market_value?: number | null
  mother_id?: string | null
}

/** 'estimativa' = raça de leite, conta feita a partir da Scot ou do IFAG (sem cotação oficial). */
export type ValueSource = 'digitado' | 'ifag' | 'estimativa' | 'sem_preco'

export type AnimalValue = {
  value: number | null
  source: ValueSource
  /** Referência de mercado (IFAG ou estimativa) para comparar com o digitado. */
  ifag: number | null
  /** Nome curto da referência: "Goiás (IFAG)" ou "Goiás (estimativa)". */
  refName: string | null
  /** Digitado mais de 20% acima da referência (Tião, P6 item 5). */
  farFromMarket: boolean
  /** Data da cotação do IFAG usada. */
  ifagDate: string | null
}

export type HerdGroup = {
  key: string
  label: string
  count: number
  value: number
  invested: number
  /** Fora da soma do rebanho (cavalos de trabalho). */
  excluded: boolean
  missing: number
}

export type HerdValue = {
  total: number
  invested: number
  paperGain: number
  counts: Record<ValueSource, number>
  groups: HerdGroup[]
  ifagDate: string | null
  workHorses: number
  /** Animais com valor digitado mais de 20% acima da referência de Goiás. */
  aboveReference: number
  /** O rebanho pela referência de Goiás onde ela existe (digitado só onde não há referência). */
  totalAtReference: number
}

export function animalValue(a: HerdAnimal, ifag: IfagPrices | null): AnimalValue {
  const ref = marketReference(a, ifag)
  const ifagValue = ref?.perHead ?? null
  const ifagDate = ref?.quotedAt ?? null
  const refName = ref && ifagValue != null ? referenceName(ref) : null
  const typed = a.market_value != null && Number(a.market_value) > 0 ? Number(a.market_value) : null
  if (typed != null) {
    const far = ifagValue != null && ifagValue > 0 && typed > ifagValue * (1 + TYPED_ABOVE_LIMIT)
    return { value: typed, source: 'digitado', ifag: ifagValue, refName, farFromMarket: far, ifagDate }
  }
  if (ifagValue != null) return { value: ifagValue, source: ref?.estimate ? 'estimativa' : 'ifag', ifag: ifagValue, refName, farFromMarket: false, ifagDate }
  return { value: null, source: 'sem_preco', ifag: null, refName: null, farFromMarket: false, ifagDate: null }
}

export function computeHerdValue(
  animals: HerdAnimal[],
  invested: Record<string, Invested>,
  ifag: IfagPrices | null,
): HerdValue {
  const mothers = new Set(animals.map(a => a.mother_id).filter(Boolean) as string[])
  const groups = new Map<string, HerdGroup>()
  const counts: Record<ValueSource, number> = { digitado: 0, ifag: 0, estimativa: 0, sem_preco: 0 }
  let total = 0, inv = 0, workHorses = 0, aboveReference = 0, totalAtReference = 0
  let ifagDate: string | null = null

  for (const a of animals) {
    const cat = animalCategory({ species: a.species as never, sex: a.sex as never, birth_date: a.birth_date ?? undefined, is_breeder: a.is_breeder ?? false }, mothers.has(a.id))
    const g = ANIMAL_GROUPS.find(x => x.match(cat))
    const key = g?.key ?? 'outros'
    const excluded = key === 'cavalos'
    if (!groups.has(key)) groups.set(key, { key, label: g?.label ?? 'Outros', count: 0, value: 0, invested: 0, excluded, missing: 0 })
    const row = groups.get(key)!
    row.count++
    const v = animalValue(a, ifag)
    const animalInvested = invested[a.id]?.total ?? 0
    row.invested += animalInvested
    if (v.value != null) row.value += v.value
    else row.missing++
    if (excluded) { workHorses++; continue }
    counts[v.source]++
    if (v.source === 'ifag' && v.ifagDate && (!ifagDate || v.ifagDate > ifagDate)) ifagDate = v.ifagDate
    if (v.farFromMarket) aboveReference++
    if (v.value != null) {
      total += v.value
      totalAtReference += v.ifag ?? v.value
      inv += animalInvested
    }
  }

  const order = ANIMAL_GROUPS.map(g => g.key)
  return {
    total,
    invested: inv,
    paperGain: total - inv,
    counts,
    groups: [...groups.values()].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)),
    ifagDate,
    workHorses,
    aboveReference,
    totalAtReference,
  }
}
