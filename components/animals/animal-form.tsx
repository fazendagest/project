'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Animal, Species } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'
import { generateAnimalCode } from '@/lib/animal-utils'
import { parseBRL, formatBRL } from '@/lib/helpers'

const BREED_OPTIONS: Record<string, string[]> = {
  bovino: [
    'Nelore', 'Nelore PO', 'Angus', 'Angus PO', 'Brahman', 'Girolando',
    'Gir', 'Gir Leiteiro', 'Simental', 'Limousin', 'Charolês', 'Hereford',
    'Senepol', 'Tabapuã', 'Canchim', 'Bonsmara', 'Wagyu', 'Cruzado',
  ],
  equino: [
    'Quarto de Milha', 'Mangalarga Marchador', 'Mangalarga', 'Crioulo',
    'Paint Horse', 'Appaloosa', 'Árabe', 'Puro Sangue Inglês', 'Lusitano',
  ],
  suino: ['Landrace', 'Large White', 'Duroc', 'Pietrain', 'Hampshire', 'Agroceres'],
}


interface AnimalFormProps {
  farmId: string
  animal?: Animal
  existingPurchase?: { id: string; purchase_price: number; weight_kg?: number; seller_name?: string }
  mode: 'create' | 'edit'
}

export function AnimalForm({ farmId, animal, existingPurchase, mode }: AnimalFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(animal?.photo_url ?? '')
  const [form, setForm] = useState({
    code: animal?.code ?? '',
    name: animal?.name ?? '',
    species: animal?.species ?? 'bovino',
    breed: animal?.breed ?? '',
    sex: animal?.sex ?? 'M',
    birth_date: animal?.birth_date ?? '',
    entry_date: animal?.entry_date ?? new Date().toISOString().slice(0, 10),
    entry_type: animal?.entry_type ?? 'compra',
    status: animal?.status ?? 'ativo',
    notes: animal?.notes ?? '',
    market_value: animal?.market_value != null ? formatBRL(animal.market_value) : '',
  })
  const [purchaseForm, setPurchaseForm] = useState({
    purchase_price: existingPurchase?.purchase_price ? formatBRL(existingPurchase.purchase_price) : '',
    weight_kg: existingPurchase?.weight_kg ? String(existingPurchase.weight_kg) : '',
    seller_name: existingPurchase?.seller_name ?? '',
  })

  const fetchCode = useCallback(async (species: string) => {
    setCodeLoading(true)
    try {
      const code = await generateAnimalCode(species, farmId)
      setForm(prev => ({ ...prev, code }))
    } catch {
      toast.error('Erro ao gerar código')
    } finally {
      setCodeLoading(false)
    }
  }, [farmId])

  useEffect(() => {
    if (mode === 'create') fetchCode(form.species)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(k: string, v: string | null) {
    if (v === null) return
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function handleSpeciesChange(species: Species) {
    setForm(prev => ({ ...prev, species, breed: '' }))
    if (mode === 'create') fetchCode(species)
  }

  function handleMarketValueBlur() {
    const n = parseBRL(form.market_value)
    if (n !== null) set('market_value', formatBRL(n))
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${farmId}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('animal-photos').upload(path, file, { upsert: true })
    if (error) {
      toast.error('Erro ao fazer upload da foto')
    } else {
      const { data: { publicUrl } } = supabase.storage.from('animal-photos').getPublicUrl(path)
      setPhotoUrl(publicUrl)
      toast.success('Foto enviada!')
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || codeLoading) return toast.error('Aguarde a geração do código')
    setLoading(true)

    const payload = {
      farm_id: farmId,
      code: form.code,
      name: form.name || null,
      species: form.species,
      breed: form.breed || null,
      sex: form.sex,
      birth_date: form.birth_date || null,
      entry_date: form.entry_date,
      entry_type: form.entry_type,
      status: form.status,
      notes: form.notes || null,
      photo_url: photoUrl || null,
      market_value: parseBRL(form.market_value),
    }

    const purchasePayload = {
      farm_id: farmId,
      purchase_date: form.entry_date,
      purchase_price: parseBRL(purchaseForm.purchase_price) ?? 0,
      weight_kg: purchaseForm.weight_kg ? parseFloat(purchaseForm.weight_kg) : null,
      seller_name: purchaseForm.seller_name || null,
    }

    let error
    if (mode === 'create') {
      const { data: created, error: err } = await supabase.from('animals').insert(payload).select('id').single()
      error = err
      if (!error && created && form.entry_type === 'compra') {
        await supabase.from('animal_purchases').insert({ ...purchasePayload, animal_id: created.id })
      }
    } else {
      ;({ error } = await supabase.from('animals').update(payload).eq('id', animal!.id))
      if (!error && form.entry_type === 'compra') {
        if (existingPurchase) {
          await supabase.from('animal_purchases').update(purchasePayload).eq('id', existingPurchase.id)
        } else {
          await supabase.from('animal_purchases').insert({ ...purchasePayload, animal_id: animal!.id })
        }
      }
    }

    if (error) {
      if (error.code === '23505') toast.error('Código já existe nesta fazenda')
      else toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success(mode === 'create' ? 'Animal cadastrado!' : 'Animal atualizado!')
      router.push('/animals')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* 1. Espécie */}
              <div className="space-y-2">
                <Label>Espécie *</Label>
                <Select value={form.species} onValueChange={handleSpeciesChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bovino">Bovino</SelectItem>
                    <SelectItem value="equino">Equino</SelectItem>
                    <SelectItem value="suino">Suíno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Código — gerado automaticamente */}
              <div className="space-y-2">
                <Label htmlFor="code">
                  Código
                  {mode === 'create' && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">(gerado automaticamente)</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="code"
                    value={codeLoading ? '' : form.code}
                    readOnly
                    placeholder={codeLoading ? 'Gerando...' : ''}
                    className="bg-muted/50 cursor-not-allowed font-mono font-semibold"
                  />
                  {codeLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* 3. Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Nome do animal" />
              </div>

              {/* 4. Raça */}
              <div className="space-y-2">
                <Label htmlFor="breed">Raça</Label>
                <Input id="breed" value={form.breed} onChange={e => set('breed', e.target.value)}
                  placeholder="Ex: Nelore, Angus..." list="breed-options" autoComplete="off" />
                <datalist id="breed-options">
                  {(BREED_OPTIONS[form.species] ?? []).map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              {/* 5. Sexo */}
              <div className="space-y-2">
                <Label>Sexo *</Label>
                <Select value={form.sex} onValueChange={v => set('sex', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Macho</SelectItem>
                    <SelectItem value="F">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 6. Data de Nascimento */}
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input id="birth_date" type="date" value={form.birth_date}
                  onChange={e => set('birth_date', e.target.value)} />
              </div>

              {/* 7. Data de Entrada */}
              <div className="space-y-2">
                <Label htmlFor="entry_date">Data de Entrada *</Label>
                <Input id="entry_date" type="date" value={form.entry_date}
                  onChange={e => set('entry_date', e.target.value)} required />
              </div>

              {/* 8. Tipo de Entrada */}
              <div className="space-y-2">
                <Label>Tipo de Entrada *</Label>
                <Select value={form.entry_type} onValueChange={v => set('entry_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nascimento">Nascimento</SelectItem>
                    <SelectItem value="compra">Compra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 9. Observações */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="Notas adicionais..."
                />
              </div>
            </CardContent>
          </Card>

          {form.entry_type === 'compra' && (
            <Card>
              <CardHeader><CardTitle>Dados da Compra</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Valor da Compra (R$)</Label>
                  <Input id="purchase_price" type="text" inputMode="decimal"
                    value={purchaseForm.purchase_price}
                    onChange={e => setPurchaseForm(p => ({ ...p, purchase_price: e.target.value }))}
                    onBlur={() => { const n = parseBRL(purchaseForm.purchase_price); if (n !== null) setPurchaseForm(p => ({ ...p, purchase_price: formatBRL(n) })) }}
                    placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight_kg">Peso (kg)</Label>
                  <Input id="weight_kg" type="number" step="0.1"
                    value={purchaseForm.weight_kg}
                    onChange={e => setPurchaseForm(p => ({ ...p, weight_kg: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seller_name">Vendedor</Label>
                  <Input id="seller_name"
                    value={purchaseForm.seller_name}
                    onChange={e => setPurchaseForm(p => ({ ...p, seller_name: e.target.value }))}
                    placeholder="Nome do vendedor" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Status e Valor</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="abatido">Abatido</SelectItem>
                    <SelectItem value="morto">Morto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="market_value">Valor de Mercado (R$)</Label>
                <Input id="market_value" type="text" inputMode="decimal" value={form.market_value}
                  onChange={e => set('market_value', e.target.value)}
                  onBlur={handleMarketValueBlur}
                  placeholder="8.000,00" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 10. Foto */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Foto</CardTitle></CardHeader>
            <CardContent>
              {photoUrl && (
                <div className="relative h-48 mb-3 rounded-lg overflow-hidden bg-muted">
                  <img src={photoUrl} alt="Foto do animal" className="h-full w-full object-cover" />
                </div>
              )}
              <Label htmlFor="photo" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Clique para enviar foto</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG até 5MB</p>
                    </>
                  )}
                </div>
                <Input id="photo" type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </Label>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button type="submit" className="h-12 text-base" disabled={loading || codeLoading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {mode === 'create' ? 'Cadastrar Animal' : 'Salvar Alterações'}
            </Button>
            <Button type="button" variant="outline" className="h-12" onClick={() => router.push('/animals')}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
