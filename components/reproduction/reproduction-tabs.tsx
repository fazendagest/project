'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MobileActionBar } from '@/components/layout/page-header'
import { PregnancyChecks, type CheckFemale } from '@/components/reproduction/pregnancy-checks'

/** Reprodução em duas abas: diagnóstico de gestação (primeiro, é o que a fazenda de cria mais usa) e coberturas. */
export function ReproductionTabs({
  checks,
  checkFemales,
  lastCoverage,
  farmId,
  children,
}: {
  checks: React.ComponentProps<typeof PregnancyChecks>['initialChecks']
  checkFemales: CheckFemale[]
  lastCoverage: Record<string, string>
  farmId: string
  /** Lista de coberturas (ReproductionClient). */
  children: React.ReactNode
}) {
  const [tab, setTab] = useState('diagnostico')
  const [newCheck, setNewCheck] = useState(false)

  const action = tab === 'diagnostico'
    ? { label: 'Novo diagnóstico', onClick: () => setNewCheck(true) }
    : { label: 'Nova cobertura', href: '/app/reproduction/new' }

  return (
    <div className="pb-24 md:pb-0">
      <Tabs value={tab} onValueChange={v => setTab(String(v))}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
            <TabsTrigger value="coberturas">Coberturas</TabsTrigger>
          </TabsList>
          {action.href ? (
            <Link href={action.href} className="hidden md:block">
              <Button className="gap-2"><Plus className="h-4 w-4" /> {action.label}</Button>
            </Link>
          ) : (
            <Button className="hidden md:inline-flex gap-2" onClick={action.onClick}><Plus className="h-4 w-4" /> {action.label}</Button>
          )}
        </div>
        <TabsContent value="diagnostico">
          <PregnancyChecks initialChecks={checks} females={checkFemales} lastCoverage={lastCoverage} farmId={farmId} open={newCheck} onOpenChange={setNewCheck} />
        </TabsContent>
        <TabsContent value="coberturas">{children}</TabsContent>
      </Tabs>

      <MobileActionBar>
        {action.href ? (
          <Link href={action.href} className="block">
            <Button className="h-12 w-full gap-2 text-base"><Plus className="h-5 w-5" /> {action.label}</Button>
          </Link>
        ) : (
          <Button className="h-12 w-full gap-2 text-base" onClick={action.onClick}><Plus className="h-5 w-5" /> {action.label}</Button>
        )}
      </MobileActionBar>
    </div>
  )
}
