/**
 * Avisos do rebanho na tela Animais (Tião, P6, 11/11/2026):
 * - bezerro com 7 meses ou mais: pronto para desmamar e vender (plano: vender na desmama os filhos de vaca de leite);
 * - vaca com 10 anos ou mais: avaliar o descarte no diagnóstico de gestação.
 */

export type AlertAnimal = {
  id: string
  code: string
  name?: string | null
  species: string
  sex: string
  birth_date?: string | null
  status: string
}

export type AlertItem = { id: string; label: string; months: number }

/** Bezerro a partir desta idade está pronto para desmamar. */
export const WEANING_MONTHS = 7
/** Até esta idade ainda é bezerro (depois vira garrote ou novilha e sai deste aviso). */
const CALF_MAX_MONTHS = 12
/** Vaca a partir desta idade: avaliar o descarte. */
export const OLD_COW_MONTHS = 120

function monthsAt(birth: string, today: string) {
  const b = new Date(birth + 'T12:00:00')
  const d = new Date(today + 'T12:00:00')
  return (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth()) - (d.getDate() < b.getDate() ? 1 : 0)
}

export function herdAlerts(animals: AlertAnimal[], today: string) {
  const weaning: AlertItem[] = []
  const oldCows: AlertItem[] = []
  for (const a of animals) {
    if (a.status !== 'ativo' || a.species !== 'bovino' || !a.birth_date) continue
    const m = monthsAt(a.birth_date, today)
    const item = { id: a.id, label: a.name || a.code, months: m }
    if (m >= WEANING_MONTHS && m <= CALF_MAX_MONTHS) weaning.push(item)
    else if (a.sex === 'F' && m >= OLD_COW_MONTHS) oldCows.push(item)
  }
  return { weaning, oldCows }
}
