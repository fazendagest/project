/**
 * Vacina de brucelose, obrigatória em Goiás para bezerras de 3 a 8 meses (Tião, P6, 11/11/2026).
 * A bezerra que passou dos 8 meses sem registro não toma mais a vacina comum: é caso para o veterinário.
 * Conta como vacinada a fêmea que tem em Saúde um registro com "brucel", "B19" ou "RB51" no produto.
 */

export type BruceloseAnimal = {
  id: string
  code: string
  name?: string | null
  species: string
  sex: string
  birth_date?: string | null
  status: string
  entry_type?: string | null
}

export type BruceloseRecord = { animal_id: string; product_name: string | null }

/** Produto que é vacina de brucelose. */
export const isBruceloseProduct = (p?: string | null) => !!p && /brucel|b-?19|rb-?51/i.test(p)

const DAY = 86_400_000
const ageDays = (birth: string, today: string) =>
  Math.floor((new Date(today + 'T12:00:00').getTime() - new Date(birth + 'T12:00:00').getTime()) / DAY)

/** 3 meses e 8 meses em dias (o mês médio tem 30,44 dias). */
const FROM_DAYS = 91
const UNTIL_DAYS = 243
/** Depois disso a fêmea já não é bezerra e o caso é de outro controle (Tião: só bezerras e novilhas novas). */
const LATE_LIMIT_DAYS = 730

export type BruceloseItem = { id: string; label: string; months: number }

export function bruceloseStatus(animals: BruceloseAnimal[], records: BruceloseRecord[], today: string) {
  const vaccinated = new Set(records.filter(r => isBruceloseProduct(r.product_name)).map(r => r.animal_id))
  const due: BruceloseItem[] = []
  const late: BruceloseItem[] = []
  for (const a of animals) {
    if (a.status !== 'ativo' || a.species !== 'bovino' || a.sex !== 'F' || !a.birth_date || vaccinated.has(a.id)) continue
    const d = ageDays(a.birth_date, today)
    const item = { id: a.id, label: a.name || a.code, months: Math.floor(d / 30.44) }
    if (d >= FROM_DAYS && d <= UNTIL_DAYS) due.push(item)
    // Passou da idade: só as nascidas aqui (a comprada pode ter sido vacinada antes, sem registro aqui).
    else if (d > UNTIL_DAYS && d <= LATE_LIMIT_DAYS && a.entry_type === 'nascimento') late.push(item)
  }
  return { due, late }
}
