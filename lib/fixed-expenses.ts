/**
 * Despesas fixas (salário do caseiro, conta de luz): o que se paga todo mês.
 * Decisão de 11/11/2026 (Henrique): avisar o fazendeiro para lançar as despesas e deixar o salário fixo.
 * Sem tabela nova: cada mês é uma linha em operational_expenses com is_fixed = true.
 * "Faltando" = despesa fixa cujo último lançamento é de um mês anterior ao atual.
 */
export type FixedLike = { date: string; amount: number; description: string; category: string; is_fixed?: boolean | null }

/** "2026-11" do texto "2026-11-11". */
export const monthOf = (date: string) => date.slice(0, 7)

/** A mesma data no mês pedido, sem passar do último dia (31 vira 30 ou 28). */
export function sameDayIn(month: string, day: number) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`
}

/** Meses de "desde" até "ate", inclusive, no formato "AAAA-MM". */
export function monthsFrom(since: string, until: string): string[] {
  const out: string[] = []
  let [y, m] = since.split('-').map(Number)
  const [ye, me] = until.split('-').map(Number)
  while (y < ye || (y === ye && m <= me)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
    if (out.length > 120) break // trava de segurança: no máximo 10 anos
  }
  return out
}

/** Despesas fixas ainda não lançadas no mês atual (a última de cada uma, para repetir). */
export function missingFixed<T extends FixedLike>(expenses: T[], todayStr: string): T[] {
  const latest = new Map<string, T>()
  for (const e of expenses) {
    if (!e.is_fixed) continue
    const key = `${e.category}|${e.description.trim().toLowerCase()}`
    const cur = latest.get(key)
    if (!cur || e.date > cur.date) latest.set(key, e)
  }
  const thisMonth = monthOf(todayStr)
  return [...latest.values()].filter(e => monthOf(e.date) < thisMonth)
}

export const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
