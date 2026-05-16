export type Role = 'admin' | 'cashier'

export type Stage =
  | 'received'
  | 'dados_fiscais'
  | 'in_progress'
  | 'photos_attached'
  | 'aguardando_retorno_marca'
  | 'emissao_nf'
  | 'awaiting_reimbursement'
  | 'paid_to_client'
  | 'reimbursed_to_store'
  | 'improcedente'
  | 'doacao'
  | 'nao_enviado'

export type CommunicationChannel = 'system' | 'email' | 'whatsapp'
export type ReimbursementMethod = string
export type WhatsAppTemplateStage = 'received' | 'awaiting_reimbursement' | 'paid_to_client'

export const CLIENT_RESOLUTION_LABELS: Record<string, string> = {
  pagamento: 'Pagamento (dinheiro/PIX)',
  troca: 'Troca da Peça',
  conserto: 'Conserto',
  improcedente: 'Improcedente',
}

export const REIMBURSEMENT_LABELS: Record<string, string> = {
  invoice: 'Nota Fiscal',
  bank_transfer: 'Conta Corrente',
  troca_peca: 'Troca da Peça',
  enviado_outra_peca: 'Enviado Outra Peça',
  desconto_boleto: 'Desconto em Boleto',
}

export const STAGE_LABELS: Record<Stage, string> = {
  received: 'Recebido',
  dados_fiscais: 'Dados Fiscais',
  in_progress: 'Processo Iniciado',
  photos_attached: 'Fotos Anexadas',
  aguardando_retorno_marca: 'Aguardando Retorno da Marca',
  emissao_nf: 'Emissão da Nota Fiscal',
  awaiting_reimbursement: 'Aguardando Indenização',
  paid_to_client: 'Pago ao Cliente',
  reimbursed_to_store: 'Indenizado à Loja',
  improcedente: 'Improcedente',
  doacao: 'Doação',
  nao_enviado: 'Não Enviado',
}

export const ACTIVE_STAGES: Stage[] = [
  'received', 'photos_attached', 'dados_fiscais', 'in_progress',
  'aguardando_retorno_marca', 'emissao_nf',
  'awaiting_reimbursement', 'paid_to_client', 'reimbursed_to_store',
]

// Stages shown on the Visão Geral kanban board (active + improcedente for tracking)
export const KANBAN_STAGES: Stage[] = [...ACTIVE_STAGES, 'improcedente']

export const CLOSED_STAGES: Stage[] = ['improcedente', 'doacao', 'nao_enviado']

export const LOJA_ORIGEM_OPTIONS = [
  { value: 'MPB_FEMININO', label: 'MPB Feminino' },
  { value: 'MPB_MASCULINO', label: 'MPB Masculino' },
  { value: 'LA_LUNA', label: 'La Luna' },
  { value: 'OUTLET', label: 'Outlet' },
] as const

export const LOJA_ORIGEM_LABELS: Record<string, string> = {
  MPB_FEMININO: 'MPB Feminino',
  MPB_MASCULINO: 'MPB Masculino',
  LA_LUNA: 'La Luna',
  OUTLET: 'Outlet',
}

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
  received_by_name: string | null
  received_at: string
  current_stage: Stage
  communication_channel: CommunicationChannel | null
  protocol_number: string | null
  photo_url: string | null
  piece_cost: number | null
  nf_factory: string | null
  client_resolution_type: string | null
  client_amount_paid: number | null
  client_paid_at: string | null
  brand_reimbursement_amount: number | null
  brand_reimbursed_at: string | null
  reimbursement_method: ReimbursementMethod | null
  reimbursement_nf_number: string | null
  boleto_number: string | null
  boleto_original_value: number | null
  boleto_updated_value: number | null
  notes: string | null
  resolution_notes: string | null
  fiscal_icms: number | null
  fiscal_aliquota: number | null
  fiscal_frete: number | null
  fiscal_desconto: number | null
  fiscal_nf: string | null
  fiscal_endereco: string | null
  fiscal_razao_social: string | null
  loja_origem: string | null
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

export interface DefectBrandComm {
  id: string
  defect_id: string
  comm_date: string
  notes: string
  created_by: string
  created_at: string
  created_by_profile?: Profile
}
