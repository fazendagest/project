import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { BruceloseItem } from '@/lib/brucelose'

const age = (m: number) => (m >= 24 ? `${Math.floor(m / 12)} anos` : `${m} ${m === 1 ? 'mês' : 'meses'}`)

/** Mostra até 8 nomes e um "e mais N" (Tião, auditoria do 9fcdca6). */
const MAX_NAMES = 8

function Names({ items }: { items: BruceloseItem[] }) {
  const rest = items.length - MAX_NAMES
  return (
    <ul className="mt-1 space-y-1">
      {items.slice(0, MAX_NAMES).map(a => (
        <li key={a.id}>
          <Link href={`/app/animals/${a.id}`} className="underline underline-offset-2">{a.label}</Link>, {age(a.months)}
        </li>
      ))}
      {rest > 0 && <li>e mais {rest}</li>}
    </ul>
  )
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Aviso da vacina de brucelose (Tião, P6): some quando não há fêmea pendente.
 * summary: no Dashboard só as contagens e o link; os nomes ficam em Saúde (Tião, revisão do sistema, item 1).
 */
export function BruceloseCard({ due, late, bought = [], summary = false }: { due: BruceloseItem[]; late: BruceloseItem[]; bought?: BruceloseItem[]; summary?: boolean }) {
  if (due.length === 0 && late.length === 0 && bought.length === 0) return null
  if (summary) {
    const parts = [
      due.length > 0 && `${plural(due.length, 'bezerra', 'bezerras')} para vacinar agora`,
      late.length > 0 && `${plural(late.length, 'bezerra passou', 'bezerras passaram')} da idade`,
      bought.length > 0 && `${plural(bought.length, 'comprada', 'compradas')} sem atestado`,
    ].filter(Boolean) as string[]
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="font-semibold text-base">Vacina de brucelose (obrigatória em Goiás)</p>
          <p className="mt-1">{parts.join(', ')}.</p>
        </div>
        <Link href="/app/health" className="sm:flex-none">
          <Button className="h-11 md:h-9 w-full">Ver em Saúde</Button>
        </Link>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 mb-4">
      <p className="font-semibold text-base">Vacina de brucelose (obrigatória em Goiás)</p>
      <p className="mt-1">Toda bezerra de 3 a 8 meses precisa da vacina, aplicada pelo veterinário, com atestado no SIDAGO (o sistema da Agrodefesa).</p>
      {due.length > 0 && (
        <div className="mt-3">
          <p className="font-medium">Vacinar agora ({due.length})</p>
          <Names items={due} />
        </div>
      )}
      {late.length > 0 && (
        <div className="mt-3">
          <p className="font-medium">Passou da idade da vacina comum: fale com o veterinário ({late.length})</p>
          <Names items={late} />
        </div>
      )}
      {bought.length > 0 && (
        <div className="mt-3">
          <p className="font-medium">Comprada sem atestado lançado ({bought.length})</p>
          <p className="text-xs mt-0.5">Peça ao vendedor o atestado da vacina (ou confira no SIDAGO) e lance em Saúde. Sem ele, ela fica presa na hora de vender ou transportar.</p>
          <Names items={bought} />
        </div>
      )}
      <p className="mt-3 text-xs">Depois de vacinar, lance em Saúde com o nome da vacina (ex.: Brucelose B19). O nome sai daqui sozinho.</p>
    </div>
  )
}
