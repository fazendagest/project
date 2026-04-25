export type PlantelRow = {
  species: string
  qty: number
  custo_investido: number
  valor_mercado: number | null
  lucro_estimado: number | null
}

const SPECIES_ORDER = ['bovino', 'equino', 'suino']

export function buildPlantelRows(
  costs: { animal_id: string; species: string; total_cost: number }[],
  animals: { id: string; market_value?: number | null }[]
): PlantelRow[] {
  const marketMap = new Map(animals.map(a => [a.id, a.market_value ?? null]))
  return SPECIES_ORDER
    .map(sp => {
      const spCosts = costs.filter(a => a.species === sp)
      if (spCosts.length === 0) return null
      const qty = spCosts.length
      const custo_investido = spCosts.reduce((s, a) => s + a.total_cost, 0)
      const withMv = spCosts.filter(a => marketMap.get(a.animal_id) != null)
      const valor_mercado = withMv.length > 0
        ? withMv.reduce((s, a) => s + (marketMap.get(a.animal_id) ?? 0), 0)
        : null
      const lucro_estimado = valor_mercado != null ? valor_mercado - custo_investido : null
      return { species: sp, qty, custo_investido, valor_mercado, lucro_estimado } as PlantelRow
    })
    .filter((r): r is PlantelRow => r !== null)
}
