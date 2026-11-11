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

export type Invested = { purchase: number; health: number; feed: number; total: number }

export function computeInvested(costs: CostRow[], feeds: FeedPurchase[]): Record<string, Invested> {
  const result: Record<string, Invested> = {}
  for (const c of costs) {
    const purchase = Number(c.purchase_cost ?? 0)
    const health = Number(c.health_cost ?? 0)
    result[c.animal_id] = { purchase, health, feed: 0, total: purchase + health }
  }
  for (const f of feeds) {
    const amount = Number(f.total_cost ?? 0)
    if (!f.purchase_date || amount <= 0) continue
    const d = f.purchase_date
    const present = costs.filter(c => c.entry_date <= d && (!c.sale_date || c.sale_date >= d))
    if (present.length === 0) continue
    const share = amount / present.length
    for (const c of present) {
      result[c.animal_id].feed += share
      result[c.animal_id].total += share
    }
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
