// R$ por arroba na venda, com a referência de Goiás ao lado (Tião, P6 item 6, 11/11/2026).
// Sem dependência de servidor: usado na tela de Movimentações (cliente).

import { CARCASS_YIELD, normalize, isStale, type IfagPrices } from './market-reference'

/** De que é a arroba do peso da venda. Coluna animal_sales.arroba_basis. */
export type ArrobaBasis = 'carcaca' | 'vivo'

export const ARROBA_BASIS: Record<ArrobaBasis, { label: string; short: string; hint: string }> = {
  carcaca: { label: 'De carcaça', short: '@ de carcaça', hint: 'Frigorífico: paga pela carcaça (15 kg cada @).' },
  vivo: { label: 'Peso vivo', short: '@ de peso vivo', hint: 'Balança do comprador: @ do comércio (30 kg vivos cada @).' },
}

export type SaleArroba = {
  /** R$ por @ que saiu na venda (digitado ou valor ÷ peso). Null sem peso e sem preço por @. */
  perArroba: number | null
  basis: ArrobaBasis | null
  /** "vaca", "novilha" ou "boi": a linha do IFAG usada. */
  kindLabel: string
  /** Arroba de carcaça à vista, média de Goiás (IFAG). */
  refCarcass: number | null
  /** A mesma referência levada para o peso vivo: carcaça × rendimento × 2 (1 @ do comércio = 30 kg vivos). */
  refLive: number | null
  quotedAt: string | null
  stale: boolean
}

/** Idade mínima para comparar com a arroba do gado gordo. */
const MIN_MONTHS_FOR_ARROBA = 24

const monthsAt = (birth: string, on: string) => {
  const b = new Date(birth + 'T12:00:00'), d = new Date(on + 'T12:00:00')
  return (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth()) - (d.getDate() < b.getDate() ? 1 : 0)
}

export function saleArroba(
  s: { sale_price: number; sale_date: string; weight_kg?: number | null; price_per_kg?: number | null; arroba_basis?: string | null; animals?: number },
  animal: { sex?: string | null; birth_date?: string | null } | null | undefined,
  ifag: IfagPrices | null | undefined,
): SaleArroba {
  // weight_kg guarda arrobas (o nome da coluna engana). Venda de vários animais: o peso é o total do lote.
  const weight = s.weight_kg && s.weight_kg > 0 ? s.weight_kg : null
  const price = s.price_per_kg && s.price_per_kg > 0 ? s.price_per_kg : weight ? (s.sale_price * (s.animals ?? 1)) / weight : null
  const basis = s.arroba_basis === 'carcaca' || s.arroba_basis === 'vivo' ? s.arroba_basis : null

  const months = animal?.birth_date ? monthsAt(animal.birth_date, s.sale_date) : null
  const kind = animal?.sex === 'M' ? 'macho' : months != null && months <= 36 ? 'novilha' : 'vaca'
  const product = kind === 'macho' ? 'Boi Gordo - À vista' : kind === 'novilha' ? 'Novilha Gorda - À vista' : 'Vaca Gorda - À vista'
  // Bezerro e garrote (menos de 24 meses) não são gado gordo: o IFAG os cota por cabeça, não por arroba.
  const young = months != null && months < MIN_MONTHS_FOR_ARROBA
  const p = young ? undefined : ifag?.prices.find(x => normalize(x.product) === normalize(product))
  const refCarcass = p ? p.avg : null
  const refLive = refCarcass != null ? refCarcass * CARCASS_YIELD[kind] * 2 : null
  return {
    perArroba: price != null ? Math.round(price * 100) / 100 : null,
    basis,
    kindLabel: kind === 'macho' ? 'boi gordo' : kind === 'novilha' ? 'novilha gorda' : 'vaca gorda',
    refCarcass,
    refLive: refLive != null ? Math.round(refLive * 100) / 100 : null,
    quotedAt: p?.quotedAt ?? null,
    stale: p ? isStale(p.quotedAt) : false,
  }
}

/** Referência na mesma arroba da venda; sem saber a arroba, a de carcaça (o comum na venda de gado gordo). */
export function referenceFor(a: SaleArroba) {
  return a.basis === 'vivo' ? a.refLive : a.refCarcass
}
