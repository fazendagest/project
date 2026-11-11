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
  /** De onde veio: IFAG (média de Goiás) ou Scot (vaca de leite, sem cotação oficial). */
  source: 'ifag' | 'scot'
  /** Conta feita por nós a partir de uma cotação (raça de leite), não o preço publicado. */
  estimate?: boolean
}

export const IFAG_SOURCE_URL = 'https://ifag.org.br/'

const KG_PER_ARROBA = 15

/**
 * Vaca de leite adulta (P5 e P6 do Tião): não há cotação oficial; usa a vaca boiadeira mestiça de reposição em Goiás.
 * [V] Scot Consultoria, GO, R$ 3.512,86 por cabeça (315 kg, 10,5 @), fechamento 11/11/2026, no Notícias Agrícolas.
 * Número fixo, sem leitura automática: atualizar à mão (o aviso de desatualizado aparece depois de 90 dias).
 */
export const DAIRY_COW_REFERENCE = { perHead: 3513, quotedAt: '2026-11-11' }
export const SCOT_SOURCE_URL = 'https://www.noticiasagricolas.com.br/cotacoes/boi-gordo/femea-mestica-reposico-vaca-boiadeira-300-kg-10'
/** Bezerro e novilha de leite ou cruzado de leite: mestiço da mesma faixa menos 15% (estimativa do Tião, P5). */
export const DAIRY_YOUNG_DISCOUNT = 0.15
/** Aviso quando o valor digitado passa a referência em mais de 20% (Tião, P6 item 5). */
export const TYPED_ABOVE_LIMIT = 0.2

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

/** Gir, Girolando, Holandês, Jersey, Guzerá leiteiro e afins. O F1 (Angus × Gir) vale como mestiço de corte (P5). */
export function isDairyBreed(breed?: string | null) {
  const b = breed ?? ''
  if (/f1/i.test(b)) return false
  return /gir|holand|jersey|pardo[- ]su[ií]..o|leiteir/i.test(b)
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
      source: 'ifag',
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
      source: 'ifag',
    }
  }

  // Touro e cavalo não têm cotação no IFAG.
  if (a.species !== 'bovino' || a.is_breeder) return null

  const m = a.birth_date ? monthsSince(a.birth_date, today) : null
  const dairy = isDairyBreed(a.breed)

  // O IFAG cota gado de corte (Nelore e mestiço). Vaca de leite adulta (ou sem data de nascimento) usa a
  // vaca boiadeira mestiça da Scot; os mais novos, o mestiço da faixa menos 15% (Tião, P5 e P6).
  if (dairy && a.sex === 'F' && (m == null || m > 36)) {
    return {
      label: 'Vaca boiadeira mestiça de Goiás (Scot Consultoria)',
      perHead: DAIRY_COW_REFERENCE.perHead,
      min: null,
      max: null,
      quotedAt: DAIRY_COW_REFERENCE.quotedAt,
      stale: (today.getTime() - new Date(DAIRY_COW_REFERENCE.quotedAt + 'T12:00:00').getTime()) / 86_400_000 > 90,
      source: 'scot',
      estimate: true,
    }
  }
  // Sem data de nascimento não dá para saber a faixa.
  if (m == null) return null

  const band = m <= 12 ? '0-12 Meses' : m <= 24 ? '13-24 Meses' : m <= 36 ? '25-36 Meses' : 'Acima de 36 Meses'
  const breed = !dairy && /nelore/i.test(a.breed ?? '') ? 'Nelore' : 'Mestiço'
  const sex = a.sex === 'F' ? 'Fêmea' : 'Macho'
  const product = `${breed} ${sex} (${band})`
  const p = find(data.prices, product)
  if (!p) return null
  const k = dairy ? 1 - DAIRY_YOUNG_DISCOUNT : 1
  return {
    label: dairy ? `${product}, menos 15% por ser de leite` : product,
    perHead: Math.round(p.avg * k),
    min: Math.round(p.min * k),
    max: Math.round(p.max * k),
    quotedAt: p.quotedAt,
    stale: isStale(p.quotedAt, today),
    source: 'ifag',
    estimate: dairy || undefined,
  }
}

/** Aviso cinza quando o digitado está mais de 25% abaixo da referência (Tião, auditoria do 0a6f2d3). */
export const TYPED_BELOW_LIMIT = 0.25

/**
 * Nome da referência, para lista e ficha. A vaca de leite usa a vaca boiadeira mestiça de corte, que costuma
 * valer mais que a Gir ou Girolando magra: o rótulo diz que é aproximada e de onde veio (Tião).
 */
export function referenceName(ref: Pick<MarketReference, 'source' | 'estimate' | 'quotedAt'>) {
  if (ref.source === 'scot') return `Referência aproximada: vaca boiadeira mestiça GO (Scot, ${ref.quotedAt.slice(8, 10)}/${ref.quotedAt.slice(5, 7)})`
  return ref.estimate ? 'Goiás (estimativa)' : 'Goiás (IFAG)'
}
