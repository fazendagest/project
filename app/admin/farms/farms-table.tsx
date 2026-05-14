'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LogIn, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

type Farm = {
  id: string
  name: string
  owner_name: string | null
  owner_id: string
  ownerEmail: string
  city: string | null
  state: string | null
  plan: string
  trial_ends_at: string | null
  is_active: boolean
  created_at: string
}

const PLANS = ['trial', 'básico', 'profissional', 'fazenda']

export function FarmsTable({ farms: initialFarms, adminEmail }: { farms: Farm[]; adminEmail: string }) {
  const router = useRouter()
  const [farms, setFarms] = useState(initialFarms)
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null)
  const [editForm, setEditForm] = useState({ name: '', plan: '', trial_ends_at: '' })
  const [saving, setSaving] = useState(false)
  const [impersonating, setImpersonating] = useState<string | null>(null)

  async function handleImpersonate(farmId: string) {
    setImpersonating(farmId)
    const res = await fetch('/api/admin/impersonate-farm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmId }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      toast.error('Erro ao acessar fazenda')
      setImpersonating(null)
    }
  }

  async function handleToggle(farmId: string, currentActive: boolean) {
    const newActive = !currentActive
    setFarms(prev => prev.map(f => f.id === farmId ? { ...f, is_active: newActive } : f))

    const res = await fetch('/api/admin/toggle-farm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmId, isActive: newActive }),
    })

    if (!res.ok) {
      setFarms(prev => prev.map(f => f.id === farmId ? { ...f, is_active: currentActive } : f))
      toast.error('Erro ao atualizar status')
    } else {
      toast.success(newActive ? 'Fazenda ativada' : 'Fazenda desativada')
    }
  }

  function openEdit(farm: Farm) {
    setEditingFarm(farm)
    setEditForm({
      name: farm.name,
      plan: farm.plan,
      trial_ends_at: farm.trial_ends_at ?? '',
    })
  }

  async function handleSaveEdit() {
    if (!editingFarm) return
    setSaving(true)

    const res = await fetch('/api/admin/update-farm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmId: editingFarm.id,
        name: editForm.name,
        plan: editForm.plan,
        trialEndsAt: editForm.trial_ends_at || null,
      }),
    })

    if (!res.ok) {
      toast.error('Erro ao salvar alterações')
    } else {
      setFarms(prev =>
        prev.map(f =>
          f.id === editingFarm.id
            ? { ...f, name: editForm.name, plan: editForm.plan, trial_ends_at: editForm.trial_ends_at || null }
            : f
        )
      )
      toast.success('Fazenda atualizada')
      setEditingFarm(null)
    }

    setSaving(false)
  }

  const planColor: Record<string, string> = {
    trial: 'bg-amber-100 text-amber-700',
    básico: 'bg-blue-100 text-blue-700',
    profissional: 'bg-purple-100 text-purple-700',
    fazenda: 'bg-green-100 text-green-700',
  }

  return (
    <>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Nome da Fazenda</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Proprietário</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Perfil</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Cidade/Estado</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Plano</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Trial até</th>
                <th className="text-center font-semibold px-4 py-3 text-gray-600">Ativo</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Criado em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {farms.map(farm => (
                <tr key={farm.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{farm.name}</td>
                  <td className="px-4 py-3 text-gray-600">{farm.owner_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 truncate max-w-[180px]">{farm.ownerEmail || '—'}</span>
                      {adminEmail && farm.ownerEmail === adminEmail && (
                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded font-semibold bg-purple-100 text-purple-700">
                          Master
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {farm.city && farm.state
                      ? `${farm.city}/${farm.state}`
                      : farm.city ?? farm.state ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor[farm.plan] ?? 'bg-gray-100 text-gray-700'}`}>
                      {farm.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {farm.trial_ends_at
                      ? format(new Date(farm.trial_ends_at + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={farm.is_active}
                      onCheckedChange={() => handleToggle(farm.id, farm.is_active)}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(farm.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={impersonating === farm.id}
                        onClick={() => handleImpersonate(farm.id)}
                      >
                        <LogIn className="h-3 w-3" />
                        Acessar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(farm)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {farms.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    Nenhuma fazenda cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editingFarm} onOpenChange={open => !open && setEditingFarm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Fazenda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome da Fazenda</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Plano</Label>
              <select
                value={editForm.plan}
                onChange={e => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PLANS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Data fim do Trial</Label>
              <Input
                type="date"
                value={editForm.trial_ends_at}
                onChange={e => setEditForm(prev => ({ ...prev, trial_ends_at: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditingFarm(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.48_0.15_145)]"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
