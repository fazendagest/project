/**
 * "Para ver com o Dineuvan" (pedido do Henrique pelo Tião, P7, 11/11/2026): o que só o dono resolve.
 * Cada item sai sozinho quando o dado é lançado. A brucelose tem cartão próprio e não entra aqui.
 */

export type TodoAnimal = {
  id: string
  code: string
  name?: string | null
  species: string
  sex: string
  birth_date?: string | null
  breed?: string | null
  is_breeder?: boolean | null
  is_fat?: boolean | null
  status: string
}

export type TodoItem = {
  key: string
  title: string
  detail: string
  href: string
  action: string
  /** Resposta "está certo assim", guardada neste aparelho (mesma lista de "Falta completar"). */
  dismissLabel?: string
  /** Declaração de Rebanho: período ('2026-11') que o botão "Já fiz" grava. */
  declarationPeriod?: string
  /** "Por que fazer?" que abre e fecha, com a fonte em letra pequena. */
  why?: { paragraphs: string[]; source?: string }
}

/** Texto do Tião (pedido do Henrique, 11/11/2026). Conta da GTA conferida: 18,07 + 4 × 0,38 = 19,59. */
const DECLARATION_WHY = {
  paragraphs: [
    'É o cadastro do seu gado no governo de Goiás (Agrodefesa). Serve para controlar doenças como brucelose, tuberculose e aftosa: se aparece uma doença na região, é por ele que sabem quais fazendas olhar. É feita duas vezes por ano, em maio e em novembro, e não tem custo.',
    'Sem ela, a GTA fica bloqueada e pode vir multa. A GTA é o documento que o animal leva sempre que sai da fazenda: venda, leilão, frigorífico ou outro pasto. Sem GTA, o gado pode ser apreendido na estrada, e o frigorífico e o leilão não recebem.',
    'A GTA custa pouco: R$ 18,07 por caminhão mais R$ 0,38 por cabeça na venda para criador ou leilão, ou R$ 2,26 por cabeça para o frigorífico (tabela da Agrodefesa, 2026). Exemplo: 4 bezerros num caminhão dão uns R$ 19,59.',
    'Como fazer: pela internet, no SIDAGO, ou numa unidade da Agrodefesa. Não vale mandar por WhatsApp nem por e-mail. Outra pessoa só pode fazer por você com procuração no SIDAGO.',
  ],
  source: 'Fontes: Agrodefesa, Portaria 173/2026 e tabela de taxas 2026.',
}

const DAY = 86_400_000
const monthsOld = (birth: string | null | undefined, today: string) =>
  birth ? Math.floor((new Date(today + 'T12:00:00').getTime() - new Date(birth + 'T12:00:00').getTime()) / DAY / 30.44) : null

/** Idade a partir da qual a fêmea entra no diagnóstico e o macho inteiro precisa do exame (Tião). */
const MIN_MONTHS = 18
/** Até quantos nomes aparecem no texto; o resto vira "e mais N". */
const MAX_NAMES = 8
const isAndrological = (s?: string | null) => !!s && /androl/i.test(s)

const nameOf = (a: { name?: string | null; code: string }) => a.name || a.code
function names(list: { name?: string | null; code: string }[]) {
  const shown = list.slice(0, MAX_NAMES).map(nameOf).join(', ')
  return list.length > MAX_NAMES ? `${shown} e mais ${list.length - MAX_NAMES}` : shown
}

/**
 * Declaração de Rebanho no SIDAGO: campanhas de maio (prazo 31/05) e de novembro (prazo 30/11).
 * Sem o "Já fiz", o aviso fica até 31/07 e 31/01, porque a Agrodefesa costuma prorrogar
 * e o gado sem declaração fica preso (Tião, auditoria do 111e298).
 */
export function declarationPeriod(today: string): { period: string; deadline: string; late: boolean } | null {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  if (month >= 5 && month <= 7) return { period: `${year}-05`, deadline: '31/05', late: month > 5 }
  if (month === 11 || month === 12) return { period: `${year}-11`, deadline: '30/11', late: month === 12 }
  if (month === 1) return { period: `${year - 1}-11`, deadline: '30/11', late: true }
  return null
}

/** Próxima aplicação: avisa 7 dias antes; vencida há mais de 60 dias sai da lista (Ravi, a validar com o Tião). */
const REPEAT_AHEAD_DAYS = 7
const REPEAT_STALE_DAYS = 60
const normProduct = (s?: string | null) => (s ?? '').trim().toLowerCase()
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const addDaysIso = (iso: string, days: number) => new Date(new Date(iso + 'T12:00:00').getTime() + days * DAY).toISOString().slice(0, 10)

const REPEAT_WHY = {
  paragraphs: [
    'Você marcou esta data como a próxima aplicação quando lançou em Saúde. Repetir no dia certo é o que mantém o gado protegido.',
    'O aviso some quando a nova aplicação do mesmo produto é lançada no animal. Se não vai repetir, apague a data da próxima no lançamento. Em dúvida, pergunte ao veterinário.',
  ],
}

/**
 * P11 B7 (Tião): vacina ou remédio com "Próxima aplicação" vencida ou nos próximos 7 dias.
 * Resolvido quando há aplicação do mesmo produto no mesmo animal depois da anterior.
 * Um item por produto e data, com os animais juntos.
 */
export function repeatItems(
  health: { animal_id: string; product_name?: string | null; application_date?: string | null; next_due_date?: string | null }[],
  animals: TodoAnimal[],
  today: string,
): TodoItem[] {
  const byId = new Map(animals.map(a => [a.id, a]))
  const lastByKey = new Map<string, string>()
  for (const h of health) {
    if (!h.application_date) continue
    const k = `${h.animal_id}|${normProduct(h.product_name)}`
    if ((lastByKey.get(k) ?? '') < h.application_date) lastByKey.set(k, h.application_date)
  }
  const limit = addDaysIso(today, REPEAT_AHEAD_DAYS)
  const stale = addDaysIso(today, -REPEAT_STALE_DAYS)
  const groups = new Map<string, { product: string; due: string; list: TodoAnimal[] }>()
  for (const h of health) {
    const due = h.next_due_date
    if (!due || !h.application_date || !h.product_name?.trim() || due > limit || due < stale) continue
    const a = byId.get(h.animal_id)
    if (!a || a.status !== 'ativo') continue
    if ((lastByKey.get(`${h.animal_id}|${normProduct(h.product_name)}`) ?? '') > h.application_date) continue
    const k = `${normProduct(h.product_name)}|${due}`
    const g = groups.get(k) ?? { product: h.product_name.trim(), due, list: [] }
    if (!g.list.some(x => x.id === a.id)) g.list.push(a)
    groups.set(k, g)
  }
  return [...groups.values()]
    .sort((x, y) => x.due.localeCompare(y.due))
    .map(g => {
      const late = g.due < today
      return {
        key: `repetir-${normProduct(g.product)}-${g.due}`,
        title: `Repetir ${g.product} em ${g.list.length === 1 ? nameOf(g.list[0]) : `${g.list.length} animais`}, ${late ? 'era dia' : 'dia'} ${ddmm(g.due)}`,
        detail: `${late ? 'Passou do dia. ' : ''}${g.list.length > 1 ? `${names(g.list)}. ` : ''}Quando aplicar, lance em Saúde.`,
        href: '/app/health',
        action: 'Lançar em Saúde',
        why: REPEAT_WHY,
      }
    })
}

/** Parto atrasado: avisa 20 dias depois da data prevista; depois de 180 dias sai (Ravi, a validar com o Tião). */
const LATE_BIRTH_DAYS = 20
const LATE_BIRTH_STALE_DAYS = 180
/** Bezerro nascido até 60 dias antes da data prevista conta como esse parto (a previsão erra). */
const BIRTH_EARLY_DAYS = 60

const LATE_BIRTH_WHY = {
  paragraphs: [
    'A data prevista saiu do toque ou da cobertura lançada. Passados 20 dias sem bezerro, ou o parto aconteceu e não foi lançado, ou a vaca perdeu a cria.',
    'Sem o parto lançado, o desmame, a prenhez e a perda entre prenhez e parto ficam errados no Dashboard. Se ela não pariu, só o veterinário confirma o que aconteceu.',
  ],
}

/**
 * P11 B8 (Tião): parto previsto que passou mais de 20 dias sem parto lançado.
 * Previsão = a mais recente entre o toque prenhe e a cobertura (coberta ou prenha) da vaca.
 * Sai quando há parto com data a partir de 60 dias antes da previsão, ou toque vazia depois da previsão usada.
 */
export function lateBirthItems(input: {
  animals: TodoAnimal[]
  /** Datas previstas: do toque prenhe (com a data do exame) e da cobertura em Reprodução. */
  expected: { animal_id: string; date: string; exam_date?: string | null }[]
  calvings: Map<string, string[]>
  lastCheck: Map<string, { exam_date: string; result: string }>
  today: string
}): TodoItem[] {
  const byId = new Map(input.animals.map(a => [a.id, a]))
  const latest = new Map<string, { date: string; exam_date?: string | null }>()
  for (const e of input.expected) {
    const prev = latest.get(e.animal_id)
    if (!prev || e.date > prev.date) latest.set(e.animal_id, e)
  }
  const items: TodoItem[] = []
  for (const [id, e] of latest) {
    const a = byId.get(id)
    if (!a || a.status !== 'ativo') continue
    const late = addDaysIso(e.date, LATE_BIRTH_DAYS)
    if (late >= input.today || addDaysIso(e.date, LATE_BIRTH_STALE_DAYS) < input.today) continue
    const from = addDaysIso(e.date, -BIRTH_EARLY_DAYS)
    if ((input.calvings.get(id) ?? []).some(d => d >= from)) continue
    const check = input.lastCheck.get(id)
    if (check?.result === 'vazia' && check.exam_date > (e.exam_date ?? from)) continue
    items.push({
      key: `parto-atrasado-${id}-${e.date}`,
      title: `${nameOf(a)} devia ter parido em ${ddmm(e.date)}`,
      detail: 'Pariu? Lance o bezerro com a mãe. Se não pariu, chame o veterinário.',
      href: '/app/reproduction',
      action: 'Lançar o parto',
      why: LATE_BIRTH_WHY,
    })
  }
  return items.sort((x, y) => x.key.localeCompare(y.key))
}

const EMPTY_DRY_WHY = {
  paragraphs: [
    'A vaca vazia que entra na seca perde peso e come o pasto que as prenhes vão precisar. Vendida logo depois das águas, ainda gorda, ela vale mais.',
    'Antes de vender, compare as ofertas com a referência de Goiás.',
  ],
}

/**
 * P11 B9 (Tião): vaca com o último toque "vazia" ainda no rebanho depois de 31/05.
 * Vale o toque da temporada: de 01/06 do ano anterior a 31/05 deste ano; sai com venda, morte,
 * parto depois do toque ou novo toque. Recebe a lista "Vazias: avaliar venda" do Dashboard
 * (já sem a vaca que pariu há menos de 90 dias do toque).
 */
export function emptyBeforeDryItem(
  empties: { a: { id: string; code: string; name?: string | null }; exam: string }[],
  calvings: Map<string, string[]>,
  today: string,
): TodoItem | null {
  const year = Number(today.slice(0, 4))
  const cut = `${year}-05-31`
  if (today <= cut) return null
  const from = `${year - 1}-06-01`
  const list = empties
    .filter(e => e.exam >= from && e.exam <= cut && !(calvings.get(e.a.id) ?? []).some(d => d > e.exam))
    .map(e => e.a)
  if (list.length === 0) return null
  return {
    key: `vazia-seca-${year}`,
    title: list.length === 1 ? `${nameOf(list[0])} vazia desde o toque: vender antes da seca` : `${list.length} vacas vazias desde o toque: vender antes da seca`,
    detail: list.length === 1 ? 'Vaca vazia come o pasto sem dar bezerro.' : `${names(list)}. Vaca vazia come o pasto sem dar bezerro.`,
    href: '/app/financial/offers',
    action: 'Comparar ofertas',
    why: EMPTY_DRY_WHY,
  }
}

export function dineuvanTodo(input: {
  today: string
  animals: TodoAnimal[]
  /** Último diagnóstico de gestação de cada fêmea nos últimos 12 meses. */
  checkedIds: Set<string>
  health: { animal_id: string; product_name?: string | null; notes?: string | null; application_date?: string | null; next_due_date?: string | null }[]
  declaredPeriods: string[]
  /** Título do item da área de pasto, ou null quando a área está certa. */
  pastureTitle: string | null
  boughtNoPrice: { id: string; code: string; name?: string | null }[]
  salesNoReason: { id: string; code: string; name?: string | null }[]
}): TodoItem[] {
  const { today, animals } = input
  const active = animals.filter(a => a.status === 'ativo')
  const items: TodoItem[] = []

  items.push(...repeatItems(input.health, animals, today))

  // 1. Diagnóstico de gestação: vaca e novilha com 18 meses ou mais, sem toque lançado em 12 meses.
  const noCheck = active.filter(a => a.species === 'bovino' && a.sex === 'F' && (monthsOld(a.birth_date, today) ?? 99) >= MIN_MONTHS && !input.checkedIds.has(a.id))
  if (noCheck.length > 0) {
    items.push({
      key: 'diagnostico',
      title: `Diagnóstico de gestação: ${noCheck.length} ${noCheck.length === 1 ? 'fêmea' : 'fêmeas'} sem toque`,
      detail: `Chame o veterinário para o toque. Vaca vazia é a primeira a sair. ${names(noCheck)}.`,
      href: '/app/reproduction',
      action: 'Lançar diagnóstico',
    })
  }

  // 2. Exame andrológico: macho inteiro com 18 meses ou mais sem exame lançado em Saúde.
  const examined = new Set(input.health.filter(h => isAndrological(h.product_name) || isAndrological(h.notes)).map(h => h.animal_id))
  const bulls = active.filter(a => a.species === 'bovino' && a.sex === 'M' && a.is_breeder && (monthsOld(a.birth_date, today) ?? 99) >= MIN_MONTHS && !examined.has(a.id))
  if (bulls.length > 0) {
    items.push({
      key: 'andrologico',
      title: `Exame do touro: ${names(bulls)}`,
      detail: 'Antes de soltar com as vacas, exame andrológico com o veterinário. Depois, lance em Saúde, tipo Consulta, com o nome "Exame andrológico".',
      href: '/app/health',
      action: 'Lançar em Saúde',
    })
  }

  // 2b. Touro ou boi? Macho com 18 meses ou mais, sem "É touro" e sem "Gordo" (boi de engorda).
  for (const m of active.filter(a => a.species === 'bovino' && a.sex === 'M' && !a.is_breeder && !a.is_fat && (monthsOld(a.birth_date, today) ?? 99) >= MIN_MONTHS)) {
    items.push({
      // Mesma chave da lista antiga: quem já respondeu "É boi" não vê de novo.
      key: `touro-${m.id}`,
      title: `${nameOf(m)} é touro ou boi?`,
      detail: `O ${nameOf(m)} vai cobrir as vacas? Se sim, marque "É touro" e faça o exame andrológico antes da estação.`,
      href: `/app/animals/${m.id}/edit`,
      action: 'É touro: marcar',
      dismissLabel: 'É boi, está certo',
    })
  }

  // 3. Declaração de Rebanho no SIDAGO (maio e novembro).
  const decl = declarationPeriod(today)
  if (decl && !input.declaredPeriods.includes(decl.period)) {
    const { period, deadline, late } = decl
    items.push({
      key: `declaracao-${period}`,
      title: late ? 'Declaração de Rebanho no SIDAGO: passou do prazo' : `Declaração de Rebanho no SIDAGO, até ${deadline}`,
      // [V] Portaria Agrodefesa 173/2026: 2ª etapa de 1º a 30/11/2026, pela internet no SIDAGO ou numa unidade da Agrodefesa.
      detail: late
        ? `O prazo era ${deadline}. Confira no SIDAGO se a Agrodefesa prorrogou; sem a declaração, não sai GTA.`
        : 'Sem ela não sai GTA. Declare o gado que tem hoje pela internet, no SIDAGO, ou numa unidade da Agrodefesa.',
      href: 'https://sidago.agrodefesa.go.gov.br/',
      action: 'Abrir o SIDAGO',
      declarationPeriod: period,
      why: DECLARATION_WHY,
    })
  }

  // 4. Área de pasto.
  if (input.pastureTitle) {
    items.push({
      key: 'area-pasto',
      title: input.pastureTitle,
      detail: 'Em alqueires (ou hectares), só o que é pasto, sem lavoura, mata e sede. Serve para saber quanto gado o pasto aguenta.',
      href: '/app/settings',
      action: 'Informar em Configurações',
    })
  }

  // 5. Animal sem raça e compra sem preço.
  const noBreed = active.filter(a => a.species === 'bovino' && !a.breed?.trim())
  if (noBreed.length > 0) {
    items.push({
      key: 'sem-raca',
      title: noBreed.length === 1 ? `Raça de ${nameOf(noBreed[0])}` : `Raça de ${noBreed.length} animais`,
      detail: `${names(noBreed)}: sem raça, o sistema não acha o preço de mercado.`,
      href: `/app/animals/${noBreed[0].id}/edit`,
      action: noBreed.length === 1 ? 'Informar a raça' : `Começar por ${nameOf(noBreed[0])}`,
    })
  }
  if (input.boughtNoPrice.length > 0) {
    const list = input.boughtNoPrice
    items.push({
      key: 'compra-sem-preco',
      title: list.length === 1 ? `Quanto pagou em ${nameOf(list[0])}` : `Quanto pagou em ${list.length} animais`,
      detail: `${names(list)}: entrou como compra, mas sem preço. Em Financeiro, aba Compras, toque no lápis do animal.`,
      href: '/app/financial/movements',
      action: 'Abrir Compras',
    })
  }

  // 6. Venda sem motivo.
  if (input.salesNoReason.length > 0) {
    const list = input.salesNoReason
    items.push({
      key: 'venda-sem-motivo',
      title: list.length === 1 ? `Motivo da venda de ${nameOf(list[0])}` : `Motivo da venda de ${list.length} animais`,
      detail: `Por que vendeu? Vazia, velha, doente ou precisou de dinheiro? ${names(list)}. Em Financeiro, aba Vendas, toque no lápis.`,
      href: '/app/financial/movements',
      action: 'Abrir Vendas',
    })
  }

  return items
}
