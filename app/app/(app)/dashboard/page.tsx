import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { UpcomingBirths } from '@/components/dashboard/upcoming-births'
import { LowStock } from '@/components/dashboard/low-stock'
import type { PendingTask } from '@/components/dashboard/pending-tasks'
import { BruceloseCard } from '@/components/health/brucelose-card'
import { DineuvanCard } from '@/components/dashboard/dineuvan-card'
import { dineuvanTodo } from '@/lib/dineuvan-todo'
import { bruceloseStatus } from '@/lib/brucelose'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/helpers'
import { computeInvested, monthlyReturn, animalUA, uaGroup, UA_GROUP_LABELS, type UaGroup, BANK_MONTHLY, OUTSIDE_HERD_CATEGORY, FUNRURAL_RATE } from '@/lib/investment'
import { expandExpenses, sumExpensesInRange } from '@/lib/fixed-expenses'
import { computeHerdValue } from '@/lib/herd-value'
import { getIfagPrices } from '@/lib/ifag'
import { criaIndicators, criaCost, firstCalving, pregnancyLoss, CRIA_TARGETS } from '@/lib/cria'
import { CriaCard } from '@/components/dashboard/cria-card'
import { IFAG_SOURCE_URL, marketReference } from '@/lib/market-reference'
import { incomeInRange, isOnFarm, herdUA, type ThirdPartyHerd } from '@/lib/third-party'
import { ChevronRight, Droplet } from 'lucide-react'
import { format, startOfMonth, endOfMonth, differenceInMonths, differenceInDays, parseISO, subDays } from 'date-fns'

/** Sem centavos, que é como o fazendeiro fala de preço de animal. */
function money(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function signedMoney(v: number) {
  return `${v > 0 ? '+' : ''}${money(v)}`
}

/** Porcentagem com uma casa, com sinal quando pedido: +1,8%. */
function pct(v: number, signed = true) {
  const t = (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${signed && v > 0 ? '+' : ''}${t}%`
}

function tone(v: number): 'pos' | 'neg' | undefined {
  return v > 0 ? 'pos' : v < 0 ? 'neg' : undefined
}

function Row({ label, value, strong, tone, hint, warn }: { label: string; value: string; strong?: boolean; tone?: 'pos' | 'neg'; hint?: string; warn?: string }) {
  const color = tone === 'pos' ? 'text-green-700' : tone === 'neg' ? 'text-red-700' : ''
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {warn && <p className="text-xs font-medium text-amber-800">{warn}</p>}
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
    { data: allExpenses },
    { data: yearSales },
    { data: monthPurchases },
    { data: monthHealth },
    { data: milkToday },
    { data: pregnancyChecks },
    { data: reproRecords },
    { data: yearHealth },
    { data: thirdHerds },
    { data: yearPurchases },
    { data: bruceloseRecords },
    { data: declRow },
    { data: allSales },
    ifag,
    { data: pregnantChecks },
  ] = await Promise.all([
    supabase.from('animals').select('id, code, name, species, sex, birth_date, breed, is_breeder, is_fat, weight_arrobas, market_value, mother_id, status, entry_type, entry_date, death_date, death_cause, weaned_at, weaning_weight_kg').eq('farm_id', farmId),
    supabase.from('farms').select('milk_active, area_hectares, pasture_hectares').eq('id', farmId).single(),
    supabase.from('animal_costs').select('animal_id, entry_date, sale_date, purchase_cost, health_cost, species').eq('farm_id', farmId),
    supabase.from('feed_stock').select('purchase_date, total_cost, for_pigs').eq('farm_id', farmId),
    supabase.from('operational_expenses').select('*').eq('farm_id', farmId),
    supabase.from('animal_sales').select('animal_id, sale_price, sale_date, sale_reason').eq('farm_id', farmId).gte('sale_date', yearStart),
    supabase.from('animal_purchases').select('purchase_price').eq('farm_id', farmId).gte('purchase_date', monthStart).lte('purchase_date', monthEnd),
    supabase.from('health_records').select('cost').eq('farm_id', farmId).gte('application_date', monthStart).lte('application_date', monthEnd),
    supabase.from('milk_production').select('liters').eq('farm_id', farmId).eq('date', todayStr),
    supabase.from('pregnancy_checks').select('animal_id, exam_date, result').eq('farm_id', farmId).gte('exam_date', format(subDays(now, 365), 'yyyy-MM-dd')),
    supabase.from('reproduction_records').select('female_id, actual_birth_date, status').eq('farm_id', farmId),
    supabase.from('health_records').select('cost').eq('farm_id', farmId).gte('application_date', yearStart),
    supabase.from('third_party_herds').select('*').eq('farm_id', farmId),
    supabase.from('animal_purchases').select('purchase_price').eq('farm_id', farmId).gte('purchase_date', yearStart),
    supabase.from('health_records').select('animal_id, product_name, notes, cost, application_date').eq('farm_id', farmId),
    // Declaração de Rebanho marcada como feita (P7). Consulta à parte: sem a coluna, o painel continua de pé.
    supabase.from('farms').select('herd_declarations').eq('id', farmId).maybeSingle(),
    // Todas as vendas: data de saída da vaca e peso do bezerro vendido na desmama (P4).
    supabase.from('animal_sales').select('animal_id, sale_date, weight_kg, arroba_basis, buyer_name, price_per_kg').eq('farm_id', farmId),
    getIfagPrices(),
    // Todos os diagnósticos prenhes, para a perda entre prenhez e parto (P8 item 3).
    supabase.from('pregnancy_checks').select('animal_id, exam_date, result').eq('farm_id', farmId).eq('result', 'prenhe'),
  ])

  const allAnimals = animals ?? []
  const active = allAnimals.filter(a => a.status === 'ativo')
  const invested = computeInvested(costs ?? [], feeds ?? [], allExpenses ?? [], allAnimals)
  const herd = computeHerdValue(active, invested, ifag)
  const birthsYear = allAnimals.filter(a => a.entry_type === 'nascimento' && a.entry_date >= yearStart).length

  // Vendas do ano: lucro = valor da venda menos o que foi investido no animal.
  const sales = yearSales ?? []
  const soldTotal = sales.reduce((s, r) => s + Number(r.sale_price || 0), 0)
  const soldInvested = sales.reduce((s, r) => s + (invested[r.animal_id]?.total ?? 0), 0)
  const salesWithoutCost = sales.filter(r => (invested[r.animal_id]?.total ?? 0) === 0).length
  const ret = monthlyReturn(sales, costs ?? [], invested)

  // Este mês: o que entrou e o que saiu.
  const monthIn = sales.filter(r => r.sale_date >= monthStart && r.sale_date <= monthEnd).reduce((s, r) => s + Number(r.sale_price || 0), 0)
  const monthFeed = (feeds ?? []).filter(f => f.purchase_date && f.purchase_date >= monthStart && f.purchase_date <= monthEnd).reduce((s, f) => s + Number(f.total_cost || 0), 0)
  const monthOut =
    (monthPurchases ?? []).reduce((s, r) => s + Number(r.purchase_price || 0), 0) +
    monthFeed +
    sumExpensesInRange(allExpenses ?? [], monthStart, monthEnd, todayStr) +
    (monthHealth ?? []).reduce((s, r) => s + Number(r.cost || 0), 0)

  const milkActive = farm?.milk_active ?? false

  // O que falta completar (decisão de 11/11/2026, opção A): cada item some quando é resolvido.
  const nameOf = (a: { name?: string | null; code: string }) => a.name || a.code
  const monthsOld = (d?: string | null) => (d ? differenceInMonths(now, parseISO(d)) : null)
  const tasks: PendingTask[] = []
  const anyFeed = (feeds ?? []).some(f => !f.for_pigs && Number(f.total_cost ?? 0) > 0)
  if (!anyFeed && active.some(a => a.species !== 'equino')) {
    tasks.push({
      key: 'custo-alimentacao',
      title: 'Lançar o que você compra de sal, milho e ração',
      detail: 'Até hoje nenhuma compra foi lançada. Sem isso, o lucro mostrado é maior do que o real.',
      href: '/app/feeding',
      action: 'Lançar compra',
    })
  }

  // Despesas da fazenda (caseiro, energia, diesel): avisar quando nada foi lançado e lembrar das fixas do mês.
  const herdExpenses = expandExpenses((allExpenses ?? []).filter(e => e.category !== OUTSIDE_HERD_CATEGORY), todayStr)
  const recentCut = format(subDays(now, 60), 'yyyy-MM-dd')
  const anyRecentExpense = herdExpenses.some(e => e.date >= recentCut)
  // Custo que falta lançar: o investido fica menor que o real e o ganho no papel, maior.
  const missingCosts = [
    !anyFeed && 'sal, milho e ração',
    !anyRecentExpense && 'despesas da fazenda (caseiro, energia)',
  ].filter(Boolean) as string[]
  if (!anyRecentExpense) {
    tasks.push({
      key: 'despesas-fazenda',
      title: 'Lançar as despesas da fazenda',
      detail: 'Salário do caseiro, energia, água, diesel do trator, limpeza de pasto. O que você paga todo mês, marque "Pago todo mês" e diga desde quando: lança uma vez só e o sistema conta todo mês sozinho.',
      href: '/app/financial/movements',
      action: 'Lançar despesa',
    })
  }

  // A fazenda se pagou no ano? (Tião, P2, 11/11/2026): vendas do ano menos o custo de tocar a fazenda.
  // Compra de animal fica de fora (é investimento); "Fora dos animais" (casa, galinha) também.
  const yearFeed = (feeds ?? []).filter(f => f.purchase_date && f.purchase_date >= yearStart && f.purchase_date <= todayStr).reduce((s, f) => s + Number(f.total_cost || 0), 0)
  const yearFarmExpenses = sumExpensesInRange((allExpenses ?? []).filter(e => e.category !== OUTSIDE_HERD_CATEGORY), yearStart, todayStr, todayStr)
  const yearHealthCost = (yearHealth ?? []).reduce((s, r) => s + Number(r.cost || 0), 0)
  // Aluguel de pasto e acerto de parceria com gado de terceiros (Tião, P3) também pagam a fazenda.
  const herdsThird = (thirdHerds ?? []) as ThirdPartyHerd[]
  const yearRent = herdsThird.reduce((s, h) => s + incomeInRange(h, yearStart, todayStr), 0)
  // Caixa do gado no ano (Tião, revisão do P2): compra de animal conta como gasto, e o Funrural sai da venda.
  const yearFunrural = soldTotal * FUNRURAL_RATE
  const yearBought = (yearPurchases ?? []).reduce((s, r) => s + Number(r.purchase_price || 0), 0)
  const yearCosts = yearFeed + yearFarmExpenses + yearHealthCost
  const yearResult = soldTotal - yearFunrural + yearRent - yearBought - yearCosts
  const yearAnything = soldTotal > 0 || yearRent > 0 || yearBought > 0 || yearCosts > 0
  // Parceria acertada em bezerros: não é dinheiro, aparece à parte com o valor estimado pelo IFAG.
  const yearCalvesReceived = herdsThird
    .filter(h => h.deal_type === 'parceria' && h.settled_heads && h.exit_date && h.exit_date >= yearStart && h.exit_date <= todayStr)
    .reduce((s, h) => s + Number(h.settled_heads), 0)
  const calfRef = marketReference({ species: 'bovino', sex: 'M', birth_date: format(subDays(now, 240), 'yyyy-MM-dd'), breed: null }, ifag)
  const calvesValue = calfRef?.perHead ? yearCalvesReceived * calfRef.perHead : null

  // Animal que entrou por compra sem preço: o investido e o lucro dele ficam errados.
  const costById = new Map((costs ?? []).map(c => [c.animal_id, c]))
  const boughtNoPrice = active.filter(a => a.entry_type === 'compra' && Number(costById.get(a.id)?.purchase_cost ?? 0) === 0)

  // Custo de manter o rebanho no mês (sem compra de animal), por cabeça.
  const monthUpkeep = monthOut - (monthPurchases ?? []).reduce((s, r) => s + Number(r.purchase_price || 0), 0)
  const upkeepPerHead = active.length > 0 ? monthUpkeep / active.length : 0

  // Lotação em UA por hectare (Tião, P3): gado próprio pelo tamanho (UA), cavalo 1 UA (também come pasto),
  // porco fora (não pasta) e o gado de terceiros que está no pasto hoje. Referência do Inttegra: 1,2 UA/ha com pasto adubado; sem adubo, até 1,0.
  // Lotação por hectare de PASTO (Tião, revisão do P3); sem a área de pasto, usa a fazenda toda e avisa.
  const pastureArea = Number(farm?.pasture_hectares ?? 0)
  const usingTotalArea = pastureArea <= 0
  const area = usingTotalArea ? Number(farm?.area_hectares ?? 0) : pastureArea
  /** Acima disso o pasto pode faltar na seca (estimativa conservadora para pasto sem adubação, Tião). */
  const DRY_SEASON_ALERT_UA_HA = 1.0
  const mothersSet = new Set(allAnimals.map(a => a.mother_id).filter(Boolean) as string[])
  const grazing = active.filter(a => a.species !== 'suino')
  const ownUA = grazing.reduce((s, a) => s + animalUA(a, todayStr, mothersSet.has(a.id)), 0)
  // Soma por grupo, para o dono entender o número (Tião, teste do P3).
  const uaByGroup = new Map<UaGroup, { heads: number; ua: number }>()
  for (const a of grazing) {
    const g = uaGroup(a, todayStr, mothersSet.has(a.id))
    const cur = uaByGroup.get(g) ?? { heads: 0, ua: 0 }
    uaByGroup.set(g, { heads: cur.heads + 1, ua: cur.ua + animalUA(a, todayStr, mothersSet.has(a.id)) })
  }
  const uaParts = (Object.keys(UA_GROUP_LABELS) as UaGroup[])
    .filter(g => uaByGroup.has(g))
    .map(g => {
      const v = uaByGroup.get(g)!
      return `${v.heads}\u00a0${UA_GROUP_LABELS[g][v.heads === 1 ? 0 : 1]} ${v.ua.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}\u00a0UA`
    })
  const thirdOnFarm = herdsThird.filter(h => isOnFarm(h, todayStr))
  const thirdUA = thirdOnFarm.reduce((s, h) => s + herdUA(h), 0)
  const thirdHeads = thirdOnFarm.reduce((s, h) => s + h.head_count, 0)
  const totalUA = ownUA + thirdUA
  const perHa = area > 0 ? totalUA / area : null
  // Área de pasto vai para o cartão "Para ver com o Dineuvan" (P7).
  const pastureTitle = usingTotalArea || area <= 0 || (perHa != null && perHa < 0.02)
    ? (area > 0 && !usingTotalArea ? `Corrigir a área de pasto (está ${area.toLocaleString('pt-BR')} ha)` : 'Informar quanto da fazenda é pasto')
    : null
  const calvesNoMother = active.filter(a => a.species === 'bovino' && !a.mother_id && a.entry_type === 'nascimento' && (monthsOld(a.birth_date) ?? 99) < 12)
  if (calvesNoMother.length > 0) {
    tasks.push({
      key: `maes-bezerros-${calvesNoMother.map(a => a.id).sort().join('-')}`,
      title: calvesNoMother.length === 1 ? `Escolher a mãe de ${nameOf(calvesNoMother[0])}` : `Escolher a mãe de ${calvesNoMother.length} bezerros`,
      detail: `${calvesNoMother.length > 1 ? calvesNoMother.map(nameOf).join(', ') + '. ' : ''}Se nasceu aqui, escolha a mãe: vale também vaca já vendida ou morta. Se ${calvesNoMother.length > 1 ? 'algum foi comprado já bezerro, a mãe não está aqui: no cadastro dele, troque "Tipo de Entrada" para Compra' : 'foi comprado já bezerro, a mãe não está aqui: no cadastro, troque "Tipo de Entrada" para Compra'}.`,
      href: `/app/animals/${calvesNoMother[0].id}/edit`,
      action: calvesNoMother.length > 1 ? `Começar por ${nameOf(calvesNoMother[0])}` : 'Escolher a mãe',
      dismissLabel: calvesNoMother.length > 1 ? 'Foram comprados, sem mãe aqui' : 'Foi comprado, sem mãe aqui',
    })
  }
  // "Touro ou boi?" foi para o cartão "Para ver com o Dineuvan" (Tião, auditoria do 111e298).
  // Prenhez (pedido do Tião, 11/11/2026): último diagnóstico de cada vaca ou novilha ativa nos últimos 12 meses.
  const lastCheck = new Map<string, { exam_date: string; result: string }>()
  for (const c of pregnancyChecks ?? []) {
    const prev = lastCheck.get(c.animal_id)
    if (!prev || c.exam_date > prev.exam_date) lastCheck.set(c.animal_id, c)
  }
  // Partos conhecidos: filho cadastrado com a mãe e parto lançado em Reprodução.
  const calvings = new Map<string, string[]>()
  const calved = new Set<string>()
  const covered = new Set<string>()
  const addCalving = (id: string, date?: string | null) => {
    calved.add(id)
    if (date) calvings.set(id, [...(calvings.get(id) ?? []), date])
  }
  for (const a of allAnimals) if (a.mother_id) addCalving(a.mother_id, a.birth_date)
  for (const r of reproRecords ?? []) {
    covered.add(r.female_id)
    if (r.actual_birth_date || r.status === 'parida') addCalving(r.female_id, r.actual_birth_date)
  }
  // Entra na conta (Tião): vaca que já pariu, novilha com 20 meses ou mais, fêmea com cobertura lançada
  // ou já examinada. Sem data de nascimento entra, para não esconder vaca antiga.
  const HEIFER_MIN_MONTHS = 20
  const cowsAndHeifers = active.filter(a => a.species === 'bovino' && a.sex === 'F' && (
    calved.has(a.id) || covered.has(a.id) || lastCheck.has(a.id) || (monthsOld(a.birth_date) ?? 99) >= HEIFER_MIN_MONTHS
  ))
  // Vazia até 90 dias depois do parto é normal (Tião): sai da lista de avaliar venda.
  const RECENT_CALVING_DAYS = 90
  const lastCalvingBefore = (id: string, exam: string) => (calvings.get(id) ?? []).filter(d => d <= exam).sort().at(-1)
  const examined = cowsAndHeifers.filter(a => lastCheck.has(a.id))
  const pregnant = examined.filter(a => lastCheck.get(a.id)!.result === 'prenhe')
  const empty = examined.filter(a => lastCheck.get(a.id)!.result === 'vazia')
  const emptyToReview = empty
    .map(a => {
      const exam = lastCheck.get(a.id)!.exam_date
      return { a, exam, calving: lastCalvingBefore(a.id, exam) }
    })
    .filter(r => !r.calving || differenceInDays(parseISO(r.exam), parseISO(r.calving)) >= RECENT_CALVING_DAYS)
  const pregnancyRate = examined.length > 0 ? pregnant.length / examined.length : null
  // Índices da cria com a meta da fazenda (Tião, P4).
  const cria = criaIndicators(allAnimals, allSales ?? [], todayStr)
  // Idade ao primeiro parto e novilhas passadas da idade (Tião, P8 item 2).
  const firstCalf = firstCalving({ animals: allAnimals, calvings, calved, covered, checked: new Set(lastCheck.keys()), today: todayStr })
  // Perda entre prenhez e parto (Tião, P8 item 3): saída da vaca por venda ou morte.
  const exitDate = new Map<string, string>()
  for (const s of allSales ?? []) exitDate.set(s.animal_id, s.sale_date)
  for (const a of allAnimals) if (a.status === 'morto' && a.death_date) exitDate.set(a.id, a.death_date)
  const loss = pregnancyLoss({ checks: pregnantChecks ?? [], calvings, exitDate, today: todayStr })
  // Custo por vaca e por bezerro desmamado nos últimos 12 meses (Tião, P8 item 1).
  const costFrom = format(subDays(now, 365), 'yyyy-MM-dd')
  const bovineIds = new Set(allAnimals.filter(a => a.species === 'bovino').map(a => a.id))
  const cost = criaCost({
    feed: (feeds ?? []).filter(f => !f.for_pigs && f.purchase_date && f.purchase_date > costFrom && f.purchase_date <= todayStr).reduce((s, f) => s + Number(f.total_cost || 0), 0),
    expenses: sumExpensesInRange((allExpenses ?? []).filter(e => e.category !== OUTSIDE_HERD_CATEGORY), costFrom, todayStr, todayStr),
    health: (bruceloseRecords ?? []).filter(r => r.animal_id && bovineIds.has(r.animal_id) && r.application_date && r.application_date > costFrom && r.application_date <= todayStr).reduce((s, r) => s + Number(r.cost || 0), 0),
    cows: active.filter(a => a.species === 'bovino' && a.sex === 'F' && (monthsOld(a.birth_date) ?? 99) >= HEIFER_MIN_MONTHS).length,
    desmame: cria.desmame,
    calfPrice: calfRef?.perHead ?? null,
  })

  // O que só você resolve (P7; título trocado na revisão do Tião): o que só o dono resolve.
  const declaredPeriods = ((declRow as { herd_declarations?: string[] | null } | null)?.herd_declarations) ?? []
  const animalById = new Map(allAnimals.map(a => [a.id, a]))
  const todo = dineuvanTodo({
    today: todayStr,
    animals: allAnimals,
    checkedIds: new Set(lastCheck.keys()),
    health: bruceloseRecords ?? [],
    declaredPeriods,
    pastureTitle,
    boughtNoPrice,
    salesNoReason: sales.filter(r => !r.sale_reason).map(r => animalById.get(r.animal_id)).filter(Boolean) as { id: string; code: string; name?: string | null }[],
  })

  const milkLiters = milkToday?.reduce((s, r) => s + (r.liters || 0), 0) ?? 0

  const horses = herd.groups.find(g => g.key === 'cavalos' && g.count > 0)
  const sourceParts = [
    herd.counts.ifag > 0 && `${herd.counts.ifag} pelo preço do IFAG${herd.ifagDate ? ` de ${formatDate(herd.ifagDate)}` : ''}`,
    herd.counts.estimativa > 0 && `${herd.counts.estimativa} por estimativa (raça de leite, sem cotação oficial)`,
    herd.counts.digitado > 0 && `${herd.counts.digitado} pelo valor que você digitou`,
    herd.counts.sem_preco > 0 && `${herd.counts.sem_preco} sem preço (fora da soma)`,
  ].filter(Boolean) as string[]

  return (
    <div>
      <PageHeader title="Dashboard" description="Quanto vale o rebanho e quanto você está ganhando" />
      {/* Brucelose curta no topo (obrigação legal); os nomes ficam em Saúde. */}
      <BruceloseCard {...bruceloseStatus(allAnimals, bruceloseRecords ?? [], todayStr)} summary />
      {/* Uma lista só do que o dono resolve (Tião, revisão do sistema, item 1): custos que faltam primeiro. */}
      <DineuvanCard items={[...tasks.map(t => ({ ...t, detail: t.detail ?? '' })), ...todo]} farmId={farmId} declaredPeriods={declaredPeriods} />

      {/* Duas colunas, cada uma empilhada: o gado à esquerda, o dinheiro à direita. Sem buraco quando a altura muda. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-4 mb-4">
        <div className="space-y-4">
        {/* 1. O rebanho hoje */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Seu rebanho hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Se vendesse hoje (estimado)</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{money(herd.total)}</p>
            <div className="divide-y mt-3">
              <Row label="Investido nesses animais" value={money(herd.invested)} hint="Compra, saúde, alimentação e despesas da fazenda" />
              <Row
                label="Ganho no papel"
                value={signedMoney(herd.paperGain)}
                strong
                tone={missingCosts.length > 0 && herd.paperGain > 0 ? undefined : tone(herd.paperGain)}
                hint="Só vira dinheiro quando vender"
                warn={missingCosts.length > 0 ? `Pode ser menor: falta lançar ${missingCosts.join(' e ')}.` : undefined}
              />
              {horses && (
                <Row
                  label={`Cavalos de trabalho (${horses.count})`}
                  value={money(horses.value)}
                  hint={`Investido ${money(horses.invested)}.${horses.missing > 0 ? ` ${horses.missing} sem valor.` : ''} Fora da soma: são para trabalhar, não para vender.`}
                />
              )}
            </div>
            {sourceParts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {sourceParts.join(', ')}.
                {herd.counts.ifag > 0 && (
                  <> Preço do <a href={IFAG_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">IFAG</a>: média de Goiás, em Faina pode variar.</>
                )}
              </p>
            )}
            {herd.aboveReference > 0 && (
              <p className="text-sm font-medium text-amber-800 mt-2">
                {herd.aboveReference} {herd.aboveReference === 1 ? 'animal está' : 'animais estão'} com valor digitado mais de 20% acima da referência de Goiás.
                {' '}{herd.aboveReference === 1 ? 'Ele vale' : 'Eles valem'} {money(herd.aboveTyped)} pelo seu valor e {money(herd.aboveAtReference)} pela referência.{' '}
                <Link href="/app/animals" className="underline underline-offset-2">Ver na lista</Link>
              </p>
            )}
          </CardContent>
        </Card>

        {/* 3. Onde está o dinheiro */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">
              {active.length} {active.length === 1 ? 'animal' : 'animais'}
              {birthsYear > 0 && <span className="font-normal text-muted-foreground">, {birthsYear} {birthsYear === 1 ? 'nasceu' : 'nasceram'} em {year}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`rounded-lg p-3 mb-2 text-sm ${perHa != null && (perHa < 0.02 || perHa > DRY_SEASON_ALERT_UA_HA) ? 'border border-amber-300 bg-amber-50' : 'bg-muted/40'}`}>
              {perHa != null && perHa < 0.02 ? (
                <p className="text-amber-800">
                  A área cadastrada é de {area.toLocaleString('pt-BR')}&nbsp;ha, o que parece um engano.
                  {' '}Confira em <Link href="/app/settings" className="underline underline-offset-2">Configurações</Link> (1 alqueire goiano = 4,84&nbsp;ha).
                </p>
              ) : perHa != null ? (
                <>
                  <p>
                    <span className="font-semibold tabular-nums">{perHa.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span> UA por hectare
                    <span className="text-muted-foreground tabular-nums"> ({totalUA.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}&nbsp;UA em {area.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}&nbsp;ha{usingTotalArea ? '' : ' de pasto'})</span>
                  </p>
                  {perHa > DRY_SEASON_ALERT_UA_HA && (
                    <p className="text-amber-800 font-medium mt-1">Pasto pode faltar na seca: confira com o técnico antes de receber mais gado.</p>
                  )}
                  {usingTotalArea && (
                    <p className="text-xs text-amber-800 mt-1">
                      Conta com a fazenda toda: informe a área de pasto em{' '}
                      <Link href="/app/settings" className="underline underline-offset-2">Configurações</Link> para ficar certo.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground tabular-nums mt-1">
                    Seu gado: {ownUA.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}&nbsp;UA{uaParts.length > 0 ? ` (${uaParts.join('; ')})` : ''}.
                    {' '}De terceiros: {thirdHeads > 0 ? <>{thirdUA.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}&nbsp;UA ({thirdHeads} {thirdHeads === 1 ? 'cabeça' : 'cabeças'})</> : 'nenhum'}.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    1 UA é um animal de 450&nbsp;kg, perto de uma vaca adulta. Fazendas de cria bem manejadas, com pasto adubado, chegam a 1,2&nbsp;UA por hectare (Inttegra). Sem adubação, o seguro é até 1,0.
                    {perHa < 0.8 && ' Pelo número, cabe mais gado no pasto. Confira com o técnico se o capim está bom antes de receber mais.'}
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

        </div>

        <div className="space-y-4">
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
                {ret && (
                  <div className="rounded-lg border p-3 mt-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm">Rendeu ao mês</p>
                      <p className={`text-xl font-bold tabular-nums ${ret.rate >= BANK_MONTHLY ? 'text-green-700' : ret.rate < 0 ? 'text-red-700' : ''}`}>{pct(ret.rate)}</p>
                    </div>
                    <p className="text-sm mt-1">
                      {ret.rate >= BANK_MONTHLY
                        ? 'Rendeu mais do que deixar o dinheiro no banco'
                        : ret.rate >= 0
                          ? 'Rendeu menos do que deixar o dinheiro no banco'
                          : 'Perdeu dinheiro: no banco teria rendido'}{' '}
                      (cerca de {pct(BANK_MONTHLY, false)}{' '}ao mês).
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lucro dividido pelo dinheiro parado nos animais, em média {Math.round(ret.avgMonths)}{' '}{Math.round(ret.avgMonths) === 1 ? 'mês' : 'meses'} na fazenda.
                      {ret.skipped > 0 && ` ${ret.skipped} ${ret.skipped === 1 ? 'venda sem custo lançado ficou' : 'vendas sem custo lançado ficaram'} fora dessa conta.`}
                      {!anyFeed && ' Estimado: falta lançar a alimentação.'}
                    </p>
                  </div>
                )}
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

        {/* 2b. A fazenda se pagou no ano? */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">A fazenda se pagou em {year}?</CardTitle>
          </CardHeader>
          <CardContent>
            {!yearAnything ? (
              <p className="text-sm text-muted-foreground py-2">Nenhuma venda nem despesa lançada este ano.</p>
            ) : (
              <>
                <p className={`text-lg font-semibold ${missingCosts.length > 0 && yearResult > 0 ? '' : yearResult >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {yearResult < 0 ? 'Não: o caixa do gado ficou negativo' : missingCosts.length > 0 ? 'Por enquanto sim, mas falta lançar custo' : 'Sim: o caixa do gado ficou positivo'}
                </p>
                <div className="divide-y mt-1">
                  <Row
                    label="Caixa do gado no ano"
                    value={signedMoney(yearResult)}
                    strong
                    tone={missingCosts.length > 0 && yearResult > 0 ? undefined : tone(yearResult)}
                    warn={missingCosts.length > 0 && yearResult > 0 ? `Pode ser menor: falta lançar ${missingCosts.join(' e ')}.` : undefined}
                  />
                  <Row label="Vendas" value={money(soldTotal)} />
                  {soldTotal > 0 && <Row label="Funrural (estimado, 1,63% das vendas)" value={`-${money(yearFunrural)}`} />}
                  {yearRent > 0 && <Row label="Aluguel de pasto e parceria" hint="Gado de terceiros" value={money(yearRent)} />}
                  <Row label="Compra de animais" value={yearBought > 0 ? `-${money(yearBought)}` : money(0)} />
                  <Row
                    label="Custos"
                    hint={`Sal, milho e ração ${money(yearFeed)}; despesas da fazenda ${money(yearFarmExpenses)}; vacina e remédio ${money(yearHealthCost)}`}
                    value={yearCosts > 0 ? `-${money(yearCosts)}` : money(0)}
                  />
                </div>
                {herd.total > 0 && (
                  <div className="border-t mt-1">
                    <Row
                      label="Valor do rebanho hoje"
                      hint="Fora da conta. Se vendesse, pela média de Goiás ou o valor que você digitou: mostra que o dinheiro virou gado."
                      value={money(herd.total)}
                    />
                  </div>
                )}
                {yearCalvesReceived > 0 && (
                  <p className="text-sm mt-2">
                    Recebeu {yearCalvesReceived} {yearCalvesReceived === 1 ? 'bezerro' : 'bezerros'} na parceria
                    {calvesValue ? ` (valem cerca de ${money(calvesValue)}, média de Goiás pelo IFAG)` : ''}. Fora da soma: não é dinheiro.
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Comprar animal para o rebanho crescer conta como gasto neste cartão; o valor do rebanho aparece em{' '}
                  <Link href="/app/animals" className="underline underline-offset-2">Animais</Link>. Despesas marcadas &quot;Fora dos animais&quot; ficam fora.
                </p>
              </>
            )}
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
      </div>

      <CriaCard
        cria={cria}
        cost={cost}
        firstCalf={firstCalf}
        loss={loss}
        prenhez={pregnancyRate == null
          ? { value: null, missing: 'Nenhuma vaca ou novilha examinada nos últimos 12 meses. Lance o toque ou o ultrassom em Reprodução.' }
          : {
              value: pregnancyRate,
              detail: `${pregnant.length} de ${examined.length} ${examined.length === 1 ? 'examinada' : 'examinadas'}${cowsAndHeifers.length > examined.length ? `, ${cowsAndHeifers.length - examined.length} sem exame` : ''}`,
              belowTarget: pregnancyRate < CRIA_TARGETS.prenhez.target,
            }}
      />

      {/* Três cartões curtos numa fileira só (antes o Estoque Baixo ficava sozinho com meia tela vazia). */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* 5. Prenhez das vacas */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Prenhez das vacas</CardTitle>
          </CardHeader>
          <CardContent>
            {pregnancyRate == null ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma vaca ou novilha examinada nos últimos 12 meses. Peça ao veterinário o toque ou o ultrassom e lance o resultado em{' '}
                <Link href="/app/reproduction" className="underline underline-offset-2">Reprodução</Link>.
              </p>
            ) : (
              <>
                <p className="text-3xl font-bold tabular-nums">{Math.round(pregnancyRate * 100)}%</p>
                <p className="text-sm text-muted-foreground">
                  {pregnant.length} prenhe{pregnant.length === 1 ? '' : 's'} de {examined.length} examinada{examined.length === 1 ? '' : 's'}
                  {cowsAndHeifers.length > examined.length && `, ${cowsAndHeifers.length - examined.length} sem exame`}
                </p>
                {emptyToReview.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-900">Vazias: avaliar venda ({emptyToReview.length})</p>
                    <p className="text-xs text-amber-900 mb-1">Vaca vazia come o pasto sem dar bezerro. Decida com o veterinário.</p>
                    <ul className="divide-y divide-amber-200">
                      {emptyToReview.map(({ a, exam, calving }) => (
                        <li key={a.id}>
                          <Link href={`/app/animals/${a.id}`} className="flex items-center justify-between gap-3 py-2 min-h-11 text-sm hover:underline">
                            <span>
                              {nameOf(a)}{' '}
                              <span className="text-xs text-amber-900">
                                {calving
                                  ? `vazia em ${formatDate(exam)}, último parto em ${formatDate(calving)}`
                                  : `vazia em ${formatDate(exam)}: confira com o veterinário se ela pariu há pouco`}
                              </span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
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
