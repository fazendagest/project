import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { UpcomingBirths } from '@/components/dashboard/upcoming-births'
import { LowStock } from '@/components/dashboard/low-stock'
import { PendingTasks, type PendingTask } from '@/components/dashboard/pending-tasks'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/helpers'
import { computeInvested } from '@/lib/investment'
import { computeHerdValue } from '@/lib/herd-value'
import { getIfagPrices } from '@/lib/ifag'
import { IFAG_SOURCE_URL } from '@/lib/market-reference'
import { ChevronRight, Droplet } from 'lucide-react'
import { format, startOfMonth, endOfMonth, differenceInMonths, parseISO } from 'date-fns'

/** Sem centavos, que é como o fazendeiro fala de preço de animal. */
function money(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function signedMoney(v: number) {
  return `${v > 0 ? '+' : ''}${money(v)}`
}

function tone(v: number): 'pos' | 'neg' | undefined {
  return v > 0 ? 'pos' : v < 0 ? 'neg' : undefined
}

function Row({ label, value, strong, tone, hint }: { label: string; value: string; strong?: boolean; tone?: 'pos' | 'neg'; hint?: string }) {
  const color = tone === 'pos' ? 'text-green-700' : tone === 'neg' ? 'text-red-700' : ''
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <p className={`tabular-nums whitespace-nowrap ${strong ? 'font-semibold' : ''} ${color}`}>{value}</p>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()

  if (!farmId) {
    return <div className="p-8 text-center text-muted-foreground">Inicializando fazenda...</div>
  }

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const yearStart = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd')
  const todayStr = format(now, 'yyyy-MM-dd')
  const year = now.getFullYear()
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long' })

  const [
    { data: animals },
    { data: farm },
    { data: costs },
    { data: feeds },
    { data: yearSales },
    { data: monthPurchases },
    { data: monthOpExpenses },
    { data: monthHealth },
    { data: milkToday },
    ifag,
  ] = await Promise.all([
    supabase.from('animals').select('id, code, name, species, sex, birth_date, breed, is_breeder, weight_arrobas, market_value, mother_id, status, entry_type, entry_date').eq('farm_id', farmId),
    supabase.from('farms').select('milk_active, area_hectares').eq('id', farmId).single(),
    supabase.from('animal_costs').select('animal_id, entry_date, sale_date, purchase_cost, health_cost').eq('farm_id', farmId),
    supabase.from('feed_stock').select('purchase_date, total_cost').eq('farm_id', farmId),
    supabase.from('animal_sales').select('animal_id, sale_price, sale_date').eq('farm_id', farmId).gte('sale_date', yearStart),
    supabase.from('animal_purchases').select('purchase_price').eq('farm_id', farmId).gte('purchase_date', monthStart).lte('purchase_date', monthEnd),
    supabase.from('operational_expenses').select('amount').eq('farm_id', farmId).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('health_records').select('cost').eq('farm_id', farmId).gte('application_date', monthStart).lte('application_date', monthEnd),
    supabase.from('milk_production').select('liters').eq('farm_id', farmId).eq('date', todayStr),
    getIfagPrices(),
  ])

  const allAnimals = animals ?? []
  const active = allAnimals.filter(a => a.status === 'ativo')
  const invested = computeInvested(costs ?? [], feeds ?? [])
  const herd = computeHerdValue(active, invested, ifag)
  const birthsYear = allAnimals.filter(a => a.entry_type === 'nascimento' && a.entry_date >= yearStart).length

  // Vendas do ano: lucro = valor da venda menos o que foi investido no animal.
  const sales = yearSales ?? []
  const soldTotal = sales.reduce((s, r) => s + Number(r.sale_price || 0), 0)
  const soldInvested = sales.reduce((s, r) => s + (invested[r.animal_id]?.total ?? 0), 0)
  const salesWithoutCost = sales.filter(r => (invested[r.animal_id]?.total ?? 0) === 0).length

  // Este mês: o que entrou e o que saiu.
  const monthIn = sales.filter(r => r.sale_date >= monthStart && r.sale_date <= monthEnd).reduce((s, r) => s + Number(r.sale_price || 0), 0)
  const monthFeed = (feeds ?? []).filter(f => f.purchase_date && f.purchase_date >= monthStart && f.purchase_date <= monthEnd).reduce((s, f) => s + Number(f.total_cost || 0), 0)
  const monthOut =
    (monthPurchases ?? []).reduce((s, r) => s + Number(r.purchase_price || 0), 0) +
    monthFeed +
    (monthOpExpenses ?? []).reduce((s, r) => s + Number(r.amount || 0), 0) +
    (monthHealth ?? []).reduce((s, r) => s + Number(r.cost || 0), 0)

  const milkActive = farm?.milk_active ?? false

  // O que falta completar (decisão de 11/11/2026, opção A): cada item some quando é resolvido.
  const nameOf = (a: { name?: string | null; code: string }) => a.name || a.code
  const monthsOld = (d?: string | null) => (d ? differenceInMonths(now, parseISO(d)) : null)
  const tasks: PendingTask[] = []
  const anyFeed = (feeds ?? []).some(f => Number(f.total_cost ?? 0) > 0)
  if (!anyFeed && active.some(a => a.species !== 'equino')) {
    tasks.push({
      key: 'custo-alimentacao',
      title: 'Lançar o que você compra de sal, milho e ração',
      detail: 'Até hoje nenhuma compra foi lançada. Sem isso, o lucro mostrado é maior do que o real.',
      href: '/app/feeding',
      action: 'Lançar compra',
    })
  }

  // Custo de manter o rebanho no mês (sem compra de animal), por cabeça.
  const monthUpkeep = monthOut - (monthPurchases ?? []).reduce((s, r) => s + Number(r.purchase_price || 0), 0)
  const upkeepPerHead = active.length > 0 ? monthUpkeep / active.length : 0

  // Lotação: animais por hectare. Referência do Inttegra: acima de 1,2 UA/ha (1 UA = 450 kg, perto de uma vaca adulta).
  const area = Number(farm?.area_hectares ?? 0)
  const perHa = area > 0 ? active.length / area : null
  if (area <= 0 || (perHa != null && perHa < 0.02)) {
    tasks.push({
      key: 'area-pasto',
      title: area > 0 ? `Corrigir a área de pasto (está ${area.toLocaleString('pt-BR')} ha)` : 'Informar a área de pasto',
      detail: 'Em hectares. 1 alqueire goiano = 4,84 ha. Serve para saber quanto gado ainda cabe no pasto.',
      href: '/app/settings',
      action: 'Corrigir em Configurações',
    })
  }
  const calvesNoMother = active.filter(a => a.species === 'bovino' && !a.mother_id && (monthsOld(a.birth_date) ?? 99) < 12)
  if (calvesNoMother.length > 0) {
    tasks.push({
      key: 'maes-bezerros',
      title: calvesNoMother.length === 1 ? `Escolher a mãe de ${nameOf(calvesNoMother[0])}` : `Escolher a mãe de ${calvesNoMother.length} bezerros`,
      detail: calvesNoMother.length > 1 ? calvesNoMother.map(nameOf).join(', ') : 'Assim o sistema sabe quais vacas estão parindo.',
      href: `/app/animals/${calvesNoMother[0].id}/edit`,
      action: calvesNoMother.length > 1 ? `Começar por ${nameOf(calvesNoMother[0])}` : 'Escolher a mãe',
    })
  }
  for (const m of active.filter(a => a.species === 'bovino' && a.sex === 'M' && !a.is_breeder && (monthsOld(a.birth_date) ?? 99) >= 12)) {
    tasks.push({
      key: `touro-${m.id}`,
      title: `${nameOf(m)} é touro ou boi?`,
      detail: 'Touro é o macho inteiro, que cobre as vacas. Boi é castrado, para engorda e venda.',
      href: `/app/animals/${m.id}/edit`,
      action: 'É touro: marcar',
      dismissLabel: 'É boi, está certo',
    })
  }
  const milkLiters = milkToday?.reduce((s, r) => s + (r.liters || 0), 0) ?? 0

  const sourceParts = [
    herd.counts.ifag > 0 && `${herd.counts.ifag} pelo preço do IFAG${herd.ifagDate ? ` de ${formatDate(herd.ifagDate)}` : ''}`,
    herd.counts.digitado > 0 && `${herd.counts.digitado} pelo valor que você digitou`,
    herd.counts.sem_preco > 0 && `${herd.counts.sem_preco} sem preço (fora da soma)`,
  ].filter(Boolean) as string[]

  return (
    <div>
      <PageHeader title="Dashboard" description="Quanto vale o rebanho e quanto você está ganhando" />
      <PendingTasks tasks={tasks} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 1. O rebanho hoje */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Seu rebanho hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Se vendesse hoje (estimado)</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{money(herd.total)}</p>
            <div className="divide-y mt-3">
              <Row label="Investido nesses animais" value={money(herd.invested)} hint="Compra, saúde e alimentação" />
              <Row
                label="Ganho no papel"
                value={signedMoney(herd.paperGain)}
                strong
                tone={tone(herd.paperGain)}
                hint="Só vira dinheiro quando vender"
              />
            </div>
            {sourceParts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {sourceParts.join(', ')}.{herd.workHorses > 0 && ` Cavalos de trabalho (${herd.workHorses}) não entram.`}
                {herd.counts.ifag > 0 && (
                  <> Preço do <a href={IFAG_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">IFAG</a>: média de Goiás, em Faina pode variar.</>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 2. Vendas do ano: o lucro de verdade */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Vendas em {year}</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhuma venda registrada este ano.</p>
            ) : (
              <>
                <div className="divide-y">
                  <Row label={`Vendido (${sales.length} ${sales.length === 1 ? 'animal' : 'animais'})`} value={money(soldTotal)} />
                  <Row label="Investido nesses animais" value={money(soldInvested)} />
                  <Row label="Lucro" value={signedMoney(soldTotal - soldInvested)} strong tone={tone(soldTotal - soldInvested)} />
                </div>
                {salesWithoutCost > 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-2.5 mt-3">
                    {salesWithoutCost === sales.length ? 'Nenhuma' : `${salesWithoutCost} de ${sales.length}`} {salesWithoutCost === 1 && salesWithoutCost !== sales.length ? 'venda não tem' : 'dessas vendas têm'} custo lançado.
                    {' '}O lucro real é menor do que o mostrado aqui.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 3. Onde está o dinheiro */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">
              {active.length} {active.length === 1 ? 'animal' : 'animais'}
              {birthsYear > 0 && <span className="font-normal text-muted-foreground">, {birthsYear} {birthsYear === 1 ? 'nasceu' : 'nasceram'} em {year}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`rounded-lg p-3 mb-2 text-sm ${perHa != null && perHa < 0.02 ? 'border border-amber-300 bg-amber-50' : 'bg-muted/40'}`}>
              {perHa != null && perHa < 0.02 ? (
                <p className="text-amber-800">
                  A área cadastrada é de {area.toLocaleString('pt-BR')}&nbsp;ha, o que parece um engano.
                  {' '}Confira em <Link href="/app/settings" className="underline underline-offset-2">Configurações</Link> (1 alqueire goiano = 4,84&nbsp;ha).
                </p>
              ) : perHa != null ? (
                <>
                  <p>
                    <span className="font-semibold tabular-nums">{perHa.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span> animal por hectare
                    <span className="text-muted-foreground tabular-nums"> ({active.length} em {area.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}&nbsp;ha)</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quem lucra com gado põe mais de 1,2 vaca adulta por hectare de pasto (Inttegra).
                    {perHa < 0.8 && ' Se a área for toda pasto, cabe mais gado sem comprar terra.'}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Informe a área de pasto em <Link href="/app/settings" className="underline underline-offset-2">Configurações</Link> para ver quantos animais o pasto carrega por hectare.
                </p>
              )}
            </div>
            <div className="divide-y">
              {herd.groups.map(g => (
                <Link key={g.key} href="/app/animals" className="flex items-center justify-between gap-3 py-2.5 min-h-11 hover:bg-muted/40 -mx-2 px-2 rounded-md">
                  <div className="min-w-0">
                    <p className="font-medium">{g.label} <span className="font-normal text-muted-foreground">({g.count})</span></p>
                    <p className="text-xs text-muted-foreground">
                      {g.excluded ? 'Trabalho, fora da soma' : g.missing > 0 ? `${g.missing} sem preço` : g.invested > 0 ? `Investido ${money(g.invested)}` : 'Sem custo lançado'}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 tabular-nums whitespace-nowrap">
                    {g.excluded ? '' : money(g.value)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Link>
              ))}
              {herd.groups.length === 0 && <p className="text-sm text-muted-foreground py-2">Nenhum animal cadastrado.</p>}
            </div>
          </CardContent>
        </Card>

        {/* 4. Este mês */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Em {monthName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              <Row label="Entrou (vendas)" value={money(monthIn)} />
              <Row label="Saiu (compras e gastos)" value={money(monthOut)} />
              <Row
                label="Custo por cabeça"
                value={money(upkeepPerHead)}
                hint={monthUpkeep > 0 ? 'Sal, ração, saúde e gastos, sem compra de animal' : 'Nada lançado. Lance sal, milho, vacina e caseiro.'}
              />
              <Row label="Saldo do mês" value={signedMoney(monthIn - monthOut)} strong tone={tone(monthIn - monthOut)} />
              {milkActive && (
                <div className="flex items-center justify-between py-2">
                  <p className="text-muted-foreground flex items-center gap-1.5"><Droplet className="h-4 w-4" /> Leite hoje</p>
                  <p className="tabular-nums">{milkToday && milkToday.length > 0 ? `${milkLiters.toFixed(1)} L` : 'sem registro'}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <UpcomingBirths farmId={farmId} />
        <LowStock farmId={farmId} />
      </div>

      <div className="hidden md:block mb-4">
        <DashboardCharts farmId={farmId} />
      </div>

      <RecentTransactions farmId={farmId} />
    </div>
  )
}
