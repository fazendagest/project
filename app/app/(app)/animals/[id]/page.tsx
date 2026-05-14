import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import {
  calcAge, formatDate, formatCurrency, speciesLabel,
  statusLabel, statusColor, sexLabel, healthTypeLabel
} from '@/lib/helpers'
import Image from 'next/image'

export default async function AnimalDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [
    { data: animal },
    { data: health },
    { data: repro },
    { data: purchase },
    { data: sale },
  ] = await Promise.all([
    supabase.from('animals').select('*').eq('id', params.id).eq('farm_id', farmId).single(),
    supabase.from('health_records').select('*').eq('animal_id', params.id).order('application_date', { ascending: false }),
    supabase.from('reproduction_records').select('*, male:male_id(code,name), external_male_name').eq('female_id', params.id).order('coverage_date', { ascending: false }),
    supabase.from('animal_purchases').select('*').eq('animal_id', params.id).maybeSingle(),
    supabase.from('animal_sales').select('*').eq('animal_id', params.id).maybeSingle(),
  ])

  if (!animal) notFound()

  const totalHealthCost = health?.reduce((s, r) => s + (r.cost || 0), 0) ?? 0
  const totalCost = (purchase?.purchase_price || 0) + totalHealthCost
  const profit = sale ? sale.sale_price - totalCost : null

  return (
    <div>
      <PageHeader
        title={animal.code + (animal.name ? ` · ${animal.name}` : '')}
        description={`${speciesLabel(animal.species)} · Cadastrado em ${formatDate(animal.entry_date)}`}
        actions={
          <Link href={`/app/animals/${animal.id}/edit`}>
            <Button className="gap-2"><Pencil className="h-4 w-4" /> Editar</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="relative h-56 rounded-xl overflow-hidden bg-muted">
          {animal.photo_url ? (
            <Image src={animal.photo_url} alt={animal.code} fill className="object-cover" />
          ) : (
            <div className="h-full flex items-center justify-center text-7xl">
              {animal.species === 'bovino' ? '🐄' : animal.species === 'equino' ? '🐴' : '🐷'}
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle>Informações</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Código" value={animal.code} />
            <Row label="Nome" value={animal.name ?? '—'} />
            <Row label="Espécie" value={speciesLabel(animal.species)} />
            <Row label="Raça" value={animal.breed ?? '—'} />
            <Row label="Sexo" value={sexLabel(animal.sex)} />
            <Row label="Nascimento" value={formatDate(animal.birth_date)} />
            <Row label="Idade" value={animal.birth_date ? calcAge(animal.birth_date) : '—'} />
            <Row label="Entrada" value={`${formatDate(animal.entry_date)} (${animal.entry_type})`} />
            {(animal as any).weight_arrobas != null && (
              <Row label="Peso" value={`${(animal as any).weight_arrobas} @`} />
            )}
            <div className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground">Status</span>
              <Badge className={statusColor(animal.status)}>{statusLabel(animal.status)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle>Financeiro</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Preço de Compra" value={formatCurrency(purchase?.purchase_price)} />
            <Row label="Custo de Saúde" value={formatCurrency(totalHealthCost)} />
            <Row label="Custo Total" value={formatCurrency(totalCost)} bold />
            {sale && (
              <>
                <Row label="Preço de Venda" value={formatCurrency(sale.sale_price)} />
                <Row label="Lucro" value={formatCurrency(profit)} bold color={profit && profit >= 0 ? 'text-green-600' : 'text-red-600'} />
                <Row label="Data de Venda" value={formatDate(sale.sale_date)} />
              </>
            )}
            {animal.market_value && (
              <Row label="Valor de Mercado" value={formatCurrency(animal.market_value)} />
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health">
        <TabsList className="mb-4">
          <TabsTrigger value="health">Saúde ({health?.length ?? 0})</TabsTrigger>
          {animal.sex === 'F' && <TabsTrigger value="repro">Reprodução ({repro?.length ?? 0})</TabsTrigger>}
          {animal.notes && <TabsTrigger value="notes">Observações</TabsTrigger>}
        </TabsList>

        <TabsContent value="health">
          <Card>
            <CardContent className="pt-4">
              {!health?.length ? (
                <p className="text-center text-muted-foreground py-6">Nenhum registro de saúde</p>
              ) : (
                <div className="space-y-3">
                  {health.map(h => (
                    <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b last:border-0 gap-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{healthTypeLabel(h.type)}</Badge>
                          <span className="font-medium">{h.product_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(h.application_date)}
                          {h.dose ? ` · Dose: ${h.dose}` : ''}
                          {h.applied_by ? ` · Por: ${h.applied_by}` : ''}
                        </p>
                        {h.next_due_date && (
                          <p className="text-xs text-amber-600">Próx.: {formatDate(h.next_due_date)}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(h.cost)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {animal.sex === 'F' && (
          <TabsContent value="repro">
            <Card>
              <CardContent className="pt-4">
                {!repro?.length ? (
                  <p className="text-center text-muted-foreground py-6">Nenhum registro reprodutivo</p>
                ) : (
                  <div className="space-y-3">
                    {repro.map(r => (
                      <div key={r.id} className="py-3 border-b last:border-0">
                        <div className="flex justify-between">
                          <span className="font-medium">Cobertura: {formatDate(r.coverage_date)}</span>
                          <Badge variant="outline">{r.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Parto previsto: {formatDate(r.expected_birth_date)}
                          {r.actual_birth_date ? ` · Real: ${formatDate(r.actual_birth_date)}` : ''}
                          {r.offspring_count ? ` · ${r.offspring_count} filhote(s)` : ''}
                        </p>
                        {((r.male as any)?.code || (r as any).external_male_name) && (
                          <p className="text-xs text-muted-foreground">
                            Reprodutor: {(r.male as any)?.code ?? (r as any).external_male_name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {animal.notes && (
          <TabsContent value="notes">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-wrap">{animal.notes}</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between py-1 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${color ?? ''}`}>{value}</span>
    </div>
  )
}
