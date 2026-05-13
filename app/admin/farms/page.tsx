import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { FarmsTable } from './farms-table'

export const dynamic = 'force-dynamic'

export default async function AdminFarmsPage() {
  const admin = createAdminClient()

  const { data: farms } = await admin
    .from('farms')
    .select('id, name, owner_name, owner_id, city, state, plan, trial_ends_at, is_active, created_at')
    .order('created_at', { ascending: false })

  const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailByUserId = Object.fromEntries(users.map(u => [u.id, u.email ?? '']))

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
    </div>
  )
}
