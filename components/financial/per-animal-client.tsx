'use client'

import { useState } from 'react'
import type { AnimalCost } from '@/types'
import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate, speciesLabel, statusLabel, statusColor } from '@/lib/helpers'
import { DataCard } from '@/components/ui/data-card'
import { EmptyState } from '@/components/ui/empty-state'
import Link from 'next/link'
import { CardList, RecordCard } from '@/components/ui/record-card'

const PAGE_SIZE = 20

export function PerAnimalClient({ initialData }: { initialData: AnimalCost[] }) {
  const [data] = useState(initialData)
  const [search, setSearch] = useState('')
  const [species, setSpecies] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = data.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.code.toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q)
    const matchSpecies = species === 'all' || a.species === species
    const matchStatus = status === 'all' || a.status === status
    return matchSearch && matchSpecies && matchStatus
  })

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const soldAnimals = filtered.filter(a => a.status === 'vendido' || a.status === 'abatido')
  const totalRevenue = soldAnimals.reduce((s, a) => s + (a.sale_price ?? 0), 0)
  const totalCost = soldAnimals.reduce((s, a) => s + a.total_cost, 0)
  const totalProfit = totalRevenue - totalCost

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Receita Total (Vendidos)</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Custo Total (Vendidos)</p>
          <p className="text-xl font-bold text-red-700">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Lucro Total</p>
          <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(totalProfit)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Buscar por código ou nome..." />
        <Select value={species} onValueChange={v => { if (v) { setSpecies(v); setPage(1) } }}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue>{({ all: 'Todas as espécies', bovino: 'Bovino', equino: 'Equino', suino: 'Suíno' } as Record<string, string>)[species]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="bovino">Bovino</SelectItem>
            <SelectItem value="equino">Equino</SelectItem>
            <SelectItem value="suino">Suíno</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={v => { if (v) { setStatus(v); setPage(1) } }}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue>{({ all: 'Todas as situações', ativo: 'Ativo', vendido: 'Vendido', abatido: 'Abatido', morto: 'Morto' } as Record<string, string>)[status]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
            <SelectItem value="abatido">Abatido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CardList empty="Nenhum animal encontrado">
        {paged.map(a => (
          <RecordCard
            key={a.animal_id}
            href={`/app/animals/${a.animal_id}`}
            title={a.name ?? a.code}
            titleNote={a.name ? a.code : undefined}
            subtitle={speciesLabel(a.species)}
            fields={[
              ...(a.sale_price ? [
                { label: 'Lucro', value: a.profit != null ? <span className={a.profit >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(a.profit)}</span> : 'não calculado' },
                { label: 'Venda', value: formatCurrency(a.sale_price) },
              ] : []),
              { label: 'Custo total', value: formatCurrency(a.total_cost) },
              { label: 'Compra', value: formatCurrency(a.purchase_cost) },
              { label: 'Saúde', value: formatCurrency(a.health_cost) },
              ...(a.margin_pct != null ? [{ label: 'Margem', value: `${a.margin_pct.toFixed(1)}%` }] : []),
              { label: 'Dias na fazenda', value: a.days_in_stock },
            ]}
            footer={<Badge className={statusColor(a.status)}>{statusLabel(a.status)}</Badge>}
          />
        ))}
      </CardList>

      <DataCard className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Animal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Compra</TableHead>
              <TableHead className="text-right">Saúde</TableHead>
              <TableHead className="text-right">Custo Total</TableHead>
              <TableHead className="text-right">Venda</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead className="text-right">Dias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && <EmptyState colSpan={9} message="Nenhum animal encontrado" />}
            {paged.map(a => (
              <TableRow key={a.animal_id}>
                <TableCell>
                  <Link href={`/app/animals/${a.animal_id}`} className="hover:underline">
                    <span className="font-mono font-semibold text-primary">{a.code}</span>
                    {a.name && <span className="text-muted-foreground ml-1 text-xs">{a.name}</span>}
                  </Link>
                  <p className="text-xs text-muted-foreground">{speciesLabel(a.species)}</p>
                </TableCell>
                <TableCell><Badge className={statusColor(a.status)}>{statusLabel(a.status)}</Badge></TableCell>
                <TableCell className="text-right">{formatCurrency(a.purchase_cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(a.health_cost)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(a.total_cost)}</TableCell>
                <TableCell className="text-right text-green-700">{a.sale_price ? formatCurrency(a.sale_price) : 'não vendido'}</TableCell>
                <TableCell className={`text-right font-semibold ${(a.profit ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {a.profit != null ? formatCurrency(a.profit) : 'sem venda'}
                </TableCell>
                <TableCell className="text-right">
                  {a.margin_pct != null ? `${a.margin_pct.toFixed(1)}%` : 'sem margem'}
                </TableCell>
                <TableCell className="text-right">{a.days_in_stock}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataCard>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" className="h-11 md:h-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="flex items-center text-sm px-2 tabular-nums">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" className="h-11 md:h-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  )
}
