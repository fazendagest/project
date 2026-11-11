// R$ por arroba na venda, com a referência de Goiás ao lado (Tião, P6 item 6, 11/11/2026).
// Sem dependência de servidor: usado na tela de Movimentações (cliente).
//
// Regras do Tião (auditoria do item 6):
// - Arroba sem resposta = peso vivo (@ do comércio, 30 kg vivos), que é como o Fazenda Gest guarda peso.
// - Animal marcado "Gordo": compara com a arroba do gado gordo (boi, novilha ou vaca) do IFAG.
// - Fêmea adulta (mais de 36 meses) sem "Gordo": duas referências, a vaca gorda levada para @ viva e a
//   vaca boiadeira mestiça GO da Scot por cabeça (a do item 5).
// - O resto (bezerro, garrote, novilha, boi magro): reposição por cabeça, na faixa de idade da data da venda.

import { CARCASS_YIELD, DAIRY_COW_REFERENCE, marketReference, normalize, isStale, type IfagPrices } from './market-reference'

/** De que é a arroba do peso da venda. Coluna animal_sales.arroba_basis. */
export type ArrobaBasis = 'carcaca' | 'vivo'

export const ARROBA_BASIS: Record<ArrobaBasis, { label: string; short: string; hint: string }> = {
  vivo: { label: 'Peso vivo', short: '@ vivo', hint: 'Balança do comprador: @ do comércio (30 kg vivos cada @).' },
  carcaca: { label: 'De carcaça', short: '@ de carcaça', hint: 'Frigorífico: paga pela carcaça (15 kg cada @).' },
}

/** Sem resposta, vale peso vivo (Tião, auditoria do item 6). */
export const DEFAULT_BASIS: ArrobaBasis = 'vivo'

/** Abaixo disso, a tela diz "Vendeu N% abaixo da referência de Goiás" (pista para o motivo da venda). */
export const BELOW_REFERENCE = 0.15

export type SaleRef = {
  /** 'arroba' compara com o R$ por @; 'cabeca' com o valor por animal. */
  kind: 'arroba' | 'cabeca'
  value: number
  /** Nome da referência com fonte e data, ex.: "vaca gorda, @ viva, IFAG 10/11". */
  label: string
  stale: boolean
}

export type SaleArroba = {
  /** R$ por @ que saiu (digitado ou valor ÷ peso). Null sem peso e sem preço por @. */
  perArroba: number | null
  basis: ArrobaBasis
  /** Valor por animal. */
  perHead: number
  refs: SaleRef[]
  /** Quanto ficou abaixo da referência mais próxima, em %, quando passa de 15%. */
  belowPct: number | null
}

type SaleAnimal = {
  species?: string | null
  sex?: string | null
  birth_date?: string | null
  breed?: string | null
  is_breeder?: boolean | null
  is_fat?: boolean | null
} | null | undefined

const monthsAt = (birth: string, on: string) => {
  const b = new Date(birth + 'T12:00:00'), d = new Date(on + 'T12:00:00')
  return (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth()) - (d.getDate() < b.getDate() ? 1 : 0)
}
/** "Mestiço Macho (0-12 Meses)" vira "Mestiço macho 0 a 12 meses", sem parênteses dentro do rótulo. */
const plainBand = (label: string) =>
  label.replace(/ \(([^)]*) Meses\)/, (_, b: string) => ` ${b.replace('-', ' a ').replace('Acima de', 'acima de')} meses`).replace(/ (Macho|Fêmea) /, (_, x: string) => ` ${x.toLowerCase()} `)
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export function saleArroba(
  s: { sale_price: number; sale_date: string; weight_kg?: number | null; price_per_kg?: number | null; arroba_basis?: string | null; animals?: number },
  animal: SaleAnimal,
  ifag: IfagPrices | null | undefined,
): SaleArroba {
  const n = Math.max(1, s.animals ?? 1)
  // weight_kg guarda arrobas (o nome da coluna engana). Venda de vários animais: o peso é o total do lote.
  const weight = s.weight_kg && s.weight_kg > 0 ? s.weight_kg : null
  const perArroba = s.price_per_kg && s.price_per_kg > 0 ? s.price_per_kg : weight ? (s.sale_price * n) / weight : null
  const basis: ArrobaBasis = s.arroba_basis === 'carcaca' ? 'carcaca' : DEFAULT_BASIS
  const perHead = s.sale_price
  const refs: SaleRef[] = []

  const months = animal?.birth_date ? monthsAt(animal.birth_date, s.sale_date) : null
  const female = animal?.sex === 'F'
  const adultFemale = female && (months == null || months > 36)
  const bovine = !animal?.species || animal.species === 'bovino'

  /** Arroba do gado gordo do IFAG, levada para a arroba da venda. */
  const fatRef = (kind: keyof typeof CARCASS_YIELD) => {
    const product = kind === 'macho' ? 'Boi Gordo - À vista' : kind === 'novilha' ? 'Novilha Gorda - À vista' : 'Vaca Gorda - À vista'
    const p = ifag?.prices.find(x => normalize(x.product) === normalize(product))
    if (!p) return
    const name = kind === 'macho' ? 'boi gordo' : kind === 'novilha' ? 'novilha gorda' : 'vaca gorda'
    const value = basis === 'vivo' ? p.avg * CARCASS_YIELD[kind] * 2 : p.avg
    refs.push({ kind: 'arroba', value: Math.round(value * 100) / 100, label: `${name}, ${basis === 'vivo' ? '@ viva' : '@ de carcaça'}, IFAG ${ddmm(p.quotedAt)}`, stale: isStale(p.quotedAt) })
  }

  if (bovine && animal?.is_fat) {
    fatRef(female ? (months != null && months <= 36 ? 'novilha' : 'vaca') : 'macho')
  } else if (bovine && adultFemale) {
    fatRef('vaca')
    refs.push({
      kind: 'cabeca',
      value: DAIRY_COW_REFERENCE.perHead,
      label: `vaca boiadeira mestiça GO, Scot ${ddmm(DAIRY_COW_REFERENCE.quotedAt)}`,
      stale: false,
    })
  } else if (animal) {
    // Reposição por cabeça, na idade do dia da venda (a cotação é a de hoje).
    const ref = marketReference({ ...animal, species: animal.species ?? 'bovino', sex: animal.sex ?? '', is_fat: false }, ifag, new Date(s.sale_date + 'T12:00:00'))
    if (ref?.perHead != null) {
      refs.push({ kind: 'cabeca', value: ref.perHead, label: `${plainBand(ref.label)}, ${ref.source === 'scot' ? 'Scot' : 'IFAG'} ${ddmm(ref.quotedAt)}`, stale: isStale(ref.quotedAt) })
    }
  }

  // Abaixo da referência mais próxima (a mais branda), só quando passa de 15%.
  const gaps = refs
    .map(r => (r.kind === 'arroba' ? (perArroba != null ? perArroba / r.value - 1 : null) : perHead > 0 ? perHead / r.value - 1 : null))
    .filter((g): g is number => g != null)
  const closest = gaps.length ? Math.max(...gaps) : null
  const belowPct = closest != null && closest < -BELOW_REFERENCE ? Math.round(-closest * 100) : null

  return { perArroba: perArroba != null ? Math.round(perArroba * 100) / 100 : null, basis, perHead, refs, belowPct }
}
