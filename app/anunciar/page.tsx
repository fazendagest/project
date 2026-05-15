'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CowIcon } from '@/components/icons/cow-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  PawPrint, Landmark, Wrench, Tractor, Stethoscope,
  FileText, CalendarDays, ChevronLeft, CheckCircle2, ArrowRight, Camera, X,
} from 'lucide-react'

const CATEGORIES = [
  { key: 'animais', label: 'Animais', icon: PawPrint },
  { key: 'terras', label: 'Terra', icon: Landmark },
  { key: 'servicos', label: 'Serviço', icon: Wrench },
  { key: 'maquinas', label: 'Máquina', icon: Tractor },
  { key: 'veterinarios', label: 'Veterinário', icon: Stethoscope },
  { key: 'arrendamento', label: 'Arrendamento', icon: FileText },
  { key: 'eventos', label: 'Evento', icon: CalendarDays },
]

const PRICE_TYPES = [
  { key: 'per_head', label: 'Por cabeça' },
  { key: 'lot', label: 'Valor do lote' },
  { key: 'fixed', label: 'Preço fixo' },
  { key: 'consult', label: 'A consultar' },
]

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]

export default function AnunciarPage() {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<1 | 2 | 'done'>(1)
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [wantTrial, setWantTrial] = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    quantity: '1',
    price_type: 'fixed',
    price: '',
    city: '',
    state: '',
    youtube_url: '',
    seller_name: '',
    seller_phone: '',
    seller_email: '',
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fg_seller')
      if (saved) {
        const { name, phone, email } = JSON.parse(saved)
        setForm(prev => ({
          ...prev,
          seller_name: name || '',
          seller_phone: phone || '',
          seller_email: email || '',
        }))
        setAutoFilled(true)
      }
    } catch {}
  }, [])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handlePhoto(file: File) {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Informe o título'); return }
    if (!form.seller_name.trim()) { toast.error('Informe seu nome ou da fazenda'); return }
    if (!form.seller_phone.trim()) { toast.error('Informe o WhatsApp'); return }

    setSubmitting(true)

    // Upload photo if selected
    let photo_url: string | null = null
    if (photoFile) {
      const ext = photoFile.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: up, error: upErr } = await supabase.storage
        .from('listing-photos')
        .upload(path, photoFile, { cacheControl: '3600', upsert: false })
      if (!upErr && up) {
        const { data: urlData } = supabase.storage.from('listing-photos').getPublicUrl(up.path)
        photo_url = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('listings').insert({
      category,
      title: form.title.trim(),
      description: form.description.trim() || null,
      quantity: parseInt(form.quantity) || 1,
      price_type: form.price_type,
      price: form.price ? parseFloat(form.price.replace(',', '.')) : null,
      city: form.city.trim() || null,
      state: form.state || null,
      youtube_url: form.youtube_url.trim() || null,
      seller_name: form.seller_name.trim(),
      seller_phone: form.seller_phone.trim(),
      seller_email: form.seller_email.trim() || null,
      photo_url,
      status: 'pending',
    })

    if (error) {
      toast.error('Erro ao enviar anúncio: ' + error.message)
      setSubmitting(false)
      return
    }

    try {
      localStorage.setItem('fg_seller', JSON.stringify({
        name: form.seller_name.trim(),
        phone: form.seller_phone.trim(),
        email: form.seller_email.trim(),
      }))
    } catch {}

    setStep('done')
    setSubmitting(false)
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F8F5EB' }}>
        <div className="bg-white rounded-2xl border border-[#EAE4D0] p-8 max-w-sm w-full text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#F0EBD8] border border-[#EAE4D0] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-9 w-9 text-[#0F4A2D]" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 font-serif">Anúncio enviado!</h1>
          <p className="text-gray-500 text-sm">Seu anúncio será publicado após aprovação em até 24h.</p>
          {wantTrial && (
            <div className="rounded-xl p-4 text-sm text-[#0F4A2D]" style={{ background: '#F3EDD8', border: '1px solid #EAE4D0' }}>
              Recebemos seu interesse! Em breve entraremos em contato para configurar seu acesso.
            </div>
          )}
          <Link href="/" className="flex items-center justify-center gap-2 w-full bg-[#0F4A2D] text-white font-semibold py-2.5 rounded-xl hover:bg-[#0C3B24] transition-colors text-sm">
            Voltar ao marketplace
          </Link>
        </div>
      </div>
    )
  }

  const stepNum = typeof step === 'number' ? step : 2

  function handleBack() {
    if (step === 2) setStep(1)
    else router.push('/')
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8F5EB' }}>

      {/* ── Header Desktop ── */}
      <header className="hidden sm:block bg-[#0F4A2D] text-white border-b border-[#0C3B24]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-white/15 rounded-xl p-1.5 border border-white/20">
              <CowIcon className="h-5 w-5" />
            </div>
            <div className="leading-none">
              <div className="font-bold text-base font-serif">FazendaGest</div>
              <div className="text-[10px] opacity-70 uppercase tracking-widest mt-0.5">Marketplace · Goiás</div>
            </div>
          </Link>
        </div>
      </header>

      {/* ── Header Mobile + Progress + Title (green strip) ── */}
      <div className="sm:hidden bg-[#0F4A2D] text-white">
        <div className="flex items-center px-4 py-3">
          <button onClick={handleBack} className="p-1 -ml-1">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="flex-1 text-center text-sm font-medium">Passo {stepNum} de 2</span>
          <Link href="/" className="p-1 -mr-1">
            <X className="h-5 w-5" />
          </Link>
        </div>
        <div className="h-1 bg-white/20">
          <div className={`h-full bg-white transition-all duration-300 ${stepNum === 1 ? 'w-1/2' : 'w-full'}`} />
        </div>
        {step === 1 && (
          <div className="px-4 pt-5 pb-6">
            <h1 className="text-xl font-semibold font-serif">O que você quer anunciar?</h1>
            <p className="text-sm opacity-80 mt-1">Anúncio grátis, sem taxas.</p>
          </div>
        )}
        {step === 2 && (
          <div className="px-4 pt-5 pb-6">
            <h1 className="text-xl font-semibold font-serif">Detalhes do anúncio</h1>
          </div>
        )}
      </div>

      {/* ── Progress bar Desktop ── */}
      <div className="hidden sm:block border-b border-[#EAE4D0] bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
            <div className={`h-full rounded-full bg-[#0F4A2D] transition-all duration-300 ${stepNum === 1 ? 'w-1/2' : 'w-full'}`} />
          </div>
          <span className="text-sm text-gray-500 shrink-0">Passo {stepNum} de 2</span>
        </div>
      </div>

      <main className="px-4 py-6 sm:px-0 sm:py-0">
        <div className="sm:max-w-lg sm:mx-auto sm:mt-8 sm:mb-8 sm:bg-white sm:rounded-2xl sm:border sm:border-[#EAE4D0] sm:p-8">

          {step === 1 && (
            <>
              <h1 className="hidden sm:block text-2xl font-medium text-gray-900 font-serif">O que você quer anunciar?</h1>
              <p className="hidden sm:block text-sm text-gray-500 mt-1 mb-6">Anúncio grátis, sem taxas.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.key}
                      onClick={() => { setCategory(cat.key); setStep(2) }}
                      className="flex flex-col items-center gap-2 py-5 px-4 rounded-xl border border-[#EAE4D0] bg-white hover:border-[#0F4A2D] hover:bg-[#F0F7F0] transition-colors"
                    >
                      <Icon className="h-7 w-7 text-[#0F4A2D]" />
                      <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h1 className="hidden sm:block text-xl font-semibold text-gray-900 font-serif">Detalhes do anúncio</h1>

              {/* Photo upload */}
              <div className="space-y-1.5">
                <Label>Foto do anúncio (opcional)</Label>
                <div className="relative">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="cursor-pointer rounded-xl border-2 border-dashed border-[#EAE4D0] hover:border-[#0F4A2D] transition-colors overflow-hidden"
                    style={{ background: '#FAFAF8' }}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 gap-2">
                        <Camera className="h-8 w-8 text-gray-300" />
                        <span className="text-sm text-gray-400">Adicionar foto</span>
                        <span className="text-xs text-gray-300">Clique para selecionar</span>
                      </div>
                    )}
                  </div>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handlePhoto(file)
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input
                  placeholder="Ex: Venda de 20 Nelore PO, 2 anos, vacinados"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  placeholder="Descreva o que você está oferecendo..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Quantidade</Label>
                  <Input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de valor</Label>
                  <select
                    value={form.price_type}
                    onChange={e => set('price_type', e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {PRICE_TYPES.map(pt => (
                      <option key={pt.key} value={pt.key}>{pt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.price_type !== 'consult' && (
                <div className="space-y-1.5">
                  <Label>Valor (R$)</Label>
                  <Input placeholder="Ex: 3500,00" value={form.price} onChange={e => set('price', e.target.value)} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Cidade *</Label>
                  <Input placeholder="Ex: Uberaba" value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado *</Label>
                  <select
                    value={form.state}
                    onChange={e => set('state', e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Selecione</option>
                    {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Vídeo YouTube (opcional)</Label>
                <Input placeholder="https://youtube.com/watch?v=..." value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)} />
              </div>

              <hr className="border-[#EAE4D0]" />

              {autoFilled && (
                <p className="text-xs text-[#0F4A2D] flex items-center gap-1.5 -mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Dados preenchidos do seu último anúncio
                </p>
              )}

              <div className="space-y-1.5">
                <Label>Nome / Fazenda *</Label>
                <Input placeholder="Seu nome ou nome da fazenda" value={form.seller_name} onChange={e => set('seller_name', e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label>WhatsApp *</Label>
                <Input placeholder="(64) 99999-9999" value={form.seller_phone} onChange={e => set('seller_phone', e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label>E-mail (opcional)</Label>
                <Input type="email" placeholder="seu@email.com" value={form.seller_email} onChange={e => set('seller_email', e.target.value)} />
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl cursor-pointer" style={{ background: '#F3EDD8', border: '1px solid #EAE4D0' }}>
                <input
                  type="checkbox"
                  checked={wantTrial}
                  onChange={e => setWantTrial(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#0F4A2D]"
                />
                <span className="text-sm text-[#0F4A2D]">
                  <span className="font-semibold">Quero experimentar o sistema de gestão grátis</span>
                  <br />
                  <span className="text-[#0F4A2D] opacity-80">90 dias grátis para gestão de animais, finanças e muito mais.</span>
                </span>
              </label>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-[#0F4A2D] hover:bg-[#0C3B24] text-white font-semibold flex items-center justify-center gap-2"
              >
                {submitting ? 'Enviando...' : (<>Enviar anúncio <ArrowRight className="h-4 w-4" /></>)}
              </Button>
            </form>
          )}

        </div>
      </main>
    </div>
  )
}
