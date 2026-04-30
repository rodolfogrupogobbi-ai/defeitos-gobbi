import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'yellow' | 'red' | 'green' | 'gray'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      {
        'bg-blue-100 text-blue-800': variant === 'default',
        'bg-yellow-100 text-yellow-800': variant === 'yellow',
        'bg-red-100 text-red-800': variant === 'red',
        'bg-green-100 text-green-800': variant === 'green',
        'bg-gray-100 text-gray-800': variant === 'gray',
      },
      className
    )}>
      {children}
    </span>
  )
}
