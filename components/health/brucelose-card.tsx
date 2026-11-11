import Link from 'next/link'
import type { BruceloseItem } from '@/lib/brucelose'

const age = (m: number) => `${m} ${m === 1 ? 'mês' : 'meses'}`

/** Aviso da vacina de brucelose (Tião, P6): some quando não há bezerra pendente. */
export function BruceloseCard({ due, late }: { due: BruceloseItem[]; late: BruceloseItem[] }) {
  if (due.length === 0 && late.length === 0) return null
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 mb-4">
      <p className="font-semibold text-base">Vacina de brucelose (obrigatória em Goiás)</p>
      <p className="mt-1">Toda bezerra de 3 a 8 meses precisa da vacina, aplicada pelo veterinário, com atestado no SIDAGO (o sistema da Agrodefesa).</p>
      {due.length > 0 && (
        <div className="mt-3">
          <p className="font-medium">Vacinar agora ({due.length})</p>
          <ul className="mt-1 space-y-1">
            {due.map(a => (
              <li key={a.id}>
                <Link href={`/app/animals/${a.id}`} className="underline underline-offset-2">{a.label}</Link>, {age(a.months)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {late.length > 0 && (
        <div className="mt-3">
          <p className="font-medium">Passou da idade da vacina comum: fale com o veterinário ({late.length})</p>
          <ul className="mt-1 space-y-1">
            {late.map(a => (
              <li key={a.id}>
                <Link href={`/app/animals/${a.id}`} className="underline underline-offset-2">{a.label}</Link>, {age(a.months)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs">Depois de vacinar, lance em Saúde com o nome da vacina (ex.: Brucelose B19). O nome sai daqui sozinho.</p>
    </div>
  )
}
