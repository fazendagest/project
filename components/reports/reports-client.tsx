'use client'

import { useState } from 'react'
import type { Animal, AnimalCost } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/search-input'
import {
  formatDate, formatCurrency, calcAge, speciesLabel,
  statusLabel, statusColor, sexLabel, healthTypeLabel
} from '@/lib/helpers'
import { Download } from 'lucide-react'
import { CardList, RecordCard } from '@/components/ui/record-card'
import Link from 'next/link'

export function ReportsClient({
  animals,
  healthRecords,
  animalCosts,
  farmId,
}: {
  animals: Animal[]
  healthRecords: any[]
  animalCosts: AnimalCost[]
  farmId: string
}) {
  const [invSpecies, setInvSpecies] = useState('all')
  const [invStatus, setInvStatus] = useState('ativo')
  const [invSearch, setInvSearch] = useState('')
  const [healthSearch, setHealthSearch] = useState('')
  const [rentSearch, setRentSearch] = useState('')

  const filteredInv = animals.filter(a => {
    const q = invSearch.toLowerCase()
    return (
      (invSpecies === 'all' || a.species === invSpecies) &&
      (invStatus === 'all' || a.status === invStatus) &&
      (!q || a.code.toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q))
    )
  })

  const filteredHealth = healthRecords.filter(r => {
    const q = healthSearch.toLowerCase()
    return !q ||
      (r.animal as any)?.code?.toLowerCase().includes(q) ||
      r.product_name.toLowerCase().includes(q)
  })

  const soldCosts = animalCosts.filter(a => a.sale_price != null && (rentSearch === '' ||
    a.code.toLowerCase().includes(rentSearch.toLowerCase()) ||
    (a.name ?? '').toLowerCase().includes(rentSearch.toLowerCase())
  ))

  function printTable(elementId: string) {
    const content = document.getElementById(elementId)?.innerHTML
    if (!content) return
    const win = window.open('', '', 'height=800,width=1200')
    if (!win) return
    win.document.write(`<html><head><title>FazendaGest: Relatório</title>
      <style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5}</style>
      </head><body>${content}</body></html>`)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  return (
    <Tabs defaultValue="inventory">
      <TabsList className="mb-4 flex-wrap h-auto gap-1">
        <TabsTrigger value="inventory">Inventário</TabsTrigger>
        <TabsTrigger value="health">Saúde</TabsTrigger>
        <TabsTrigger value="rentability">Rentabilidade</TabsTrigger>
      </TabsList>

      {/* INVENTÁRIO */}
      <TabsContent value="inventory">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchInput value={invSearch} onChange={setInvSearch} placeholder="Buscar..." />
          <Select value={invSpecies} onValueChange={v => v && setInvSpecies(v)}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue>{({ all: 'Todas as espécies', bovino: 'Bovino', equino: 'Equino', suino: 'Suíno' } as Record<string, string>)[invSpecies]}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="bovino">Bovino</SelectItem>
              <SelectItem value="equino">Equino</SelectItem>
              <SelectItem value="suino">Suíno</SelectItem>
            </SelectContent>
          </Select>
          <Select value={invStatus} onValueChange={v => v && setInvStatus(v)}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue>{({ all: 'Todas as situações', ativo: 'Ativo', vendido: 'Vendido', abatido: 'Abatido', morto: 'Morto' } as Record<string, string>)[invStatus]}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
              <SelectItem value="abatido">Abatido</SelectItem>
              <SelectItem value="morto">Morto</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-11 md:h-9 gap-2 shrink-0" onClick={() => printTable('inv-table')}>
            <Download className="h-4 w-4" /> Imprimir
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
          {['bovino', 'equino', 'suino'].map(s => (
            <Card key={s}>
              <CardContent>
                <p className="text-sm text-muted-foreground capitalize">{speciesLabel(s)}</p>
                <p className="text-2xl font-bold">{filteredInv.filter(a => a.species === s).length}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <CardList empty="Nenhum animal">
          {filteredInv.map(a => (
            <RecordCard
              key={a.id}
              href={`/app/animals/${a.id}`}
              title={a.name ?? a.code}
              titleNote={a.name ? a.code : undefined}
              subtitle={`${speciesLabel(a.species)}, ${sexLabel(a.sex)}${a.breed ? `, ${a.breed}` : ''}`}
              fields={[
                { label: 'Idade', value: a.birth_date ? calcAge(a.birth_date) : 'sem data de nascimento' },
                { label: 'Entrada', value: a.entry_date ? formatDate(a.entry_date) : 'sem data' },
              ]}
              footer={<Badge className={statusColor(a.status)}>{statusLabel(a.status)}</Badge>}
            />
          ))}
        </CardList>

        <div id="inv-table" className="hidden md:block rounded-lg border border-gray-100 overflow-x-auto bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Espécie</TableHead>
                <TableHead>Raça</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInv.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum animal</TableCell></TableRow>}
              {filteredInv.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-semibold">{a.code}</TableCell>
                  <TableCell>{a.name ?? 'sem nome'}</TableCell>
                  <TableCell>{speciesLabel(a.species)}</TableCell>
                  <TableCell>{a.breed ?? 'não informada'}</TableCell>
                  <TableCell>{sexLabel(a.sex)}</TableCell>
                  <TableCell>{a.birth_date ? calcAge(a.birth_date) : 'sem data'}</TableCell>
                  <TableCell>{formatDate(a.entry_date)}</TableCell>
                  <TableCell><Badge className={statusColor(a.status)}>{statusLabel(a.status)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{filteredInv.length} animal(is)</p>
      </TabsContent>

      {/* SAÚDE */}
      <TabsContent value="health">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchInput value={healthSearch} onChange={setHealthSearch} placeholder="Buscar por animal ou produto..." />
          <Button variant="outline" className="h-11 md:h-9 gap-2 shrink-0" onClick={() => printTable('health-table')}>
            <Download className="h-4 w-4" /> Imprimir
          </Button>
        </div>

        <CardList empty="Nenhum registro">
          {filteredHealth.map(r => (
            <RecordCard
              key={r.id}
              title={r.product_name}
              subtitle={<>{(r.animal as any)?.name ?? (r.animal as any)?.code ?? 'Animal não informado'}{(r.animal as any)?.name && (r.animal as any)?.code ? <span className="font-mono text-xs"> {(r.animal as any).code}</span> : null}</>}
              amount={r.cost != null ? formatCurrency(r.cost) : undefined}
              fields={[
                { label: 'Data', value: r.application_date ? formatDate(r.application_date) : 'sem data' },
                { label: 'Próxima', value: r.next_due_date ? formatDate(r.next_due_date) : 'sem data' },
                { label: 'Dose', value: r.dose ?? 'não informada' },
                { label: 'Por', value: r.applied_by ?? 'não informado' },
              ]}
              footer={<Badge variant="outline">{healthTypeLabel(r.type)}</Badge>}
            />
          ))}
        </CardList>

        <div id="health-table" className="hidden md:block rounded-lg border border-gray-100 overflow-x-auto bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Dose</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Próxima</TableHead>
                <TableHead>Por</TableHead>
                <TableHead className="text-right">Custo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHealth.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum registro</TableCell></TableRow>}
              {filteredHealth.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="font-mono font-semibold">{(r.animal as any)?.code ?? 'não informado'}</span>
                    <p className="text-xs text-muted-foreground">{(r.animal as any)?.name ?? ''}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline">{healthTypeLabel(r.type)}</Badge></TableCell>
                  <TableCell>{r.product_name}</TableCell>
                  <TableCell>{r.dose ?? 'não informada'}</TableCell>
                  <TableCell>{formatDate(r.application_date)}</TableCell>
                  <TableCell>{r.next_due_date ? formatDate(r.next_due_date) : 'sem data'}</TableCell>
                  <TableCell>{r.applied_by ?? 'não informado'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{filteredHealth.length} registro(s)</p>
      </TabsContent>

      {/* RENTABILIDADE */}
      <TabsContent value="rentability">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchInput value={rentSearch} onChange={setRentSearch} placeholder="Buscar por animal..." />
          <Button variant="outline" className="h-11 md:h-9 gap-2 shrink-0" onClick={() => printTable('rent-table')}>
            <Download className="h-4 w-4" /> Imprimir
          </Button>
        </div>

        <CardList empty="Nenhum animal vendido">
          {soldCosts.map(a => (
            <RecordCard
              key={a.animal_id}
              href={`/app/animals/${a.animal_id}`}
              title={a.name ?? a.code}
              titleNote={a.name ? a.code : undefined}
              subtitle={`${speciesLabel(a.species)}, vendido em ${a.sale_date ? formatDate(a.sale_date) : 'data não informada'}`}
              fields={[
                { label: 'Lucro', value: <span className={(a.profit ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(a.profit ?? 0)}</span> },
                { label: 'Venda', value: formatCurrency(a.sale_price ?? 0) },
                { label: 'Custo total', value: formatCurrency(a.total_cost) },
                { label: 'Compra', value: formatCurrency(a.purchase_cost) },
                { label: 'Saúde', value: formatCurrency(a.health_cost) },
                { label: 'Margem', value: a.margin_pct != null ? `${a.margin_pct.toFixed(1)}%` : 'sem margem' },
                { label: 'Dias na fazenda', value: a.days_in_stock },
              ]}
            />
          ))}
        </CardList>

        <div id="rent-table" className="hidden md:block rounded-lg border border-gray-100 overflow-x-auto bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Espécie</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead className="text-right">Compra</TableHead>
                <TableHead className="text-right">Saúde</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="text-right">Venda (R$)</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-right">Dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {soldCosts.length === 0 && <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nenhum animal vendido</TableCell></TableRow>}
              {soldCosts.map(a => (
                <TableRow key={a.animal_id}>
                  <TableCell>
                    <span className="font-mono font-semibold">{a.code}</span>
                    {a.name && <span className="text-xs text-muted-foreground ml-1">{a.name}</span>}
                  </TableCell>
                  <TableCell>{speciesLabel(a.species)}</TableCell>
                  <TableCell>{formatDate(a.entry_date)}</TableCell>
                  <TableCell>{formatDate(a.sale_date)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(a.purchase_cost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(a.health_cost)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(a.total_cost)}</TableCell>
                  <TableCell className="text-right text-green-700">{formatCurrency(a.sale_price ?? 0)}</TableCell>
                  <TableCell className={`text-right font-semibold ${(a.profit ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(a.profit ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">{a.margin_pct != null ? `${a.margin_pct.toFixed(1)}%` : 'sem margem'}</TableCell>
                  <TableCell className="text-right">{a.days_in_stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{soldCosts.length} animal(is) vendido(s)</p>
      </TabsContent>
    </Tabs>
  )
}
