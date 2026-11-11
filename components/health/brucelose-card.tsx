import Link from 'next/link'
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

/** Aviso da vacina de brucelose (Tião, P6): some quando não há fêmea pendente. */
export function BruceloseCard({ due, late, bought = [] }: { due: BruceloseItem[]; late: BruceloseItem[]; bought?: BruceloseItem[] }) {
  if (due.length === 0 && late.length === 0 && bought.length === 0) return null
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
