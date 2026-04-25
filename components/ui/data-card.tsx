import { cn } from '@/lib/utils'

export function DataCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border overflow-x-auto bg-card', className)}>
      {children}
    </div>
  )
}
