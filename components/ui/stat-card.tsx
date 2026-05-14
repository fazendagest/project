import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  subtitle2?: string
  valueColor?: string
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
}

export function StatCard({
  title,
  value,
  subtitle,
  subtitle2,
  valueColor,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  trend,
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className={cn("text-sm lg:text-2xl font-bold mt-1 break-words leading-tight", valueColor)}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {subtitle2 && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle2}</p>
            )}
            {trend && (
              <p className={cn(
                'text-xs font-medium mt-1',
                trend.value >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn('rounded-xl p-3 ml-3 shrink-0 hidden sm:flex', iconBg)}>
              <Icon className={cn('h-6 w-6', iconColor)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
