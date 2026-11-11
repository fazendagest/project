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
  /** Rótulo curto do caveat ao lado do número (padrão "poucos dados"). */
  caveatTag?: string
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

/**
 * Custo por vaca no ano e por bezerro desmamado (Tião, P8 item 1). Custo do gado em 12 meses: alimentação
 * (sem a dos porcos), despesas da fazenda (sem "Fora dos animais") e saúde dos bovinos, sem compra de animal.
 * Divide pelas vacas e novilhas com 20 meses ou mais na fazenda hoje [Ravi: as vacas expostas da conta do desmame
 * são de uma época mais antiga; hoje só as mães entram, o que inflaria o custo]. Por bezerro = por vaca ÷ desmame.
 */
export type CriaCost = { perCow: CriaIndex; perCalf: CriaIndex; calfPrice: number | null }

export function criaCost(args: {
  feed: number
  expenses: number
  health: number
  cows: number
  desmame: CriaIndex
  calfPrice: number | null
}): CriaCost {
  const { feed, expenses, health, cows, desmame, calfPrice } = args
  const total = feed + expenses + health
  const noCost = feed <= 0 && expenses <= 0
  const missingParts = [feed <= 0 && 'sal e ração', expenses <= 0 && 'despesas da fazenda'].filter(Boolean) as string[]
  const money = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`
  if (noCost) {
    const missing = 'Lance sal, ração e despesas para ver quanto custa cada vaca.'
    return { perCow: { value: null, missing }, perCalf: { value: null, missing: 'Depende do custo por vaca (acima).' }, calfPrice }
  }
  if (cows <= 0) {
    const missing = 'Nenhuma vaca ou novilha com 20 meses ou mais na fazenda: confira as datas de nascimento.'
    return { perCow: { value: null, missing }, perCalf: { value: null, missing: 'Depende do custo por vaca (acima).' }, calfPrice }
  }
  const caveat = missingParts.length > 0 ? `Pode ser maior: falta lançar ${missingParts.join(' e ')}.` : undefined
  const perCow: CriaIndex = {
    value: total / cows,
    detail: `${money(total)} em 12 meses (alimentação ${money(feed)}, despesas ${money(expenses)}, vacina e remédio ${money(health)}) ÷ ${cows} ${cows === 1 ? 'vaca' : 'vacas e novilhas'}`,
    caveat,
    caveatTag: 'estimado',
  }
  let perCalf: CriaIndex
  if (desmame.value == null || desmame.value <= 0) {
    perCalf = { value: null, missing: 'Depende da taxa de desmame (acima).' }
  } else {
    perCalf = {
      value: perCow.value! / desmame.value,
      detail: `custo por vaca ÷ desmame de ${Math.round(desmame.value * 100)}%`,
      caveat: [caveat, desmame.caveat && 'A taxa de desmame ainda tem poucos dados.'].filter(Boolean).join(' ') || undefined,
      caveatTag: desmame.caveat ? 'poucos dados' : 'estimado',
    }
    if (calfPrice != null) perCalf.belowTarget = perCalf.value! > calfPrice
  }
  return { perCow, perCalf, calfPrice }
}

/**
 * Idade ao primeiro parto (Tião, P8 item 2): média em meses das vacas com data de nascimento e primeiro parto
 * conhecido (filho cadastrado com a mãe ou parto lançado em Reprodução). Meta 36 meses agora, 30 em 2030;
 * Nelore no Brasil fica entre 39 e 45 meses (Embrapa). Parto antes de 15 meses de idade é erro de data e sai da conta.
 * Junto, a lista das novilhas com 24 meses ou mais sem parto, sem cobertura e sem diagnóstico.
 * Só entra a fêmea que nasceu aqui ou chegou com menos de 24 meses [Ravi]: a vaca comprada adulta já pode ter
 * parido antes, e o primeiro parto dela aqui não é o primeiro da vida (dava 88 meses de média nos dados de hoje).
 */
export const FIRST_CALVING_TARGET = { target: 36, text: '36 meses agora; 30 em 2030' }
const FIRST_CALVING_MIN_MONTHS = 15
const OPEN_HEIFER_MONTHS = 24

export type OpenHeifer = { id: string; label: string; months: number }

export function firstCalving(args: {
  animals: (CriaAnimal & { is_fat?: boolean | null })[]
  calvings: Map<string, string[]>
  calved: Set<string>
  covered: Set<string>
  checked: Set<string>
  today: string
}): { index: CriaIndex; openHeifers: OpenHeifer[] } {
  const { animals, calvings, calved, covered, checked, today } = args
  const cameYoung = (a: CriaAnimal) =>
    a.entry_type === 'nascimento' || (!!a.birth_date && monthsBetween(a.birth_date, a.entry_date) < OPEN_HEIFER_MONTHS)
  const ages: number[] = []
  let strange = 0
  for (const a of animals) {
    if (a.species !== 'bovino' || a.sex !== 'F' || !a.birth_date || !cameYoung(a)) continue
    const first = (calvings.get(a.id) ?? []).filter(Boolean).sort()[0]
    if (!first) continue
    const m = monthsBetween(a.birth_date, first)
    if (m < FIRST_CALVING_MIN_MONTHS) { strange++; continue }
    ages.push(m)
  }
  const strangeText = strange > 0 ? ` ${strange} ${strange === 1 ? 'vaca ficou' : 'vacas ficaram'} fora: parto antes dos 15 meses de idade, confira as datas.` : ''
  const index: CriaIndex = ages.length === 0
    ? { value: null, missing: `Nenhuma vaca nascida aqui (ou comprada novilha) com filho cadastrado. Cadastre os filhos com a mãe e a data de nascimento, inclusive os já vendidos.${strangeText}` }
    : {
        value: ages.reduce((s, m) => s + m, 0) / ages.length,
        detail: `média de ${ages.length} ${ages.length === 1 ? 'vaca' : 'vacas'}; o Nelore no Brasil fica entre 39 e 45 meses (Embrapa).${strangeText}`,
        caveat: ages.length < 3 ? 'Poucas vacas na conta: o número muda muito a cada parto novo.' : undefined,
      }
  if (index.value != null) index.belowTarget = index.value > FIRST_CALVING_TARGET.target

  const openHeifers = animals
    .filter(a => a.species === 'bovino' && a.sex === 'F' && a.status === 'ativo' && a.birth_date && !a.is_fat && cameYoung(a)
      && !calved.has(a.id) && !covered.has(a.id) && !checked.has(a.id))
    .map(a => ({ id: a.id, label: a.name || a.code || 'sem nome', months: Math.floor(monthsBetween(a.birth_date!, today)) }))
    .filter(h => h.months >= OPEN_HEIFER_MONTHS)
    .sort((x, y) => y.months - x.months)
  return { index, openHeifers }
}

/**
 * Perda entre prenhez e parto (Tião, P8 item 3): das vacas diagnosticadas prenhes, quantas não pariram em até
 * 10 meses do exame. Meta até 5%. Só entram exames com 10 meses ou mais; vaca vendida ou morta antes do parto
 * sai da conta [Ravi: não dá para saber se perderia; a morta com o bezerro dentro aparece na mortalidade da vaca].
 * Sem diagnóstico prenhe lançado, a linha não aparece (null).
 */
export const PREGNANCY_LOSS_TARGET = { target: 0.05, text: 'até 5%' }
const LOSS_WINDOW_MONTHS = 10

export function pregnancyLoss(args: {
  checks: { animal_id: string; exam_date: string; result: string }[]
  calvings: Map<string, string[]>
  exitDate: Map<string, string>
  today: string
}): CriaIndex | null {
  const { checks, calvings, exitDate, today } = args
  const pregnant = checks.filter(c => c.result === 'prenhe')
  if (pregnant.length === 0) return null
  const ready = pregnant.filter(c => monthsBetween(c.exam_date, today) >= LOSS_WINDOW_MONTHS)
  if (ready.length === 0) {
    const first = pregnant.map(c => addMonths(c.exam_date, LOSS_WINDOW_MONTHS)).sort()[0]
    return { value: null, missing: `Os diagnósticos ainda não completaram 10 meses. A conta sai a partir de ${fmtBr(first)}.` }
  }
  let lost = 0
  let counted = 0
  for (const c of ready) {
    const limit = addMonths(c.exam_date, LOSS_WINDOW_MONTHS)
    const calvedInTime = (calvings.get(c.animal_id) ?? []).some(d => d > c.exam_date && d <= limit)
    if (calvedInTime) { counted++; continue }
    const out = exitDate.get(c.animal_id)
    if (out && out <= limit) continue
    counted++
    lost++
  }
  if (counted === 0) return { value: null, missing: 'As vacas diagnosticadas prenhes saíram antes do parto: sem conta ainda.' }
  return {
    value: lost / counted,
    detail: `${lost} de ${counted} ${counted === 1 ? 'prenhe' : 'prenhes'} sem parto lançado em 10 meses do exame`,
    belowTarget: lost / counted > PREGNANCY_LOSS_TARGET.target,
    caveat: lost > 0 ? 'Confira se o parto dessas vacas foi lançado (filho com a mãe ou parto em Reprodução) antes de concluir que perdeu.' : undefined,
    caveatTag: 'confira',
  }
}
