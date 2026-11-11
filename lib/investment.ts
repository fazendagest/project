/**
 * Valor investido por animal: compra + saúde + parte da alimentação e das despesas da fazenda.
 * A alimentação (sal, milho, ração) e as despesas são do rebanho, então cada uma é dividida entre os
 * animais que estavam na fazenda na data (entraram até a data e não tinham sido vendidos), pelo tamanho
 * de cada um em UA (unidade animal: 1 UA = 450 kg, perto de uma vaca adulta). É uma estimativa.
 * Decisão de 11/11/2026 (opção A, por cabeça); trocada para UA pelo Tião (P2, 11/11/2026).
 */
import { expandExpenses, todaySP, type ExpenseLike } from './fixed-expenses'

export type CostRow = {
  animal_id: string
  entry_date: string
  sale_date?: string | null
  purchase_cost: number | null
  health_cost: number | null
  /** Espécie: cavalo (equino) é animal de trabalho e não recebe parte das despesas. */
  species?: string | null
}

/**
 * Cavalo é de trabalho: o gasto de mantê-lo (ração e despesas) vai para os outros animais, porque ele
 * trabalha para eles. A compra dele fica com ele e aparece à parte no Dashboard.
 * Decisão de 11/11/2026 (Henrique seguiu a recomendação, opção A).
 */
export const isWorkAnimal = (c: { species?: string | null }) => c.species === 'equino'

export type FeedPurchase = { purchase_date: string | null; total_cost: number | null; for_pigs?: boolean | null }

/** Porco só recebe o que foi lançado para ele (Tião, revisão do P2): ração marcada para o porco. */
export const isPig = (c: { species?: string | null }) => c.species === 'suino'

/**
 * Funrural: 1,63% da venda bruta para produtor pessoa física desde 01/04/2026 (LC 224/2025; conferido pelo
 * Tião na Famato). Usado como estimativa enquanto o imposto não é lançado à parte.
 */
export const FUNRURAL_RATE = 0.0163

/** Dados do animal para saber o tamanho dele em UA. */
export type UaAnimal = {
  id: string
  species: string
  sex: string
  birth_date?: string | null
  is_breeder?: boolean | null
  weight_arrobas?: number | null
  mother_id?: string | null
}

/**
 * Peso de cada categoria em UA (Tião, P2, 11/11/2026). Mudar aqui muda o rateio em todo o sistema.
 * Porco vale 1 entre os porcos (só recebe a ração marcada para ele); cavalo não entra (é de trabalho).
 */
export const UA = {
  vaca: 1,
  touro: 1.25,
  bovinoJovem: 0.75, // boi, garrote e novilha
  bezerro: 0.4, // até 12 meses
  outro: 1,
  kgPorUa: 450,
} as const

const KG_PER_ARROBA = 15

function monthsAt(birth: string, date: string) {
  const b = new Date(birth + 'T12:00:00')
  const d = new Date(date + 'T12:00:00')
  return (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth()) - (d.getDate() < b.getDate() ? 1 : 0)
}

/** Tamanho do animal em UA numa data. Com peso lançado, vale o peso ÷ 450 kg. */
export function animalUA(a: UaAnimal | undefined, date: string, hasOffspring = false): number {
  if (!a || a.species !== 'bovino') return UA.outro
  if (a.weight_arrobas && a.weight_arrobas > 0) return (a.weight_arrobas * KG_PER_ARROBA) / UA.kgPorUa
  const m = a.birth_date ? monthsAt(a.birth_date, date) : null
  if (m != null && m < 0) return 0 // ainda não tinha nascido
  if (m != null && m <= 12) return UA.bezerro
  if (a.sex === 'F') return hasOffspring || m == null || m >= 36 ? UA.vaca : UA.bovinoJovem
  if (a.is_breeder) return UA.touro
  return UA.bovinoJovem
}

/** Grupo do animal na conta da lotação, para mostrar ao dono de onde vem o total de UA (Tião, teste do P3). */
export type UaGroup = 'vacas' | 'novilhas' | 'bezerros' | 'touros' | 'bois' | 'cavalos' | 'outros'
export const UA_GROUP_LABELS: Record<UaGroup, [string, string]> = {
  vacas: ['vaca', 'vacas'],
  novilhas: ['novilha', 'novilhas'],
  bezerros: ['bezerro', 'bezerros'],
  touros: ['touro', 'touros'],
  bois: ['boi ou garrote', 'bois e garrotes'],
  cavalos: ['cavalo', 'cavalos'],
  outros: ['outro', 'outros'],
}
export function uaGroup(a: UaAnimal, date: string, hasOffspring = false): UaGroup {
  if (a.species === 'equino') return 'cavalos'
  if (a.species !== 'bovino') return 'outros'
  const m = a.birth_date ? monthsAt(a.birth_date, date) : null
  if (m != null && m <= 12) return 'bezerros'
  if (a.sex === 'F') return hasOffspring || m == null || m >= 36 ? 'vacas' : 'novilhas'
  return a.is_breeder ? 'touros' : 'bois'
}

/** Despesa geral da fazenda (caseiro, diesel, energia, limpeza de pasto...). */
export type GeneralExpense = ExpenseLike

/** Categoria de despesa que não é dos animais cadastrados (galinha, lavoura para vender, casa): fica fora do custo deles. */
export const OUTSIDE_HERD_CATEGORY = 'fora_do_gado'

export type Invested = { purchase: number; health: number; feed: number; general: number; total: number }

/**
 * Despesas gerais (decisão de 11/11/2026, Henrique: "o que você tem certeza que é melhor"): o caseiro cuida
 * de toda a fazenda, então cada despesa se divide entre os animais presentes na data, pelo tamanho em UA,
 * igual à alimentação. O que for "Fora do gado" (galinha, lavoura, casa) não entra.
 */
export function computeInvested(
  costs: CostRow[],
  feeds: FeedPurchase[],
  expenses: GeneralExpense[] = [],
  animals: UaAnimal[] = [],
): Record<string, Invested> {
  const result: Record<string, Invested> = {}
  const byId = new Map(animals.map(a => [a.id, a]))
  const mothers = new Set(animals.map(a => a.mother_id).filter(Boolean) as string[])
  for (const c of costs) {
    const purchase = Number(c.purchase_cost ?? 0)
    const health = Number(c.health_cost ?? 0)
    result[c.animal_id] = { purchase, health, feed: 0, general: 0, total: purchase + health }
  }
  // Gado recebe a ração comum e as despesas gerais; porco só a ração marcada para ele; cavalo, nada.
  const spread = (date: string | null, amount: number, field: 'feed' | 'general', pigs = false) => {
    if (!date || amount <= 0) return
    const present = costs.filter(c => !isWorkAnimal(c) && isPig(c) === pigs && c.entry_date <= date && (!c.sale_date || c.sale_date >= date))
    // Sem os dados do animal, cada um vale 1 (divisão por cabeça).
    const weights = present.map(c => (animals.length ? animalUA(byId.get(c.animal_id), date, mothers.has(c.animal_id)) : 1))
    const totalUA = weights.reduce((s, w) => s + w, 0)
    if (totalUA <= 0) return
    present.forEach((c, i) => {
      const share = (amount * weights[i]) / totalUA
      result[c.animal_id][field] += share
      result[c.animal_id].total += share
    })
  }
  for (const f of feeds) spread(f.purchase_date, Number(f.total_cost ?? 0), 'feed', !!f.for_pigs)
  // Despesa fixa conta uma vez por mês, do primeiro pagamento até hoje (ou até parar).
  for (const e of expandExpenses(expenses, todaySP())) {
    if (e.category === OUTSIDE_HERD_CATEGORY) continue
    spread(e.date, Number(e.amount ?? 0), 'general')
  }
  return result
}

/**
 * Rendimento ao mês das vendas: lucro dividido pelo dinheiro parado (investido × meses na fazenda).
 * Conta simples, sem juros sobre juros, para comparar com o banco. Só entram vendas com custo lançado
 * (animal nascido aqui tem custo quase zero e daria um número sem sentido).
 * Decisão de 11/11/2026 (Henrique, opção A do item "margem além do lucro").
 */
export type SaleRow = { animal_id: string; sale_price: number | null; sale_date: string }

export type MonthlyReturn = { rate: number; counted: number; skipped: number; avgMonths: number }

const DAYS_PER_MONTH = 30.44

export function monthlyReturn(sales: SaleRow[], costs: CostRow[], invested: Record<string, Invested>): MonthlyReturn | null {
  const entryOf = new Map(costs.map(c => [c.animal_id, c.entry_date]))
  let profit = 0
  let capitalMonths = 0
  let investedSum = 0
  let counted = 0
  for (const s of sales) {
    const inv = invested[s.animal_id]?.total ?? 0
    const entry = entryOf.get(s.animal_id)
    if (inv <= 0 || !entry) continue
    const months = Math.max(1, (Date.parse(s.sale_date) - Date.parse(entry)) / 86_400_000 / DAYS_PER_MONTH)
    profit += Number(s.sale_price ?? 0) - inv
    capitalMonths += inv * months
    investedSum += inv
    counted++
  }
  if (counted === 0 || capitalMonths <= 0) return null
  return { rate: profit / capitalMonths, counted, skipped: sales.length - counted, avgMonths: capitalMonths / investedSum }
}

/**
 * Referência do banco: aplicação conservadora rendeu cerca de 1,18% ao mês em 2025 (Selic de 14,25% a 15% ao ano).
 * Fonte: Compre Rural, 06/03/2026, com dados da Scot Consultoria. Revisar quando a Selic mudar muito.
 */
export const BANK_MONTHLY = 0.0118
