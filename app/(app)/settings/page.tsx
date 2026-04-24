import { createClient } from '@/lib/supabase/server'
import { getFarmId, getOrCreateFarm } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { SettingsClient } from '@/components/settings/settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const farm = await getOrCreateFarm()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      <PageHeader title="Configurações" description="Dados da fazenda e conta" />
      <SettingsClient farm={farm} userEmail={user?.email ?? ''} />
    </div>
  )
}
