// P5 do Tião (11/11/2026, confirmado pelo Henrique com «A»): vaca de raça de leite vira matriz de cruzamento,
// todo filho dela é vendido na desmama. Detalhe em contexto/p5-raca-de-leite.md.
// Sem dependência de servidor: usado no cadastro (cliente) e nas listas.

import { isDairyBreed } from './market-reference'

export type HerdRole = 'reposicao' | 'cruzamento' | 'descarte'
export type CalfDestination = 'venda' | 'reposicao'

export const HERD_ROLES: Record<HerdRole, { label: string; short: string; hint: string }> = {
  reposicao: { label: 'Matriz de reposição', short: 'Reposição', hint: 'As melhores bezerras dela ficam no rebanho.' },
  cruzamento: { label: 'Matriz de cruzamento', short: 'Cruzamento', hint: 'Todo filho dela é vendido na desmama; nenhuma bezerra fica.' },
  descarte: { label: 'Descarte (vender)', short: 'Descarte', hint: 'Vazia, velha ou com problema: sai na próxima venda.' },
}

export const CALF_DESTINATIONS: Record<CalfDestination, { label: string; short: string }> = {
  venda: { label: 'Venda na desmama', short: 'Venda' },
  reposicao: { label: 'Reposição (fica no rebanho)', short: 'Reposição' },
}

/** Raças da cobertura e da inseminação (P5: Angus ou Nelore; o sêmen das vacas de leite ainda não foi decidido). */
export const SIRE_BREEDS = ['Angus', 'Nelore', 'Gir', 'Girolando', 'Outra'] as const

const DAY = 86_400_000
export const monthsOld = (birth?: string | null, today = new Date()) =>
  birth ? Math.floor((today.getTime() - new Date(birth + 'T12:00:00').getTime()) / DAY / 30.44) : null

type RoleAnimal = {
  species: string
  sex?: string
  birth_date?: string | null
  breed?: string | null
  herd_role?: string | null
  to_discard?: boolean | null
}

/** Fêmea bovina adulta: 24 meses ou mais, ou sem data de nascimento. */
export function isAdultFemale(a: RoleAnimal, today = new Date()) {
  if (a.species !== 'bovino' || a.sex !== 'F') return false
  const m = monthsOld(a.birth_date, today)
  return m == null || m >= 24
}

/**
 * Bezerro com menos de 12 meses: tem destino (venda na desmama ou reposição). Depois disso a novilha que ficou
 * já é reposição e o garrote já tem outro caminho (touro, boi ou venda), então não leva mais esse rótulo.
 */
export function isYoungBovine(a: RoleAnimal, today = new Date()) {
  if (a.species !== 'bovino') return false
  const m = monthsOld(a.birth_date, today)
  return m != null && m < 12
}

/** Padrão pela raça: leite (Gir, Gir Leiteiro, Girolando, Holandês, Jersey e mestiças de leite) → cruzamento. */
export const defaultRole = (breed?: string | null): Exclude<HerdRole, 'descarte'> => (isDairyBreed(breed) ? 'cruzamento' : 'reposicao')

/** Papel valendo: descarte pela marcação antiga, senão o escolhido, senão o padrão pela raça. */
export function effectiveRole(a: RoleAnimal): HerdRole {
  if (a.to_discard) return 'descarte'
  return a.herd_role === 'reposicao' || a.herd_role === 'cruzamento' ? a.herd_role : defaultRole(a.breed)
}

/**
 * Destino padrão do bezerro: filho de matriz de cruzamento ou de vaca de leite → venda. Macho → venda (cria vende
 * o bezerro). Bezerra de matriz de reposição → reposição (as melhores ficam; o dono troca as que vão vender).
 */
export function defaultDestination(calf: { sex: string }, mother?: RoleAnimal | null): CalfDestination {
  if (calf.sex === 'M') return 'venda'
  if (!mother) return 'reposicao'
  if (isDairyBreed(mother.breed)) return 'venda'
  return effectiveRole(mother) === 'cruzamento' ? 'venda' : 'reposicao'
}

export function effectiveDestination(calf: { sex: string; calf_destination?: string | null }, mother?: RoleAnimal | null): CalfDestination {
  return calf.calf_destination === 'venda' || calf.calf_destination === 'reposicao' ? calf.calf_destination : defaultDestination(calf, mother)
}

/** Raça pura de leite ou de corte (não é cruzada nem mestiça). */
const isPure = (breed: string) => !/girolando|mesti|cruzad|\bf1\b|×|\bx\b/i.test(breed)
/** "Gir Leiteiro" vira "Gir" no nome do cruzamento. */
const shortBreed = (breed: string) => breed.replace(/\s+leiteir[oa]$/i, '').trim()

/**
 * Nome da raça do bezerro pelo pai e pela mãe (P5 e P6 item 11):
 * mãe pura de outra raça → "F1 Angus × Gir"; mãe cruzada (Girolando, mestiça) → "Cruzado Angus × Girolando";
 * mesma raça → a raça. Null quando falta a raça de um dos dois.
 */
export function calfBreedName(motherBreed?: string | null, sireBreed?: string | null) {
  const m = motherBreed?.trim(), s = sireBreed?.trim()
  if (!m || !s || s === 'Outra') return null
  if (shortBreed(m).toLowerCase() === shortBreed(s).toLowerCase()) return m
  return isPure(m) ? `F1 ${s} × ${shortBreed(m)}` : `Cruzado ${s} × ${m}`
}
