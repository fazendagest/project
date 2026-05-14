'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CowIcon } from '@/components/icons/cow-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'

const EVENT_TYPES = [
  'Cavalgada',
  'Leilão',
  'Rodeio',
  'Festa',
  'Reunião de produtores',
  'Dia de campo',
  'Outro',
]

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]

export default function NovoEventoPage() {
  const supabase = createClient()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    title: '',
    type: '',
    description: '',
    schedule: '',
    start_date: '',
    end_date: '',
    location: '',
    city: '',
    state: '',
    organizer_name: '',
    organizer_phone: '',
    youtube_url: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Informe o título do evento'); return }
    if (!form.type) { toast.error('Selecione o tipo de evento'); return }
    if (!form.start_date) { toast.error('Informe a data de início'); return }

    setSubmitting(true)
    const { error } = await supabase.from('events').insert({
      title: form.title.trim(),
      type: form.type,
      description: form.description.trim() || null,
      schedule: form.schedule.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      location: form.location.trim() || null,
      city: form.city.trim() || null,
      state: form.state || null,
      organizer_name: form.organizer_name.trim() || null,
      organizer_phone: form.organizer_phone.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
      status: 'pending',
    })

    if (error) {
      toast.error('Erro ao enviar evento: ' + error.message)
      setSubmitting(false)
      return
    }

    setDone(true)
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl border p-8 max-w-sm w-full text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Evento enviado!</h1>
          <p className="text-gray-500 text-sm">Seu evento será publicado após aprovação em até 24h.</p>
          <Link href="/" className="block w-full bg-[#166534] text-white font-semibold py-2.5 rounded-xl hover:bg-green-800 transition-colors">
            Voltar ao marketplace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#166534] text-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-white/15 rounded-xl p-1.5">
              <CowIcon className="h-5 w-5" />
            </div>
            <span className="font-bold">FazendaGest</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Divulgar evento</h1>
          <p className="text-sm text-gray-500 mb-6">Será publicado após aprovação da equipe.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Título do evento *</Label>
              <Input
                placeholder="Ex: 15ª Cavalgada da Serra Verde"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                required
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Selecione o tipo</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data de início *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de término</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                  min={form.start_date}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Local (nome do local)</Label>
              <Input
                placeholder="Ex: Parque de Exposições Municipal"
                value={form.location}
                onChange={e => set('location', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input
                  placeholder="Ex: Uberaba"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
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
              <Label>Descrição</Label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                placeholder="Conte sobre o evento..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Programação por dia</Label>
              <textarea
                value={form.schedule}
                onChange={e => set('schedule', e.target.value)}
                rows={4}
                placeholder={"Dia 1 (20/06):\n08h - Abertura\n10h - Apresentação\n\nDia 2 (21/06):\n..."}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Organizador</Label>
              <Input
                placeholder="Nome do organizador ou associação"
                value={form.organizer_name}
                onChange={e => set('organizer_name', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>WhatsApp do organizador</Label>
              <Input
                placeholder="(64) 99999-9999"
                value={form.organizer_phone}
                onChange={e => set('organizer_phone', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Vídeo YouTube (opcional)</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={form.youtube_url}
                onChange={e => set('youtube_url', e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-[#166534] hover:bg-green-800 text-white font-semibold"
            >
              {submitting ? 'Enviando...' : 'Enviar evento'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
