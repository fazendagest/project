import { createAdminClient } from '@/lib/supabase/admin'
import { Building2, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border p-6 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { count: total },
    { count: active },
    { count: trial },
    { count: recent },
  ] = await Promise.all([
    admin.from('farms').select('*', { count: 'exact', head: true }),
    admin.from('farms').select('*', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('farms').select('*', { count: 'exact', head: true }).eq('plan', 'trial'),
    admin
      .from('farms')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  const { data: recentFarms } = await admin
    .from('farms')
    .select('id, name, owner_name, city, state, plan, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total de Fazendas"
          value={total ?? 0}
          icon={Building2}
          color="bg-blue-500"
        />
        <StatCard
          title="Fazendas Ativas"
          value={active ?? 0}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Em Trial"
          value={trial ?? 0}
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Últimos 30 dias"
          value={recent ?? 0}
          icon={TrendingUp}
          color="bg-purple-500"
        />
      </div>

      <div className="bg-white rounded-xl border">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold">Cadastros Recentes</h2>
          <Link
            href="/admin/farms"
            className="text-sm text-blue-600 hover:underline"
          >
            Ver todas
          </Link>
        </div>
        <div className="divide-y">
          {recentFarms?.map(farm => (
            <div key={farm.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{farm.name}</p>
                <p className="text-xs text-gray-500">
                  {farm.owner_name ?? '—'} · {farm.city && farm.state ? `${farm.city}/${farm.state}` : (farm.city ?? farm.state ?? '—')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  farm.plan === 'trial' ? 'bg-amber-100 text-amber-700' :
                  farm.plan === 'básico' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {farm.plan}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  farm.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {farm.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
          {(!recentFarms || recentFarms.length === 0) && (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              Nenhuma fazenda cadastrada ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
