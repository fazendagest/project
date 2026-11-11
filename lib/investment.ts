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
