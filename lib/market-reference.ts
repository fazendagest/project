// Preço de referência de mercado (IFAG, média do estado de Goiás) para um animal.
// Arquivo sem dependência de servidor: usado no formulário (cliente) e nas telas (servidor).

import { LIVE_KG_PER_TRADE_ARROBA } from './investment'

export interface IfagPrice {
  product: string // nome como o IFAG publica, ex.: "Mestiço Macho (0-12 Meses)"
  avg: number
  min: number
  max: number
  quotedAt: string // AAAA-MM-DD
}

export interface IfagPrices {
  prices: IfagPrice[]
  fetchedAt: string // ISO
}

export interface MarketReference {
  /** Linha do IFAG usada, para o fazendeiro saber de onde veio. */
  label: string
  /** Valor por cabeça (R$). Null quando o preço é por kg e o animal não tem peso. */
  perHead: number | null
  min: number | null
  max: number | null
  /** Preço do quilo vivo, só para porco. */
  perKg?: number
  /** Animal gordo: preço da arroba de carcaça e a conta feita a partir do peso vivo. */
  fat?: { perArroba: number; liveArrobas: number | null; liveKg: number | null; carcassArrobas: number | null; yieldPct: number }
  quotedAt: string
  /** Cotação com mais de 14 dias. */
  stale: boolean
}

export const IFAG_SOURCE_URL = 'https://ifag.org.br/'

const KG_PER_ARROBA = 15

/**
 * Rendimento de carcaça do animal gordo: o frigorífico paga a arroba da carcaça, cerca de metade do
 * peso vivo. Por categoria (Tião, P2, 11/11/2026): boi e garrote 52%, novilha 50%, vaca 48%.
 * O frigorífico confirma o rendimento real na hora; aqui é só a referência.
 */
export const CARCASS_YIELD = { macho: 0.52, novilha: 0.5, vaca: 0.48 } as const

export function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function monthsSince(date: string, today = new Date()) {
  const d = new Date(date + 'T12:00:00')
  return (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth()) - (today.getDate() < d.getDate() ? 1 : 0)
}

export function isStale(quotedAt: string, today = new Date()) {
  const d = new Date(quotedAt + 'T12:00:00')
  return (today.getTime() - d.getTime()) / 86_400_000 > 14
}

/** Gir, Girolando, Holandês, Jersey, Guzerá leiteiro e afins. */
export function isDairyBreed(breed?: string | null) {
  return /gir|holand|jersey|pardo[- ]su[ií]..o|leiteir/i.test(breed ?? '')
}

function find(prices: IfagPrice[], product: string) {
  const key = normalize(product)
  return prices.find(p => normalize(p.product) === key)
}

export function marketReference(
  a: { species: string; sex: string; birth_date?: string | null; breed?: string | null; is_breeder?: boolean | null; is_fat?: boolean | null; weight_arrobas?: number | null },
  data: IfagPrices | null | undefined,
  today = new Date(),
): MarketReference | null {
  if (!data || data.prices.length === 0) return null

  // Gordo, para o frigorífico: vale a arroba de carcaça (qualquer raça), pelo peso vivo.
  if (a.species === 'bovino' && a.is_fat) {
    const m = a.birth_date ? monthsSince(a.birth_date, today) : null
    const kind = a.sex === 'M' ? 'macho' : m != null && m <= 36 ? 'novilha' : 'vaca'
    const product = kind === 'macho' ? 'Boi Gordo - À vista' : kind === 'novilha' ? 'Novilha Gorda - À vista' : 'Vaca Gorda - À vista'
    const p = find(data.prices, product)
    if (!p) return null
    const yieldPct = CARCASS_YIELD[kind]
    // Peso em @ do comércio (peso vivo ÷ 30); carcaça = peso vivo × rendimento ÷ 15 (Tião, 11/11/2026).
    const live = a.weight_arrobas || null
    const liveKg = live ? live * LIVE_KG_PER_TRADE_ARROBA : null
    const carcass = liveKg ? Math.round((liveKg * yieldPct / KG_PER_ARROBA) * 10) / 10 : null
    return {
      label: product.replace(' - À vista', ', arroba à vista'),
      perHead: carcass ? Math.round(carcass * p.avg) : null,
      min: carcass ? Math.round(carcass * p.min) : null,
      max: carcass ? Math.round(carcass * p.max) : null,
      fat: { perArroba: p.avg, liveArrobas: live, liveKg, carcassArrobas: carcass, yieldPct },
      quotedAt: p.quotedAt,
      stale: isStale(p.quotedAt, today),
    }
  }

  if (a.species === 'suino') {
    const p = find(data.prices, 'Suíno')
    if (!p) return null
    const kg = a.weight_arrobas ? a.weight_arrobas * KG_PER_ARROBA : null
    return {
      label: 'Suíno, quilo vivo',
      perHead: kg ? Math.round(kg * p.avg) : null,
      min: kg ? Math.round(kg * p.min) : null,
      max: kg ? Math.round(kg * p.max) : null,
      perKg: p.avg,
      quotedAt: p.quotedAt,
      stale: isStale(p.quotedAt, today),
    }
  }

  // Touro e cavalo não têm cotação no IFAG; sem data de nascimento não dá para saber a faixa.
  if (a.species !== 'bovino' || a.is_breeder || !a.birth_date) return null

  // O IFAG cota gado de corte (Nelore e mestiço). Raça leiteira tem outro preço: sem referência.
  if (isDairyBreed(a.breed)) return null

  const m = monthsSince(a.birth_date, today)
  const band = m <= 12 ? '0-12 Meses' : m <= 24 ? '13-24 Meses' : m <= 36 ? '25-36 Meses' : 'Acima de 36 Meses'
  const breed = /nelore/i.test(a.breed ?? '') ? 'Nelore' : 'Mestiço'
  const sex = a.sex === 'F' ? 'Fêmea' : 'Macho'
  const product = `${breed} ${sex} (${band})`
  const p = find(data.prices, product)
  if (!p) return null
  return {
    label: product,
    perHead: Math.round(p.avg),
    min: Math.round(p.min),
    max: Math.round(p.max),
    quotedAt: p.quotedAt,
    stale: isStale(p.quotedAt, today),
  }
}
