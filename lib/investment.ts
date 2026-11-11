/**
 * Valor investido por animal: compra + saúde + parte da alimentação.
 * A alimentação (sal, milho, ração) é comprada para o rebanho, então cada compra
 * é dividida igualmente entre os animais que estavam na fazenda na data da compra
 * (entraram até a data e não tinham sido vendidos). É uma estimativa.
 * Decisão de 11/11/2026 (opção A, divisão por cabeça).
 */
export type CostRow = {
  animal_id: string
  entry_date: string
  sale_date?: string | null
  purchase_cost: number | null
  health_cost: number | null
}

export type FeedPurchase = { purchase_date: string | null; total_cost: number | null }

/** Despesa geral da fazenda (caseiro, diesel, energia, limpeza de pasto...). */
export type GeneralExpense = { date: string | null; amount: number | null; category: string | null }

/** Categoria de despesa que não é dos animais cadastrados (galinha, lavoura para vender, casa): fica fora do custo deles. */
export const OUTSIDE_HERD_CATEGORY = 'fora_do_gado'

export type Invested = { purchase: number; health: number; feed: number; general: number; total: number }

/**
 * Despesas gerais (decisão de 11/11/2026, Henrique: "o que você tem certeza que é melhor"): o caseiro cuida
 * de toda a fazenda, então cada despesa se divide por cabeça entre os animais presentes na data, igual à
 * alimentação. O que for "Fora do gado" (galinha, lavoura, casa) não entra.
 */
export function computeInvested(costs: CostRow[], feeds: FeedPurchase[], expenses: GeneralExpense[] = []): Record<string, Invested> {
  const result: Record<string, Invested> = {}
  for (const c of costs) {
    const purchase = Number(c.purchase_cost ?? 0)
    const health = Number(c.health_cost ?? 0)
    result[c.animal_id] = { purchase, health, feed: 0, general: 0, total: purchase + health }
  }
  const spread = (date: string | null, amount: number, field: 'feed' | 'general') => {
    if (!date || amount <= 0) return
    const present = costs.filter(c => c.entry_date <= date && (!c.sale_date || c.sale_date >= date))
    if (present.length === 0) return
    const share = amount / present.length
    for (const c of present) {
      result[c.animal_id][field] += share
      result[c.animal_id].total += share
    }
  }
  for (const f of feeds) spread(f.purchase_date, Number(f.total_cost ?? 0), 'feed')
  for (const e of expenses) {
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
