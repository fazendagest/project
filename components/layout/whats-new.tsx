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
          <DialogDescription>O sistema ficou mais fácil no celular e agora mostra quanto o rebanho vale e quanto você ganha.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-foreground">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Os animais aparecem em cartões, separados em vacas, novilhas, bezerros, touros e bois, cavalos e porcos. Toque no animal para ver tudo dele.</li>
            <li>Cada animal mostra quanto você <strong>investiu</strong> nele e quanto ele <strong>vale hoje</strong>. Se você não digitar o valor, o sistema usa o preço médio de Goiás (IFAG).</li>
            <li>O <strong>Dashboard</strong> mostra quanto o rebanho vale se vendesse hoje, o lucro das vendas e se rendeu mais ou menos que deixar o dinheiro no banco.</li>
            <li>No topo do Dashboard fica a lista <strong>Falta completar</strong>: cada item some quando você resolve.</li>
            <li>Sal, ração, salário do caseiro, energia e diesel entram no custo dos animais. Os cavalos de trabalho ficam fora dessa conta.</li>
            <li>Dá para vender vários animais de uma vez e cadastrar vários iguais (uma ninhada, por exemplo).</li>
            <li>Animal gordo para o frigorífico: marque <strong>Gordo</strong> e informe o peso vivo; o valor sai pela arroba. Só informe peso se pesou na balança ou na fita.</li>
          </ul>

          <div>
            <p className="font-semibold mb-1.5">O que fazer agora</p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                Lance as compras de <strong>sal, milho e ração</strong> em Alimentação. Sem isso, o lucro mostrado é maior do que o real.
              </li>
              <li>
                Lance as <strong>despesas da fazenda</strong> em Financeiro, Despesas. No que você paga todo mês, como o salário do
                caseiro, marque <strong>Pago todo mês</strong> e diga desde quando: lança uma vez só e o sistema conta todo mês sozinho.
              </li>
              <li>Resolva os itens da lista <strong>Falta completar</strong>, no Dashboard.</li>
            </ol>
          </div>
        </div>

        <Button className="h-11 w-full text-base" onClick={close}>Entendi</Button>
      </DialogContent>
    </Dialog>
  )
}
