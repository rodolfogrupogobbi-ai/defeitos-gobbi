import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Stage } from '@/types'
import { CLOSED_STAGES } from '@/types'

export function daysElapsed(dateStr: string): number {
  return differenceInCalendarDays(new Date(), parseISO(dateStr))
}

export function getAlertLevel(stage: Stage, receivedAt: string): 'yellow' | 'red' | null {
  if (stage === 'reimbursed_to_store' || CLOSED_STAGES.includes(stage)) return null
  const days = daysElapsed(receivedAt)
  if (days > 30) return 'red'
  if (days >= 15) return 'yellow'
  return null
}
