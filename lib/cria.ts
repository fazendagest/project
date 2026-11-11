// P4 do Tião (11/11/2026): índices da cria com a meta da fazenda ao lado.
// Metas e réguas: skill pecuaria-de-corte do Tião, referencias/cria-de-corte.md (seção 3).
// Onde falta dado, o índice diz o que falta lançar, nunca "0%".

import { WEANING_MONTHS } from './herd-alerts'

const DAY = 86_400_000
const MONTH_DAYS = 30.44
const toTime = (iso: string) => new Date(iso + 'T12:00:00').getTime()
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10)
const addMonths = (iso: string, m: number) => toIso(toTime(iso) + m * MONTH_DAYS * DAY)
const monthsBetween = (from: string, to: string) => (toTime(to) - toTime(from)) / DAY / MONTH_DAYS

/** Gestação usada para achar a época da cobertura (cria-de-corte.md: ~290 dias). */
const GESTATION_DAYS = 290
/** Novilha conta como exposta a partir desta idade (Tião, P1). */
const HEIFER_MIN_MONTHS = 20
/** Bezerro vendido nessa faixa de idade: o peso da venda vale como peso na desmama. */
const SALE_AS_WEANING = { min: 6, max: 10 }
/** Peso de desmama fora desta faixa não entra na conta: "peso estranho, confira" (Tião, auditoria do P4). */
export const WEANING_KG_RANGE = { min: 100, max: 350 }
/** Partos com menos que isso de distância são o mesmo parto lançado duas vezes (gêmeos, Reprodução e filho). */
const SAME_CALVING_DAYS = 60

export const CRIA_TARGETS = {
  desmame: { target: 0.8, bad: 0.6, text: '80% em 2028' },
  kg: { target: 135, bad: 100, text: '135 kg em 2028; 160 kg em 2030' },
  prenhez: { target: 0.8, bad: 0.7, text: '80%' },
  mortalidade: { target: 0.03, bad: 0.05, text: 'abaixo de 3%' },
  intervalo: { target: 13, bad: 15, text: '12 a 13 meses' },
} as const

export type CriaAnimal = {
  id: string
  code?: string
  name?: string | null
  species: string
  sex: string
  birth_date?: string | null
  entry_date: string
  entry_type: string
  status: string
  mother_id?: string | null
  death_date?: string | null
  death_cause?: string | null
  weaned_at?: string | null
  weaning_weight_kg?: number | null
}
export type CriaSale = {
  animal_id: string
  sale_date: string
  /** Em @ do comércio; na venda de vários animais, é o peso do LOTE gravado em cada linha. */
  weight_kg?: number | null
  arroba_basis?: string | null
  buyer_name?: string | null
  price_per_kg?: number | null
}

/**
 * A venda de vários animais grava uma linha por animal com o peso do lote inteiro e sem código de lote.
 * O lote é reconhecido pelas linhas com a mesma data, comprador, peso, R$ por @ e tipo de arroba [H: duas vendas
 * separadas iguais no mesmo dia se juntariam, o que é raro].
 */
const lotKey = (s: CriaSale) => [s.sale_date, s.buyer_name ?? '', s.weight_kg ?? '', s.price_per_kg ?? '', s.arroba_basis ?? ''].join('|')

/** Um índice: valor medido ou o que falta lançar para medir. */
export type CriaIndex = {
  value: number | null
  /** Como foi a conta, em palavras ("3 desmamados de 4 vacas expostas"). */
  detail?: string
  /** O que falta lançar quando não dá para medir (ou para medir certo). */
  missing?: string
  /** Pior que a meta da fazenda. */
  belowTarget?: boolean
  /** Conta medida, mas com pouco dado para confiar. */
  caveat?: string
}

export type CriaIndicators = {
  window: { from: string; to: string }
  desmame: CriaIndex
  kg: CriaIndex
  mortalidade: CriaIndex & { missingHeads: number }
  intervalo: CriaIndex
}

const fmtBr = (iso: string) => iso.split('-').reverse().join('/')

export function criaIndicators(animals: CriaAnimal[], sales: CriaSale[], today: string): CriaIndicators {
  const saleOf = new Map(sales.map(s => [s.animal_id, s]))
  const lotSize = new Map<string, number>()
  for (const s of sales) lotSize.set(lotKey(s), (lotSize.get(lotKey(s)) ?? 0) + 1)
  const exitDate = (a: CriaAnimal) => (a.status === 'morto' ? a.death_date ?? null : saleOf.get(a.id)?.sale_date ?? null)
  const bovines = animals.filter(a => a.species === 'bovino')

  // Bezerros nascidos aqui que já chegaram na idade da desmama: os 12 meses de nascimento que terminam há 7 meses.
  const to = addMonths(today, -WEANING_MONTHS)
  const from = addMonths(to, -12)
  const calves = bovines.filter(a => a.entry_type === 'nascimento' && a.birth_date && a.birth_date > from && a.birth_date <= to)
  const lostBeforeWeaning = (a: CriaAnimal) =>
    a.status === 'morto' && (!a.death_date || monthsBetween(a.birth_date!, a.death_date) < WEANING_MONTHS) && !a.weaned_at
  const weaned = calves.filter(a => !lostBeforeWeaning(a))

  // Vacas expostas: fêmeas na fazenda no meio da época de cobertura desses bezerros, vaca ou novilha com 20 meses
  // ou mais; mais as mães desses bezerros (vaca que chegou depois e pariu aqui também foi exposta).
  const coverageMid = toIso(toTime(addMonths(from, 6)) - GESTATION_DAYS * DAY)
  const motherIds = new Set(calves.map(a => a.mother_id).filter(Boolean) as string[])
  const exposed = bovines.filter(a => {
    if (a.sex !== 'F') return false
    if (motherIds.has(a.id)) return true
    if (a.entry_date > coverageMid) return false
    const out = exitDate(a)
    if (out && out < coverageMid) return false
    return !a.birth_date || monthsBetween(a.birth_date, coverageMid) >= HEIFER_MIN_MONTHS
  })
  const period = `nascidos de ${fmtBr(from)} a ${fmtBr(to)}`

  const desmame: CriaIndex = calves.length === 0
    ? { value: null, missing: `Nenhum bezerro nascido aqui de ${fmtBr(from)} a ${fmtBr(to)} está lançado. Lance os nascimentos com a mãe e a data.` }
    : exposed.length === 0
      ? { value: null, missing: 'Nenhuma vaca exposta encontrada: confira a data de entrada e de nascimento das vacas.' }
      : {
          value: weaned.length / exposed.length,
          detail: `${weaned.length} ${weaned.length === 1 ? 'bezerro desmamado' : 'bezerros desmamados'} de ${exposed.length} ${exposed.length === 1 ? 'vaca exposta' : 'vacas expostas'} (${period})`,
        }
  if (desmame.value != null) desmame.belowTarget = desmame.value < CRIA_TARGETS.desmame.target
  // Só as mães desses bezerros na conta: as outras vacas chegaram depois da cobertura (compradas prenhes ou vazias).
  // O número dá 100% e não diz nada da fazenda ainda.
  if (desmame.value != null && exposed.every(a => motherIds.has(a.id))) {
    desmame.caveat = 'Ainda não mede a fazenda: só as mães desses bezerros estavam aqui na época da cobertura. O primeiro número de verdade sai com os bezerros da estação de monta feita aqui.'
  }

  // Kg desmamado por vaca exposta: peso na desmama lançado ou, se foi vendido com 6 a 10 meses, o peso vivo da venda.
  const weaningKg = (a: CriaAnimal) => {
    if (a.weaning_weight_kg) return Number(a.weaning_weight_kg)
    const s = saleOf.get(a.id)
    if (s && s.weight_kg && s.arroba_basis !== 'carcaca' && a.birth_date) {
      const age = monthsBetween(a.birth_date, s.sale_date)
      // Peso da venda em @ do comércio (peso vivo ÷ 30), do lote inteiro: divide pelo número de animais.
      if (age >= SALE_AS_WEANING.min && age <= SALE_AS_WEANING.max) return (Number(s.weight_kg) * 30) / (lotSize.get(lotKey(s)) ?? 1)
    }
    return null
  }
  const strangeKg = (kg: number) => kg < WEANING_KG_RANGE.min || kg > WEANING_KG_RANGE.max
  const noWeight = weaned.filter(a => weaningKg(a) == null)
  const strange = weaned.filter(a => { const k = weaningKg(a); return k != null && strangeKg(k) })
  const nameOf = (a: CriaAnimal) => a.name || a.code || 'bezerro sem nome'
  const kgProblems = [
    noWeight.length > 0 && `Falta o peso na desmama de ${noWeight.length} de ${weaned.length} ${weaned.length === 1 ? 'bezerro' : 'bezerros'}. Lance no cadastro do bezerro (balança ou fita); se vendeu na desmama, o peso da venda já serve.`,
    strange.length > 0 && `Peso estranho, confira: ${strange.map(a => `${nameOf(a)} (${Math.round(weaningKg(a)!)} kg)`).join(', ')}. Na desmama o bezerro fica entre ${WEANING_KG_RANGE.min} e ${WEANING_KG_RANGE.max} kg.`,
  ].filter(Boolean) as string[]
  const kg: CriaIndex = desmame.value == null
    ? { value: null, missing: 'Depende da taxa de desmame (acima).' }
    : kgProblems.length > 0
      ? { value: null, missing: kgProblems.join(' ') }
      : {
          value: weaned.reduce((s, a) => s + (weaningKg(a) ?? 0), 0) / exposed.length,
          detail: `${weaned.length} ${weaned.length === 1 ? 'bezerro' : 'bezerros'} ÷ ${exposed.length} ${exposed.length === 1 ? 'vaca exposta' : 'vacas expostas'}`,
        }
  if (kg.value != null) kg.belowTarget = kg.value < CRIA_TARGETS.kg.target

  // Mortalidade dos bezerros nascidos nos últimos 12 meses; sumiço fica fora e aparece ao lado (Tião, P1).
  const yearAgo = addMonths(today, -12)
  const born = bovines.filter(a => a.entry_type === 'nascimento' && a.birth_date && a.birth_date > yearAgo && a.birth_date <= today)
  const dead = born.filter(a => a.status === 'morto' && a.death_cause !== 'sumiu')
  const missingHeads = born.filter(a => a.status === 'morto' && a.death_cause === 'sumiu').length
  const bornBase = born.length - missingHeads
  const mortalidade: CriaIndicators['mortalidade'] = bornBase <= 0
    ? { value: null, missingHeads, missing: 'Nenhum nascimento lançado nos últimos 12 meses.' }
    : {
        value: dead.length / bornBase,
        missingHeads,
        detail: `${dead.length} ${dead.length === 1 ? 'morte' : 'mortes'} em ${bornBase} ${bornBase === 1 ? 'nascido' : 'nascidos'} nos últimos 12 meses`,
      }
  if (mortalidade.value != null) mortalidade.belowTarget = mortalidade.value >= CRIA_TARGETS.mortalidade.target

  // Intervalo entre partos: partos da mesma vaca pelos filhos cadastrados com a mãe.
  const calvings = new Map<string, string[]>()
  for (const a of animals) {
    if (a.mother_id && a.birth_date) calvings.set(a.mother_id, [...(calvings.get(a.mother_id) ?? []), a.birth_date])
  }
  const intervals: number[] = []
  const cows = new Set<string>()
  for (const [cow, dates] of calvings) {
    const sorted = [...new Set(dates)].sort()
    for (let i = 1; i < sorted.length; i++) {
      const days = (toTime(sorted[i]) - toTime(sorted[i - 1])) / DAY
      if (days < SAME_CALVING_DAYS) continue
      intervals.push(days / MONTH_DAYS)
      cows.add(cow)
    }
  }
  const intervalo: CriaIndex = intervals.length === 0
    ? { value: null, missing: 'Precisa de 2 partos da mesma vaca. Cadastre os filhos com a mãe e a data de nascimento, inclusive os já vendidos.' }
    : {
        value: intervals.reduce((s, m) => s + m, 0) / intervals.length,
        detail: `média de ${intervals.length} ${intervals.length === 1 ? 'intervalo' : 'intervalos'} de ${cows.size} ${cows.size === 1 ? 'vaca' : 'vacas'}`,
      }
  if (intervalo.value != null) intervalo.belowTarget = intervalo.value > CRIA_TARGETS.intervalo.target

  return { window: { from, to }, desmame, kg, mortalidade, intervalo }
}
