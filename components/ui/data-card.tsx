import { cn } from '@/lib/utils'

export function DataCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-gray-100 overflow-x-auto bg-white shadow-sm', className)}>
      {children}
    </div>
  )
}
