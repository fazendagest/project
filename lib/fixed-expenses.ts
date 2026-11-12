/**
 * Despesas fixas (salário do caseiro, conta de luz): o que se paga todo mês.
 * Decisão de 11/11/2026 (Henrique): "o que for despesa fixa como o salário mensal do caseiro, o usuário
 * não precisa repetir no próximo mês o lançamento". Por isso a despesa fixa é UMA linha em
 * operational_expenses (is_fixed = true, date = primeiro pagamento) que vale todo mês, no mesmo dia,
 * até fixed_until (vazio = continua). Toda conta de despesa passa por expandExpenses/sumExpensesInRange.
 */
export type ExpenseLike = {
  date: string | null
  amount: number | null
  category?: string | null
  is_fixed?: boolean | null
  fixed_until?: string | null
}

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
    if (out.length > 240) break // trava de segurança: no máximo 20 anos
  }
  return out
}

/** Datas em que a despesa fixa foi paga, do primeiro pagamento até hoje (ou até parar). */
export function fixedDates(e: ExpenseLike, todayStr: string): string[] {
  if (!e.date) return []
  const last = e.fixed_until && e.fixed_until < todayStr ? e.fixed_until : todayStr
  const day = Number(e.date.slice(8, 10))
  return monthsFrom(monthOf(e.date), monthOf(last))
    .map(m => sameDayIn(m, day))
    .filter(d => d >= e.date! && d <= last)
}

/** Cada despesa vira uma ocorrência por data: a fixa, uma por mês; a comum, ela mesma. */
export function expandExpenses<T extends ExpenseLike>(rows: T[], todayStr: string): (T & { date: string })[] {
  const out: (T & { date: string })[] = []
  for (const r of rows) {
    if (!r.date) continue
    if (r.is_fixed) for (const d of fixedDates(r, todayStr)) out.push({ ...r, date: d })
    else out.push(r as T & { date: string })
  }
  return out
}

/** Soma das despesas entre duas datas (inclusive), contando cada mês das fixas. */
export function sumExpensesInRange(rows: ExpenseLike[], start: string, end: string, todayStr: string) {
  return expandExpenses(rows, todayStr)
    .filter(e => e.date >= start && e.date <= end)
    .reduce((s, e) => s + Number(e.amount ?? 0), 0)
}

/** Data de hoje em São Paulo, no formato AAAA-MM-DD. */
/** Mora em lib/today.ts; exportado aqui para quem já importava daqui. */
export { todaySP } from './today'

export const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "agosto de 2025" do texto "2025-08-20". */
export const monthLabelPt = (date: string) => `${MONTH_NAMES[Number(date.slice(5, 7)) - 1]} de ${date.slice(0, 4)}`
