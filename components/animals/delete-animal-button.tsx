'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function DeleteAnimalButton({ animalId }: { animalId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const { error } = await createClient().from('animals').delete().eq('id', animalId)
    setLoading(false)
    if (error) {
      toast.error('Erro ao excluir animal')
      return
    }
    toast.success('Animal excluído')
    setOpen(false)
    router.push('/app/animals')
    router.refresh()
  }

  return (
    <>
      <Button variant="outline" className="gap-2 text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> Excluir
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir animal"
        description="Tem certeza? Esta ação não pode ser desfeita e apagará todos os registros vinculados."
        onConfirm={handleDelete}
        loading={loading}
      />
    </>
  )
}
