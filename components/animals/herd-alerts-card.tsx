import Link from 'next/link'
import type { AlertItem } from '@/lib/herd-alerts'

const age = (m: number) => (m >= 24 ? `${Math.floor(m / 12)} anos` : `${m} ${m === 1 ? 'mês' : 'meses'}`)

function List({ title, why, items }: { title: string; why: string; items: AlertItem[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="font-semibold">{title} ({items.length})</p>
      <p className="text-xs mt-0.5">{why}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map(a => (
          <li key={a.id}>
            <Link href={`/app/animals/${a.id}`} className="underline underline-offset-2">{a.label}</Link>, {age(a.months)}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Avisos do rebanho (Tião, P6): desmama e vaca velha. Some quando não há nada. */
export function HerdAlertsCard({ weaning, oldCows }: { weaning: AlertItem[]; oldCows: AlertItem[] }) {
  if (weaning.length === 0 && oldCows.length === 0) return null
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 mb-4 space-y-3">
      <List
        title="Pronto para desmamar e vender"
        why="Bezerro com 7 meses ou mais. O plano é vender na desmama os filhos das vacas de leite."
        items={weaning}
      />
      <List
        title="Vaca com 10 anos ou mais: avaliar descarte no diagnóstico"
        why="Vaca velha emprenha menos. Quando o veterinário fizer o toque, veja se vale vender."
        items={oldCows}
      />
    </div>
  )
}
