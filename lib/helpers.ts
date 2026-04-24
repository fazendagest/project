import { differenceInMonths, differenceInYears, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Species } from '@/types'

export function calcAge(birthDate: string): string {
  const birth = parseISO(birthDate)
  const now = new Date()
  const years = differenceInYears(now, birth)
  const months = differenceInMonths(now, birth) % 12
  if (years === 0) return `${months} mes${months !== 1 ? 'es' : ''}`
  if (months === 0) return `${years} ano${years !== 1 ? 's' : ''}`
  return `${years} ano${years !== 1 ? 's' : ''} e ${months} mes${months !== 1 ? 'es' : ''}`
}

export function calcExpectedBirth(coverageDate: string, species: Species): string {
  const gestation: Record<Species, number> = {
    bovino: 283,
    equino: 340,
    suino: 114,
  }
  const date = parseISO(coverageDate)
  date.setDate(date.getDate() + gestation[species])
  return format(date, 'yyyy-MM-dd')
}

export function formatDate(date: string | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), fmt, { locale: ptBR })
  } catch {
    return '—'
  }
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function speciesLabel(species: string): string {
  const map: Record<string, string> = {
    bovino: 'Bovino',
    equino: 'Equino',
    suino: 'Suíno',
    geral: 'Geral',
  }
  return map[species] ?? species
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ativo: 'Ativo',
    vendido: 'Vendido',
    abatido: 'Abatido',
    morto: 'Morto',
  }
  return map[status] ?? status
}

export function healthTypeLabel(type: string): string {
  const map: Record<string, string> = {
    vacina: 'Vacina',
    vermifugacao: 'Vermifugação',
    medicamento: 'Medicamento',
    consulta: 'Consulta',
  }
  return map[type] ?? type
}

export function reproStatusLabel(status: string): string {
  const map: Record<string, string> = {
    coberta: 'Coberta',
    prenha: 'Prenha',
    parida: 'Parida',
    perdida: 'Perdida',
  }
  return map[status] ?? status
}

export function expenseCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    mao_de_obra: 'Mão de Obra',
    energia: 'Energia',
    manutencao: 'Manutenção',
    transporte: 'Transporte',
    equipamento: 'Equipamento',
    veterinario: 'Veterinário',
    outro: 'Outro',
  }
  return map[cat] ?? cat
}

export function sexLabel(sex: string): string {
  return sex === 'M' ? 'Macho' : 'Fêmea'
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    ativo: 'bg-green-100 text-green-800',
    vendido: 'bg-blue-100 text-blue-800',
    abatido: 'bg-orange-100 text-orange-800',
    morto: 'bg-red-100 text-red-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800'
}

export function monthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return format(date, 'MMM/yy', { locale: ptBR })
}

export function last12Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(format(d, 'yyyy-MM'))
  }
  return months
}
