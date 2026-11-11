import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CRIA_TARGETS, FIRST_CALVING_TARGET, PREGNANCY_LOSS_TARGET, type CriaCost, type CriaIndex, type CriaIndicators, type OpenHeifer } from '@/lib/cria'
import { cn } from '@/lib/utils'

const pct = (v: number) => `${Math.round(v * 100)}%`
const money = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`
const num = (v: number, digits = 0) => v.toLocaleString('pt-BR', { maximumFractionDigits: digits })

/**
 * Índices da cria (Tião, P4): o valor de hoje ao lado da meta da fazenda. Sem dado, diz o que falta lançar.
 * No celular cada índice é um bloco; no computador, uma linha com três colunas.
 */
const MAX_NAMES = 8
const names = (list: OpenHeifer[]) =>
  list.slice(0, MAX_NAMES).map(h => `${h.label} (${h.months} meses)`).join(', ') + (list.length > MAX_NAMES ? ` e mais ${list.length - MAX_NAMES}` : '')

export function CriaCard({ cria, prenhez, cost, firstCalf, loss }: {
  cria: CriaIndicators
  prenhez: CriaIndex
  /** Perda entre prenhez e parto; null esconde a linha (sem diagnóstico prenhe lançado). */
  loss: CriaIndex | null
  cost: CriaCost
  firstCalf: { index: CriaIndex; openHeifers: OpenHeifer[] }
}) {
  const open = firstCalf.openHeifers
  const rows: { label: string; index: CriaIndex; show: (v: number) => string; target: string; extra?: string; warn?: string }[] = [
    { label: 'Taxa de desmame', index: cria.desmame, show: pct, target: CRIA_TARGETS.desmame.text },
    { label: 'Kg desmamado por vaca exposta', index: cria.kg, show: v => `${num(v)} kg`, target: CRIA_TARGETS.kg.text },
    { label: 'Prenhez', index: prenhez, show: pct, target: CRIA_TARGETS.prenhez.text },
    // P8 item 3: só aparece com diagnóstico prenhe lançado.
    ...(loss ? [{ label: 'Perda entre prenhez e parto', index: loss, show: pct, target: PREGNANCY_LOSS_TARGET.text }] : []),
    {
      label: 'Mortalidade de bezerros',
      index: cria.mortalidade,
      show: pct,
      target: CRIA_TARGETS.mortalidade.text,
      extra: cria.mortalidade.missingHeads > 0 ? `Fora da conta, ${cria.mortalidade.missingHeads} ${cria.mortalidade.missingHeads === 1 ? 'sumiu' : 'sumiram'}.` : undefined,
    },
    { label: 'Intervalo entre partos', index: cria.intervalo, show: v => `${num(v, 1)} meses`, target: CRIA_TARGETS.intervalo.text },
    // P8 item 2: idade ao primeiro parto e novilha passada da idade sem cobertura.
    {
      label: 'Idade ao primeiro parto',
      index: firstCalf.index,
      show: v => `${num(v)} meses`,
      target: FIRST_CALVING_TARGET.text,
      warn: open.length > 0
        ? `Novilha com 24 meses ou mais sem cobertura nem diagnóstico: entra na próxima estação ou sai. ${open.length === 1 ? 'Hoje' : `Hoje são ${open.length}`}: ${names(open)}.`
        : undefined,
    },
    // P8 item 1: o bezerro desmamado paga a vaca?
    { label: 'Custo por vaca no ano', index: cost.perCow, show: money, target: 'Pago pelo bezerro (linha abaixo)' },
    {
      label: 'Custo por bezerro desmamado',
      index: cost.perCalf,
      show: money,
      target: cost.calfPrice != null ? `Abaixo de ${money(cost.calfPrice)}, o bezerro na desmama (média de Goiás, IFAG)` : 'Abaixo do preço do bezerro na desmama',
    },
  ]

  return (
    <Card className="mb-4">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Cria: como está e a meta</CardTitle>
        <p className="text-xs text-muted-foreground">Desmame e kg contam os bezerros que já passaram dos 7 meses; vaca exposta é a vaca ou novilha (20 meses ou mais) que estava na fazenda na época da cobertura.</p>
      </CardHeader>
      <CardContent>
        <div className="hidden md:grid grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1fr)] gap-x-4 border-b pb-2 text-xs text-muted-foreground">
          <span>Índice</span><span>Hoje</span><span>Meta</span>
        </div>
        <ul className="divide-y">
          {rows.map(r => (
            <li key={r.label} className="py-3 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1fr)] md:gap-x-4">
              <p className="text-sm font-medium">{r.label}</p>
              <div className="text-sm">
                {r.index.value != null ? (
                  <>
                    <span className={cn('font-semibold tabular-nums', r.index.belowTarget && 'text-amber-800')}>{r.show(r.index.value)}</span>
                    {r.index.caveat && <span className="text-xs text-muted-foreground"> ({r.index.caveatTag ?? 'poucos dados'})</span>}
                    {r.index.belowTarget && <span className="text-xs font-medium text-amber-800"> fora da meta</span>}
                    {r.index.detail && <span className="block text-xs text-muted-foreground">{r.index.detail}</span>}
                    {r.index.caveat && <span className="block text-xs text-muted-foreground mt-1">{r.index.caveat}</span>}
                  </>
                ) : (
                  <span className="block text-xs font-medium text-amber-800">{r.index.missing}</span>
                )}
                {r.extra && <span className="block text-xs text-muted-foreground">{r.extra}</span>}
                {r.warn && <span className="block text-xs font-medium text-amber-800 mt-1">{r.warn}</span>}
              </div>
              <p className="text-xs text-muted-foreground md:text-sm">
                <span className="md:hidden">Meta: </span>{r.target}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
