import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrencyShort(value: number): string {
  const abs = Math.abs(value)
  const prefix = value < 0 ? '-R$ ' : 'R$ '
  if (abs >= 1_000_000) {
    return `${prefix}${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`
  }
  if (abs >= 1_000) {
    return `${prefix}${(abs / 1_000).toFixed(1).replace('.', ',')}k`
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
