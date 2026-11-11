'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/** Troque a chave quando houver novidades novas: o aviso aparece de novo uma vez. */
const STORAGE_KEY = 'fazendagest-novidades-2026-11'

/** Aviso único de novidades. Some quando o fazendeiro toca em "Entendi" (guardado neste aparelho). */
export function WhatsNew() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch {
      // navegador sem armazenamento: não mostra, para não repetir a cada tela
    }
  }, [])

  function close() {
    try { localStorage.setItem(STORAGE_KEY, new Date().toISOString()) } catch {}
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) close() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Novidades no FazendaGest</DialogTitle>
          <DialogDescription>Mudamos a tela de animais para ficar mais fácil no celular.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-foreground">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Os animais aparecem em cartões, separados em vacas, novilhas, bezerros, touros e bois, e cavalos.</li>
            <li>Toque no animal para ver tudo dele, editar ou excluir.</li>
            <li>Para cadastrar, use o botão verde <strong>Novo animal</strong>, no pé da tela.</li>
            <li>Cada animal mostra quanto você <strong>investiu</strong> nele e quanto ele <strong>vale hoje</strong>.</li>
          </ul>

          <div>
            <p className="font-semibold mb-1.5">O que fazer agora</p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                Lance as compras de <strong>sal, milho e ração</strong> em Alimentação. Sem isso, o sistema não sabe
                quanto o gado custa nem se a venda dá lucro.
              </li>
              <li>
                Abra o <strong>Cuiabano</strong> e marque <strong>É touro</strong> se ele não foi castrado e serve para
                cobrir as vacas.
              </li>
              <li>
                Nos bezerros, escolha a <strong>mãe</strong> (por exemplo, na bezerra da Rolinha, a mãe é a Rolinha).
                Assim o sistema sabe quem é filho de quem e quando a novilha vira vaca.
              </li>
            </ol>
          </div>
        </div>

        <Button className="h-11 w-full text-base" onClick={close}>Entendi</Button>
      </DialogContent>
    </Dialog>
  )
}
