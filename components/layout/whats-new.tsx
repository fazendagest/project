'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/** Troque a chave quando houver novidades novas: o aviso aparece de novo uma vez. */
const STORAGE_KEY = 'fazendagest-novidades-2026-11b'

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
          <DialogDescription>Agora o sistema acompanha a prenhez das vacas, o caixa do gado no ano e o gado de terceiros no seu pasto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-foreground">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Em <strong>Reprodução</strong>, aba Diagnóstico: lance o resultado do toque ou do ultrassom (prenhe ou vazia).
              O Dashboard mostra quantas estão prenhes e as vazias para avaliar a venda com o veterinário.
            </li>
            <li>Na venda, diga o <strong>motivo</strong> (bezerro desmamado, gordo, descarte...). No animal morto, a data e a causa.</li>
            <li>
              O cartão <strong>A fazenda se pagou?</strong> mostra o caixa do gado no ano: vendas, menos o Funrural (1,63%), as compras
              de animais e os custos.
            </li>
            <li>
              Menu <strong>Gado de terceiros</strong>: registre o gado de outra pessoa no seu pasto (aluguel ou parceria), com GTA e exame de
              brucelose e tuberculose.
            </li>
            <li>Ração e despesas agora se dividem pelo tamanho do animal: vaca conta mais que bezerro. Compra de ração só dos porcos, marque <strong>Comida dos porcos</strong>.</li>
          </ul>

          <div>
            <p className="font-semibold mb-1.5">O que fazer agora</p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Em <strong>Configurações</strong>, informe quanto da fazenda é <strong>pasto</strong> (em hectares).</li>
              <li>Lance as compras de <strong>sal, milho e ração</strong> e as <strong>despesas da fazenda</strong> (caseiro, energia, diesel).</li>
              <li>Quando o veterinário fizer o toque, lance o resultado em Reprodução.</li>
            </ol>
          </div>
        </div>

        <Button className="h-11 w-full text-base" onClick={close}>Entendi</Button>
      </DialogContent>
    </Dialog>
  )
}
