// Ofertas recebidas (Tião, P10, 11/11/2026): comparar as ofertas de compradores antes de fechar uma venda.
// Uso interno do fazendeiro: nada é enviado a ninguém.
// Conta por oferta: bruto, menos Funrural (1,63%), menos o frete quando é ele quem paga = líquido.
// Referência de Goiás com a mesma regra da venda (lib/sale-arroba.ts, item 6 do P6).

import { FUNRURAL_RATE } from './investment'
import { CARCASS_YIELD, type IfagPrices } from './market-reference'
import { saleArroba, BELOW_REFERENCE, type ArrobaBasis } from './sale-arroba'

/** A oferta some da lista depois disso (ou quando algum animal dela sai do rebanho). */
export const OFFER_DAYS = 60

export type SaleOffer = {
  id: string
  buyer_name: string
  animal_ids: string[]
  price_kind: 'arroba' | 'cabeca'
  price: number
  arroba_basis: ArrobaBasis
  est_arrobas: number | null
  freight_by: 'comprador' | 'vendedor'
  freight_value: number | null
  payment: 'vista' | 'prazo'
  payment_days: number | null
  offer_date: string
  notes: string | null
}

export type OfferAnimal = {
  id: string
  code: string
  name?: string | null
  species: string
  sex: string
  birth_date?: string | null
  breed?: string | null
  is_breeder?: boolean | null
  is_fat?: boolean | null
  /** Peso vivo em @ do comércio (30 kg). */
  weight_arrobas?: number | null
  status?: string
}

export type OfferResult = {
  animals: OfferAnimal[]
  /** Animais sem peso no cadastro (entram pelo peso estimado). */
  noWeight: number
  /** Peso do lote na arroba da oferta; null quando falta peso. */
  arrobas: number | null
  gross: number | null
  funrural: number | null
  freight: number
  net: number | null
  netPerHead: number | null
  /** Referência de Goiás por cabeça (média do lote) e quantos animais tiveram referência. */
  refPerHead: number | null
  refCount: number
  /** % abaixo da referência, só quando passa de 15%. */
  belowPct: number | null
}

const carcassYield = (a: OfferAnimal, on: string) => {
  if (a.sex === 'M') return CARCASS_YIELD.macho
  const m = a.birth_date ? (new Date(on).getTime() - new Date(a.birth_date).getTime()) / 86_400_000 / 30.44 : null
  return m != null && m <= 36 ? CARCASS_YIELD.novilha : CARCASS_YIELD.vaca
}

/** Peso de um animal na arroba da oferta: @ vivo do cadastro (ou estimado); carcaça = vivo × 30 × rendimento ÷ 15. */
function arrobasOf(a: OfferAnimal, o: Pick<SaleOffer, 'arroba_basis' | 'est_arrobas' | 'offer_date'>): number | null {
  const live = a.weight_arrobas && a.weight_arrobas > 0 ? Number(a.weight_arrobas) : o.est_arrobas && o.est_arrobas > 0 ? Number(o.est_arrobas) : null
  if (live == null) return null
  return o.arroba_basis === 'carcaca' ? live * 2 * carcassYield(a, o.offer_date) : live
}

export function computeOffer(o: SaleOffer, byId: Map<string, OfferAnimal>, ifag: IfagPrices | null | undefined): OfferResult {
  const animals = o.animal_ids.map(id => byId.get(id)).filter((a): a is OfferAnimal => !!a)
  const n = Math.max(1, animals.length)
  const noWeight = animals.filter(a => !(a.weight_arrobas && a.weight_arrobas > 0)).length
  const weights = animals.map(a => arrobasOf(a, o))
  const arrobas = weights.every(w => w != null) ? weights.reduce((s, w) => s + (w ?? 0), 0) : null

  const gross = o.price_kind === 'cabeca' ? o.price * n : arrobas != null ? o.price * arrobas : null
  const funrural = gross != null ? gross * FUNRURAL_RATE : null
  const freight = o.freight_by === 'vendedor' ? Number(o.freight_value ?? 0) : 0
  const net = gross != null ? gross - (funrural ?? 0) - freight : null

  // Referência por animal: a mais branda (a mais baixa) das referências da venda, em R$ por cabeça.
  let refSum = 0
  let refCount = 0
  animals.forEach((a, i) => {
    const w = weights[i]
    const s = saleArroba(
      { sale_price: gross != null ? gross / n : 0, sale_date: o.offer_date, weight_kg: w, price_per_kg: o.price_kind === 'arroba' ? o.price : null, arroba_basis: o.arroba_basis },
      a,
      ifag,
    )
    const perHead = s.refs
      .map(r => (r.kind === 'cabeca' ? r.value : w != null ? r.value * w : null))
      .filter((v): v is number => v != null)
    if (perHead.length) {
      refSum += Math.min(...perHead)
      refCount++
    }
  })
  const refPerHead = refCount > 0 ? refSum / refCount : null
  // Compara o bruto por cabeça (o que o comprador paga) com a referência, como na venda.
  const gap = gross != null && refPerHead ? gross / n / refPerHead - 1 : null
  const belowPct = gap != null && gap < -BELOW_REFERENCE ? Math.round(-gap * 100) : null

  return {
    animals,
    noWeight,
    arrobas,
    gross,
    funrural,
    freight,
    net,
    netPerHead: net != null ? net / n : null,
    refPerHead,
    refCount,
    belowPct,
  }
}

/** Oferta ainda vale: tem 60 dias ou menos e todos os animais seguem no rebanho. */
export function isOpenOffer(o: SaleOffer, byId: Map<string, OfferAnimal>, today: string): boolean {
  const ageDays = (new Date(today + 'T12:00:00').getTime() - new Date(o.offer_date + 'T12:00:00').getTime()) / 86_400_000
  if (ageDays > OFFER_DAYS) return false
  return o.animal_ids.every(id => byId.get(id)?.status === 'ativo')
}

/** Ofertas pelo mesmo lote (mesmos animais) concorrem entre si: a de maior líquido fica marcada. */
export const lotKeyOf = (o: SaleOffer) => [...o.animal_ids].sort().join(',')

export function bestOffers(offers: SaleOffer[], results: Map<string, OfferResult>): Set<string> {
  const best = new Set<string>()
  const groups = new Map<string, SaleOffer[]>()
  for (const o of offers) groups.set(lotKeyOf(o), [...(groups.get(lotKeyOf(o)) ?? []), o])
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const withNet = group.filter(o => results.get(o.id)?.net != null)
    if (withNet.length < 2) continue
    const top = withNet.reduce((a, b) => (results.get(b.id)!.net! > results.get(a.id)!.net! ? b : a))
    best.add(top.id)
  }
  return best
}

/** Texto do pagamento: "à vista" ou "a prazo, N dias" (sem conta de juros, pedido do Tião). */
export const paymentText = (o: Pick<SaleOffer, 'payment' | 'payment_days'>) =>
  o.payment === 'vista' ? 'à vista' : o.payment_days ? `a prazo, ${o.payment_days} dias` : 'a prazo'
