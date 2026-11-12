// Regra única de "Faltam os custos do gado" (Tião, teste de preenchimento de 11/11/2026):
// sem compra de alimentação do gado (sal, milho, ração; fora a comida dos porcos) nos últimos 45 dias.
// Para umas 20 cabeças, um saco de sal dura de 3 a 6 semanas. Vale para Animais e Dashboard.

/** Dias sem compra de alimentação do gado até o sistema pedir o lançamento. */
export const FEED_GAP_DAYS = 45

export type FeedLike = { purchase_date?: string | null; total_cost?: number | string | null; for_pigs?: boolean | null }

const addDaysIso = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Última compra de alimentação do gado até hoje e se ela já passou dos 45 dias.
 * `missing` também é verdadeiro quando nunca houve compra.
 */
export function feedGap(feeds: FeedLike[], today: string): { last: string | null; missing: boolean } {
  const last = feeds
    .filter(f => !f.for_pigs && Number(f.total_cost ?? 0) > 0 && f.purchase_date && f.purchase_date <= today)
    .map(f => f.purchase_date as string)
    .sort()
    .at(-1) ?? null
  return { last, missing: !last || last < addDaysIso(today, -FEED_GAP_DAYS) }
}
