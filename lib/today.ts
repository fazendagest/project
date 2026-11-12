// "Hoje" do sistema, sempre no horário de São Paulo (achado do teste de preenchimento, Tião, 11/11/2026).
// new Date().toISOString() dá a data em UTC: depois das 21h de Brasília já é o dia seguinte,
// e o servidor da Vercel roda em UTC. Toda data padrão de formulário e todo "hoje" de conta passa por aqui.

const SP = 'America/Sao_Paulo'

/** Data de hoje em São Paulo, AAAA-MM-DD. */
export const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: SP }).format(new Date())

/** Mês de hoje em São Paulo, AAAA-MM. */
export const monthSP = () => todaySP().slice(0, 7)

/**
 * Hoje de São Paulo como Date ao meio-dia do relógio local da máquina.
 * Serve para contas com date-fns (startOfMonth, subDays, format): o meio-dia não muda de dia
 * nem em UTC nem em Brasília.
 */
export const todaySPDate = () => new Date(`${todaySP()}T12:00:00`)

/** AAAA-MM-DD de N dias atrás (ou à frente, com N negativo), contado a partir de hoje em São Paulo. */
export const daysAgoSP = (n: number) => {
  const d = todaySPDate()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
