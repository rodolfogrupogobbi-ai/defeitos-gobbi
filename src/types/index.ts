export type Role = 'admin' | 'cashier'

export type Stage =
  | 'received'
  | 'in_progress'
  | 'photos_attached'
  | 'awaiting_reimbursement'
  | 'paid_to_client'
  | 'reimbursed_to_store'
  | 'improcedente'
  | 'doacao'
  | 'nao_enviado'

export type CommunicationChannel = 'system' | 'email' | 'whatsapp'
export type ReimbursementMethod = 'bank_transfer' | 'invoice'
export type WhatsAppTemplateStage = 'received' | 'awaiting_reimbursement' | 'paid_to_client'

export const STAGE_LABELS: Record<Stage, string> = {
  received: 'Recebido',
  in_progress: 'Processo Iniciado',
  photos_attached: 'Fotos Anexadas',
  awaiting_reimbursement: 'Aguardando Indenizacao',
  paid_to_client: 'Pago ao Cliente',
  reimbursed_to_store: 'Indenizado a Loja',
  improcedente: 'Improcedente',
  doacao: 'Doacao',
  nao_enviado: 'Nao Enviado',
}

export const ACTIVE_STAGES: Stage[] = [
  'received', 'in_progress', 'photos_attached',
  'awaiting_reimbursement', 'paid_to_client', 'reimbursed_to_store',
]

export const CLOSED_STAGES: Stage[] = ['improcedente', 'doacao', 'nao_enviado']

export interface Profile {
  id: string
  name: string
  role: Role
  created_at: string
}

export interface Company {
  id: string
  name: string
  slug: string
  active: boolean
}

export interface Brand {
  id: string
  name: string
  active: boolean
  created_at: string
}

export interface DefectType {
  id: string
  name: string
  active: boolean
  created_at: string
}

export interface Defect {
  id: string
  company_id: string
  brand_id: string
  product_name: string
  reference: string
  color: string | null
  size: string | null
  nf_number: string | null
  cod_use: string | null
  defect_type_id: string
  client_name: string
  client_phone: string
  client_code: string | null
  received_by: string
  received_at: string
  current_stage: Stage
  communication_channel: CommunicationChannel | null
  protocol_number: string | null
  photo_url: string | null
  piece_cost: number | null
  nf_factory: string | null
  client_amount_paid: number | null
  client_paid_at: string | null
  brand_reimbursement_amount: number | null
  brand_reimbursed_at: string | null
  reimbursement_method: ReimbursementMethod | null
  resolution_notes: string | null
  deleted_at: string | null
  deleted_by: string | null
  created_at: string
  updated_at: string
  company?: Company
  brand?: Brand
  defect_type?: DefectType
  received_by_profile?: Profile
  deleted_by_profile?: Profile
}

export interface DefectHistory {
  id: string
  defect_id: string
  from_stage: Stage | null
  to_stage: Stage
  changed_by: string
  changed_at: string
  notes: string | null
  whatsapp_sent: boolean
  changed_by_profile?: Profile
}

export interface WhatsAppTemplate {
  id: string
  stage: WhatsAppTemplateStage
  message_template: string
  updated_at: string
}

export interface BrandContact {
  id: string
  brand_id: string
  name: string
  phone: string | null
  email: string | null
  role: string | null
  created_at: string
}

export interface DefectPhoto {
  id: string
  defect_id: string
  url: string
  created_at: string
}
