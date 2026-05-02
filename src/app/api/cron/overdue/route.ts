import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { differenceInCalendarDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { STAGE_LABELS } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

const RECIPIENTS = [
  'rodolfo.grupogobbi@gmail.com',
  'rodrigo.grupogobbi@gmail.com',
  'financeirogobbi@gmail.com',
  'faturametogobbi@gmail.com',
]

const CLOSED_STAGES = ['improcedente', 'doacao', 'nao_enviado', 'reimbursed_to_store']

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: defects } = await admin
    .from('defects')
    .select('id, product_name, client_name, received_at, current_stage, brand:brands(name)')
    .is('deleted_at', null)
    .not('current_stage', 'in', `(${CLOSED_STAGES.join(',')})`)

  if (!defects || defects.length === 0) {
    return NextResponse.json({ sent: false, reason: 'no active defects' })
  }

  const now = new Date()
  type Row = (typeof defects)[number] & { days: number }
  const red: Row[] = []
  const yellow: Row[] = []

  for (const d of defects) {
    const days = differenceInCalendarDays(now, parseISO(d.received_at))
    if (days > 30) red.push({ ...d, days })
    else if (days >= 15) yellow.push({ ...d, days })
  }

  if (red.length === 0 && yellow.length === 0) {
    return NextResponse.json({ sent: false, reason: 'no overdue defects' })
  }

  const today = format(now, 'dd/MM/yyyy', { locale: ptBR })

  function renderRows(items: Row[]) {
    return items
      .map(
        d => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px 12px; font-size: 14px;">${(d.brand as { name: string } | null)?.name ?? '—'}</td>
        <td style="padding: 8px 12px; font-size: 14px;">${d.product_name}</td>
        <td style="padding: 8px 12px; font-size: 14px;">${d.client_name}</td>
        <td style="padding: 8px 12px; font-size: 14px;">${STAGE_LABELS[d.current_stage as keyof typeof STAGE_LABELS]}</td>
        <td style="padding: 8px 12px; font-size: 14px; font-weight: bold;">${d.days} dias</td>
      </tr>`
      )
      .join('')
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #1e3a5f;">Defeitos em Atraso — ${today}</h2>
      ${
        red.length > 0
          ? `
        <h3 style="color: #dc2626; margin-top: 24px;">Crítico (mais de 30 dias) — ${red.length} defeito(s)</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background-color: #fee2e2;">
              <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #991b1b;">Marca</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #991b1b;">Produto</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #991b1b;">Cliente</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #991b1b;">Etapa</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #991b1b;">Tempo</th>
            </tr>
          </thead>
          <tbody>${renderRows(red)}</tbody>
        </table>`
          : ''
      }
      ${
        yellow.length > 0
          ? `
        <h3 style="color: #d97706; margin-top: 24px;">Atenção (15 a 30 dias) — ${yellow.length} defeito(s)</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background-color: #fef3c7;">
              <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #92400e;">Marca</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #92400e;">Produto</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #92400e;">Cliente</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #92400e;">Etapa</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #92400e;">Tempo</th>
            </tr>
          </thead>
          <tbody>${renderRows(yellow)}</tbody>
        </table>`
          : ''
      }
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
        Enviado automaticamente pelo sistema Defeitos Gobbi.
      </p>
    </div>
  `

  await resend.emails.send({
    from: 'Defeitos Gobbi <onboarding@resend.dev>',
    to: RECIPIENTS,
    subject: `Defeitos em Atraso — ${today}`,
    html,
  })

  return NextResponse.json({ sent: true, red: red.length, yellow: yellow.length })
}
