import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { FarmsTable } from './farms-table'
import { todaySP } from '@/lib/today'

export const dynamic = 'force-dynamic'

export default async function AdminFarmsPage() {
  const admin = createAdminClient()

  const { data: farms } = await admin
    .from('farms')
    .select('id, name, owner_name, owner_id, city, state, plan, trial_ends_at, is_active, created_at')
    .order('created_at', { ascending: false })

  const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailByUserId = Object.fromEntries(users.map(u => [u.id, u.email ?? '']))

  // Dias com acesso do dono nos últimos 30 (Tião, P11): para decidir depois se os avisos vão também por WhatsApp.
  const today = todaySP()
  const since = new Date(new Date(today + 'T12:00:00Z').getTime() - 29 * 86_400_000).toISOString().slice(0, 10)
  const { data: access } = await admin.from('farm_access_days').select('farm_id, day').gte('day', since).order('day')
  const daysByFarm = new Map<string, string[]>()
  for (const r of access ?? []) daysByFarm.set(r.farm_id, [...(daysByFarm.get(r.farm_id) ?? []), r.day])
  const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

  const farmsWithEmail = (farms ?? []).map(f => ({
    ...f,
    ownerEmail: emailByUserId[f.owner_id] ?? '',
  }))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fazendas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {farmsWithEmail.length} fazenda{farmsWithEmail.length !== 1 ? 's' : ''} cadastrada{farmsWithEmail.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/farms/new"
          className="inline-flex items-center gap-2 bg-[oklch(0.55_0.15_145)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[oklch(0.48_0.15_145)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Fazenda
        </Link>
      </div>

      <FarmsTable farms={farmsWithEmail} adminEmail={process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''} />

      <section className="rounded-xl border bg-white p-6" aria-labelledby="acessos-titulo">
        <h2 id="acessos-titulo" className="text-lg font-semibold text-gray-900">Dias com acesso do dono</h2>
        <p className="text-sm text-gray-600 mt-1">Últimos 30 dias, de {ddmm(since)} a {ddmm(today)}. Conta um dia quando o dono abre qualquer tela.</p>
        <ul className="mt-4 divide-y">
          {farmsWithEmail.map(f => {
            const days = daysByFarm.get(f.id) ?? []
            return (
              <li key={f.id} className="py-3">
                <p className="font-medium text-gray-900">{f.name}</p>
                <p className="text-sm text-gray-700">
                  Dias com acesso nos últimos 30: <span className="font-semibold tabular-nums">{days.length}</span>
                  {days.length > 0 && <span className="block text-gray-600 tabular-nums">{days.map(ddmm).join(', ')}</span>}
                </p>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
