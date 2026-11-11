/**
 * Gado de terceiros no pasto da fazenda (Tião, P3, 11/11/2026): aluguel de pasto ou parceria.
 * Conta na lotação (UA por hectare), e o aluguel entra no "A fazenda se pagou". Fica fora do valor
 * do rebanho e do investido, porque o gado não é da fazenda.
 */
import { UA } from './investment'

export type DealType = 'aluguel' | 'parceria'
export type HerdKind = 'vaca' | 'boi' | 'novilha' | 'bezerro'

export type ThirdPartyHerd = {
  id: string
  farm_id: string
  owner_name: string
  owner_phone?: string | null
  deal_type: DealType
  agreed_value?: number | null
  partnership_terms?: string | null
  settled_value?: number | null
  herd_kind: HerdKind
  head_count: number
  entry_date: string
  exit_date?: string | null
  gta_number?: string | null
  brucelose_tb_exam: boolean
  exam_date?: string | null
  notes?: string | null
  created_at?: string
}

export const DEAL_TYPES: Record<DealType, { label: string; hint: string }> = {
  aluguel: { label: 'Aluguel de pasto', hint: 'O dono paga um valor por cabeça todo mês.' },
  parceria: { label: 'Parceria', hint: 'O acerto é no fim (ex.: parte do ganho de peso).' },
}

export const HERD_KINDS: Record<HerdKind, { label: string; ua: number }> = {
  boi: { label: 'Bois ou garrotes', ua: UA.bovinoJovem },
  novilha: { label: 'Novilhas', ua: UA.bovinoJovem },
  vaca: { label: 'Vacas', ua: UA.vaca },
  bezerro: { label: 'Bezerros', ua: UA.bezerro },
}

const DAY = 86_400_000
const DAYS_PER_MONTH = 30.44
const toTime = (d: string) => new Date(d + 'T12:00:00').getTime()

/** O lote está no pasto nesse dia. */
export const isOnFarm = (h: Pick<ThirdPartyHerd, 'entry_date' | 'exit_date'>, day: string) =>
  h.entry_date <= day && (!h.exit_date || h.exit_date >= day)

/** Tamanho do lote em UA (cabeças × UA da categoria). */
export const herdUA = (h: Pick<ThirdPartyHerd, 'head_count' | 'herd_kind'>) =>
  h.head_count * (HERD_KINDS[h.herd_kind]?.ua ?? 1)

/** Aluguel de um mês inteiro do lote (R$). */
export const monthlyRent = (h: ThirdPartyHerd) =>
  h.deal_type === 'aluguel' ? Number(h.agreed_value ?? 0) * h.head_count : 0

/**
 * Quanto o lote rendeu entre duas datas: aluguel proporcional aos dias no pasto; parceria só
 * quando o acerto foi lançado, na data de saída.
 */
export function incomeInRange(h: ThirdPartyHerd, start: string, end: string): number {
  if (h.deal_type === 'parceria') {
    return h.settled_value && h.exit_date && h.exit_date >= start && h.exit_date <= end ? Number(h.settled_value) : 0
  }
  const from = h.entry_date > start ? h.entry_date : start
  const until = h.exit_date && h.exit_date < end ? h.exit_date : end
  if (until < from) return 0
  const days = (toTime(until) - toTime(from)) / DAY + 1
  return (monthlyRent(h) * days) / DAYS_PER_MONTH
}
