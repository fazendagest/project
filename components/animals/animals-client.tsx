'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Animal } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/ui/search-input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataCard } from '@/components/ui/data-card'
import { EmptyState } from '@/components/ui/empty-state'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutGrid, List, AlertTriangle, ChevronRight } from 'lucide-react'
import { calcAge, statusLabel, statusColor, animalCategory, ANIMAL_GROUPS } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Invested } from '@/lib/investment'
import type { IfagPrices } from '@/lib/market-reference'
import { animalValue, computeHerdValue, type AnimalValue } from '@/lib/herd-value'

const SPECIES_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'bovino', label: 'Gado' },
  { key: 'equino', label: 'Cavalos' },
  { key: 'suino', label: 'Porcos' },
] as const

type Row = Animal & { category: string; motherName: string | null; investedTotal: number; mv: AnimalValue }

export function AnimalsClient({ initialAnimals, invested, feedIncluded, missingCosts = [], ifag }: {
  initialAnimals: Animal[]
  farmId: string
  invested: Record<string, Invested>
  feedIncluded: boolean
  /** Custos que faltam lançar: o ganho no papel sai maior que o real. */
  missingCosts?: string[]
  ifag: IfagPrices | null
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [species, setSpecies] = useState<string>('all')
  const [showAll, setShowAll] = useState(false)
  const [view, setView] = useState<'grid' | 'table'>('table')

  const rows: Row[] = useMemo(() => {
    const byId = new Map(initialAnimals.map(a => [a.id, a]))
    const mothers = new Set(initialAnimals.map(a => a.mother_id).filter(Boolean))
    return initialAnimals.map(a => {
      const mother = a.mother_id ? byId.get(a.mother_id) : undefined
      return {
        ...a,
        category: animalCategory(a, mothers.has(a.id)),
        motherName: mother ? (mother.name ?? mother.code) : null,
        investedTotal: invested[a.id]?.total ?? 0,
        mv: animalValue(a, ifag),
      }
    })
  }, [initialAnimals, invested, ifag])

  const herd = useMemo(
    () => computeHerdValue(initialAnimals.filter(a => a.status === 'ativo'), invested, ifag),
    [initialAnimals, invested, ifag],
  )

  const byStatus = rows.filter(a => showAll || a.status === 'ativo')

  const filtered = byStatus.filter(a => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q
      || a.code.toLowerCase().includes(q)
      || (a.name ?? '').toLowerCase().includes(q)
      || a.category.toLowerCase().includes(q)
      || (a.breed ?? '').toLowerCase().includes(q)
    const matchSpecies = species === 'all' || a.species === species
    return matchSearch && matchSpecies
  })

  const groups = ANIMAL_GROUPS
    .map(g => ({ ...g, items: filtered.filter(a => g.match(a.category)) }))
    .filter(g => g.items.length > 0)

  const hasMothers = rows.some(a => a.motherName)

  const countBySpecies = (key: string) => key === 'all' ? byStatus.length : byStatus.filter(a => a.species === key).length

  return (
    <div>
      {/* Filtros: 12 px entre cada peça, 24 px até a lista */}
      <div className="flex flex-col gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, código ou raça" />

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            {SPECIES_FILTERS.filter(f => f.key === 'all' || countBySpecies(f.key) > 0).map(f => (
              <Button
                key={f.key}
                type="button"
                variant={species === f.key ? 'default' : 'outline'}
                className="h-11 md:h-9 px-4 rounded-full"
                aria-pressed={species === f.key}
                onClick={() => setSpecies(f.key)}
              >
                {f.label} <span className="tabular-nums">{countBySpecies(f.key)}</span>
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-4 md:ml-auto">
            {/* Área de toque de 44 px sem empurrar o espaço visual (padding e margem negativos) */}
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none py-2.5 -my-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
              />
              Mostrar vendidos e mortos
            </label>
            <div className="hidden md:flex gap-1">
              <Button variant={view === 'table' ? 'default' : 'outline'} size="icon" aria-label="Ver em tabela" onClick={() => setView('table')}><List className="h-4 w-4" /></Button>
              <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" aria-label="Ver em cartões" onClick={() => setView('grid')}><LayoutGrid className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-10 text-center">Nenhum animal encontrado.</p>
      )}

      {filtered.length > 0 && herd.total > 0 && (
        <Link href="/app/dashboard" className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 mb-3 min-h-11 hover:border-primary">
          <span>
            <span className="block text-sm text-muted-foreground">Rebanho hoje (estimado)</span>
            <span className="block text-lg font-semibold tabular-nums">{formatMoney(herd.total)}</span>
          </span>
          <span className="text-right text-sm">
            <span className="block text-muted-foreground">Ganho no papel</span>
            <span className={cn('block font-medium tabular-nums', herd.paperGain < 0 ? 'text-red-700' : missingCosts.length > 0 ? '' : 'text-green-700')}>
              {herd.paperGain > 0 ? '+' : ''}{formatMoney(herd.paperGain)}
            </span>
            {missingCosts.length > 0 && <span className="block text-xs font-medium text-amber-800">pode ser menor</span>}
          </span>
        </Link>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground mb-4">
          Investido: compra + saúde{feedIncluded ? ' + sal, milho, ração e despesas da fazenda divididos pelo tamanho de cada animal (estimado)' : ''}. Mercado: o valor digitado no cadastro; sem valor digitado, o preço do IFAG (média de Goiás).
          {missingCosts.length > 0 && <span className="font-medium text-amber-800"> O ganho pode ser menor: falta lançar {missingCosts.join(' e ')}.</span>}
        </p>
      )}

      {/* Cartões agrupados: sempre no celular; no computador quando escolhido */}
      <div className={cn('space-y-6', view === 'table' && 'md:hidden')}>
        {groups.map(g => (
          <section key={g.key}>
            <div className="mb-2">
              <h2 className="text-sm font-semibold text-foreground">
                {g.label} <span className="font-normal text-muted-foreground tabular-nums">({g.items.length})</span>
              </h2>
              {g.hint && <p className="text-xs text-muted-foreground mt-0.5">{g.hint}</p>}
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {g.items.map(a => <AnimalCard key={a.id} a={a} />)}
            </ul>
          </section>
        ))}
      </div>

      {/* Tabela: só no computador */}
      {view === 'table' && filtered.length > 0 && (
        <DataCard className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Raça</TableHead>
                <TableHead>Idade</TableHead>
                {hasMothers && <TableHead>Mãe</TableHead>}
                <TableHead className="text-right">Investido</TableHead>
                <TableHead className="text-right">Mercado</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && <EmptyState colSpan={8} message="Nenhum animal encontrado" />}
              {filtered.map(a => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/app/animals/${a.id}`)}
                >
                  <TableCell>
                    <Link href={`/app/animals/${a.id}`} className="flex items-center gap-2 font-medium hover:underline" onClick={e => e.stopPropagation()}>
                      {a.name ?? 'Sem nome'}
                      <span className="font-mono text-xs text-muted-foreground">{a.code}</span>
                      {a.to_discard && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-label="Marcado para descarte" />}
                    </Link>
                  </TableCell>
                  <TableCell>{a.category}</TableCell>
                  <TableCell>{a.breed ?? 'Não informada'}</TableCell>
                  <TableCell>{a.birth_date ? calcAge(a.birth_date) : 'Sem data'}</TableCell>
                  {hasMothers && <TableCell>{a.motherName ?? ''}</TableCell>}
                  <TableCell className="text-right tabular-nums">{a.investedTotal > 0 ? formatMoney(a.investedTotal) : ''}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {a.mv.value != null ? formatMoney(a.mv.value) : ''}
                    {a.mv.source === 'ifag' && <span className="text-xs text-muted-foreground"> IFAG</span>}
                    {a.mv.farFromMarket && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 text-amber-600" aria-label="Longe da média de Goiás (IFAG)" />}
                  </TableCell>
                  <TableCell><Badge className={statusColor(a.status)}>{statusLabel(a.status)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>
      )}
    </div>
  )
}

function AnimalCard({ a }: { a: Row }) {
  const details = [a.category, a.breed, a.birth_date ? calcAge(a.birth_date) : null].filter(Boolean).join(', ')
  return (
    <li>
      <Link
        href={`/app/animals/${a.id}`}
        className="flex items-center gap-3 rounded-lg border bg-card p-3 min-h-[64px] hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {a.photo_url && (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image src={a.photo_url} alt="" fill className="object-cover" sizes="48px" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">
            {a.name ?? 'Sem nome'}{' '}
            <span className="font-mono text-xs font-normal text-muted-foreground">{a.code}</span>
          </p>
          <p className="text-sm text-muted-foreground">{details}</p>
          {a.motherName && (
            <p className="text-sm text-muted-foreground">{a.sex === 'F' ? 'Filha' : 'Filho'} da {a.motherName}</p>
          )}
          {(a.investedTotal > 0 || a.mv.value != null) ? (
            <dl className="mt-2 flex gap-6 text-sm">
              {a.investedTotal > 0 && (
                <div>
                  <dt className="text-xs text-muted-foreground">Investido</dt>
                  <dd className="font-medium tabular-nums">{formatMoney(a.investedTotal)}</dd>
                </div>
              )}
              {a.mv.value != null ? (
                <div>
                  <dt className="text-xs text-muted-foreground">{a.mv.source === 'ifag' ? 'Mercado (IFAG)' : 'Mercado'}</dt>
                  <dd className="font-medium tabular-nums">{formatMoney(a.mv.value)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {a.mv.farFromMarket && a.mv.ifag != null && (
            <p className="text-xs text-amber-800 mt-1">Longe da média de Goiás (IFAG): {formatMoney(a.mv.ifag)}</p>
          )}
          {(a.to_discard || a.status !== 'ativo') && (
            <div className="flex gap-1 mt-1">
              {a.status !== 'ativo' && <Badge className={statusColor(a.status)}>{statusLabel(a.status)}</Badge>}
              {a.to_discard && <Badge className="bg-amber-100 text-amber-900">Descarte</Badge>}
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      </Link>
    </li>
  )
}

/** Valor sem centavos, que é como o fazendeiro fala de preço de animal. */
function formatMoney(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}
