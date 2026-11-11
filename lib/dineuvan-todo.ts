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

export function dineuvanTodo(input: {
  today: string
  animals: TodoAnimal[]
  /** Último diagnóstico de gestação de cada fêmea nos últimos 12 meses. */
  checkedIds: Set<string>
  health: { animal_id: string; product_name?: string | null; notes?: string | null }[]
  declaredPeriods: string[]
  /** Título do item da área de pasto, ou null quando a área está certa. */
  pastureTitle: string | null
  boughtNoPrice: { id: string; code: string; name?: string | null }[]
  salesNoReason: { id: string; code: string; name?: string | null }[]
}): TodoItem[] {
  const { today, animals } = input
  const active = animals.filter(a => a.status === 'ativo')
  const items: TodoItem[] = []

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
