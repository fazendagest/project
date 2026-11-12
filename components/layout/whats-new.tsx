'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/** Troque a chave quando houver novidades novas: o aviso aparece de novo uma vez. */
const STORAGE_KEY = 'fazendagest-novidades-2026-11c'

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
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Novidades no FazendaGest</DialogTitle>
          <DialogDescription>Agora o sistema mostra se a cria está indo bem, o que só você resolve e ajuda a vender melhor.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-foreground">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              No <strong>Dashboard</strong>, o cartão <strong>Cria: como está e a meta</strong> mostra prenhez, desmame, mortalidade,
              intervalo entre partos, idade ao primeiro parto e custo por vaca, cada um com a meta. O link «Entenda estes números» explica.
            </li>
            <li>No topo do Dashboard, a lista <strong>O que só você resolve</strong>: cada item some sozinho quando é lançado.</li>
            <li>Menu <strong>Guia da cria</strong>: como a fazenda ganha dinheiro, o ano mês a mês e quando vender uma vaca.</li>
            <li>No animal, o <strong>papel da vaca</strong> (reposição, cruzamento ou descarte) e o destino do bezerro (venda ou reposição).</li>
            <li>
              Na venda, o <strong>R$ por @</strong> e a referência de Goiás. Em Vendas, <strong>Comparar ofertas</strong>: anote o que cada
              comprador ofereceu e veja qual paga mais no líquido. Só você vê.
            </li>
            <li>Em Reprodução, o diagnóstico em série («Salvar e lançar a próxima»). Em Configurações, a área em alqueires.</li>
          </ul>

          <div>
            <p className="font-semibold mb-1.5">O que fazer agora</p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Resolva os itens de <strong>O que só você resolve</strong>, no Dashboard.</li>
              <li>Faça a <strong>Declaração de Rebanho</strong> de novembro no SIDAGO, até 30/11.</li>
              <li>Lance as compras de <strong>sal e ração</strong> e as <strong>despesas do mês</strong> (caseiro, energia, diesel).</li>
              <li>Quando desmamar um bezerro, lance a data e o peso.</li>
            </ol>
          </div>
        </div>

        <DialogFooter><Button className="h-11 w-full text-base" onClick={close}>Entendi</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
