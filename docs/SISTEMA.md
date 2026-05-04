# Sistema Defeitos Gobbi — Documentação Completa

> Referência para futuras alterações. Atualizado em 2026-05-04.

---

## Visão Geral

Sistema interno do Grupo Gobbi para controlar o fluxo de peças com defeito — desde o recebimento até a indenização da marca ou resolução com o cliente.

- **App:** https://defeitos-gobbi.vercel.app  
- **GitHub:** https://github.com/rodolfogrupogobbi-ai/defeitos-gobbi  
- **Supabase:** https://supabase.com/dashboard/project/vwkkmdeibwdrsywramfy  
- **Vercel:** https://vercel.com/dashboard

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| Estilo | TailwindCSS v4 |
| Banco + Auth + Storage | Supabase (PostgreSQL) |
| Email | Resend (`onboarding@resend.dev` — sandbox) |
| Deploy | Vercel (auto-deploy no push do GitHub) |

---

## Variáveis de Ambiente (Vercel + .env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
CRON_SECRET=          ← gerado pelo Vercel para autenticar o cron diário
```

---

## Funcionalidades

### Kanban (`/kanban`)
- 6 etapas ativas: Recebido → Processo Iniciado → Fotos Anexadas → Aguardando Indenização → Pago ao Cliente → Indenizado a Loja
- 3 desfechos alternativos: Improcedente, Doação, Não Enviado
- Alertas visuais: amarelo (≥15 dias), vermelho (>30 dias)
- Busca por cliente, marca, produto, referência ou NF

### Defeito — Detalhe (`/defeito/[id]`)
- Dados completos do produto e cliente
- **Telefone protegido:** exibido apenas após confirmação de senha (nunca exposto no HTML)
- Até 3 fotos (tabela `defect_photos`)
- Avanço de etapa com notas e envio automático de WhatsApp
- Histórico completo de movimentações
- Contatos da marca associada
- Botão Editar (todos os usuários) e Excluir (só admin)

### Cadastrar Defeito (`/defeito/novo`)
Campos: empresa, marca, produto, referência, cor, tamanho, NF venda, NF fábrica, cód. Use, custo da peça, valor pago pelo cliente, tipo de defeito, cliente (nome, telefone, código PDV), data de recebimento.

### Editar Defeito (`/defeito/[id]/editar`)
Mesmos campos do cadastro. Não altera etapa atual, histórico ou dados financeiros de indenização.

### Painel Gerencial (`/painel`)
- 8 indicadores: total ativo, recebidos hoje, alertas, pagos, indenizados, encerrados, tempo médio, custo total
- Filtros por empresa, marca, etapa, período
- Exportação Excel

### Relatório de Excluídos (`/painel/excluidos`)
Apenas admin. Lista defeitos soft-deleted com quem excluiu e quando.

### Cadastros Admin (`/cadastros`)
- **Marcas:** ativar/desativar + gerenciar contatos de cada marca
- **Tipos de defeito:** ativar/desativar
- **Usuários:** criar com role admin ou caixa
- **Templates WhatsApp:** mensagens para etapas 1, 4 e 5

### Email Diário de Atrasos
Cron às 9h BRT (12h UTC). Envia relatório para:
- rodolfo.grupogobbi@gmail.com
- rodrigo.grupogobbi@gmail.com
- financeirogobbi@gmail.com
- faturametogobbi@gmail.com

Inclui tabela vermelha (>30 dias) e amarela (15–30 dias) com marca, produto, cliente, etapa e dias.

### 2FA por Dispositivo (`/verificar-dispositivo`)
- OTP de 6 dígitos enviado por email no 1º acesso de cada dispositivo
- Cookie `trusted_device_{userId}` (httpOnly, secure, 30 dias)
- Rate limit: 90 segundos entre reenvios
- Código errado: expira imediatamente (preserva janela de rate limit)

---

## Arquitetura de Arquivos

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx               — tela de login
│   │   └── verificar-dispositivo/page.tsx — 2FA OTP
│   ├── (app)/
│   │   ├── layout.tsx                   — sidebar + main layout
│   │   ├── kanban/page.tsx              — busca defects, renderiza KanbanBoard
│   │   ├── defeito/
│   │   │   ├── novo/page.tsx            — formulário novo defeito
│   │   │   └── [id]/
│   │   │       ├── page.tsx             — detalhe do defeito
│   │   │       └── editar/page.tsx      — formulário de edição
│   │   ├── painel/
│   │   │   ├── page.tsx                 — painel gerencial
│   │   │   └── excluidos/page.tsx       — relatório de excluídos (admin)
│   │   └── cadastros/
│   │       ├── marcas/page.tsx
│   │       ├── tipos/page.tsx
│   │       ├── usuarios/page.tsx
│   │       └── templates/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── send-otp/route.ts        — envia OTP por email
│       │   ├── verify-otp/route.ts      — valida OTP, seta cookie trusted_device
│       │   └── verify-password/route.ts — valida senha atual do usuário
│       ├── defects/
│       │   └── [id]/
│       │       ├── route.ts             — PATCH (editar) e DELETE (soft-delete, admin)
│       │       └── phone/route.ts       — GET telefone do cliente (após senha)
│       ├── cron/
│       │   └── overdue/route.ts         — email diário de atrasos (CRON_SECRET)
│       ├── users/route.ts               — POST criar usuário (admin)
│       └── whatsapp-log/route.ts        — registra envio de WhatsApp no histórico
├── components/
│   ├── AppNav.tsx                       — sidebar de navegação
│   ├── defect/
│   │   ├── DefectForm.tsx               — formulário novo defeito
│   │   ├── DefectEditForm.tsx           — formulário edição
│   │   ├── DeleteDefectButton.tsx       — botão excluir com confirmação (admin)
│   │   ├── HistoryList.tsx              — timeline de histórico
│   │   ├── PhotoUpload.tsx              — upload/remoção de até 3 fotos
│   │   ├── StageAdvancer.tsx            — avança etapa + formulários contextuais
│   │   └── WhatsAppButton.tsx           — gera link WhatsApp com template
│   ├── kanban/
│   │   ├── KanbanBoard.tsx              — busca + layout de colunas
│   │   ├── KanbanColumn.tsx             — coluna individual
│   │   └── DefectCard.tsx               — card do defeito
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── PhoneReveal.tsx              — exibe telefone só após confirmação de senha
│       └── Select.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts                    — createClient() com cookies de sessão
│   │   ├── client.ts                    — createClient() para componentes cliente
│   │   └── admin.ts                     — createAdminClient() com service_role
│   ├── date-utils.ts                    — daysElapsed, getAlertLevel
│   └── mask-phone.ts                    — mascara telefone (ex: (11) ••••-1234)
├── types/index.ts                       — tipos TypeScript de toda a app
└── middleware.ts                        — auth guard, 2FA guard, redirect /login
```

---

## Banco de Dados (Supabase)

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `profiles` | Usuários internos: id (= auth.users), name, role (admin/cashier) |
| `companies` | Empresas do grupo: MPB, BY, RRPB, GOBBI, LA LUNA, GS |
| `brands` | Marcas de roupas (active) |
| `brand_contacts` | Contatos de cada marca (nome, telefone, email, cargo) |
| `defect_types` | Tipos de defeito (active) |
| `defects` | Defeito principal (todos os campos + soft delete) |
| `defect_photos` | Fotos do defeito (até 3, referencia `defect_id`) |
| `defect_history` | Histórico de mudanças de etapa |
| `whatsapp_templates` | Templates por etapa (received, awaiting_reimbursement, paid_to_client) |
| `device_verifications` | Códigos OTP temporários para 2FA |

### Campos importantes de `defects`

```sql
id, company_id, brand_id, product_name, reference, color, size,
nf_number,            -- NF de venda ao cliente
nf_factory,           -- NF de origem da fábrica
cod_use,
piece_cost,           -- custo da peça (numeric)
client_amount_paid,   -- valor pago ao cliente (numeric)
client_paid_at,
brand_reimbursement_amount,
brand_reimbursed_at,
reimbursement_method, -- bank_transfer | invoice
defect_type_id,
client_name, client_phone, client_code,
received_by, received_at,
current_stage,
communication_channel, protocol_number,
resolution_notes,
photo_url,            -- coluna legada (migrado para defect_photos)
deleted_at, deleted_by  -- soft delete
```

### RLS (Row Level Security)
Todas as tabelas têm RLS habilitado. A função `public.is_app_user()` (SECURITY DEFINER) verifica se o usuário autenticado existe na tabela `profiles` — impede que usuários criados diretamente no Supabase acessem dados. Signup de novos usuários está **desabilitado** no painel do Supabase.

---

## Segurança

| Mecanismo | Descrição |
|---|---|
| Auth Supabase | JWT via cookie de sessão |
| 2FA dispositivo | OTP por email, cookie trusted_device 30 dias |
| RLS + is_app_user() | Bloqueia qualquer conta não cadastrada em profiles |
| Signup desabilitado | Ninguém pode se auto-cadastrar |
| Middleware | Bloqueia todas as rotas não autenticadas |
| API allowlist | PATCH só aceita campos explicitamente listados |
| PhoneReveal | Telefone nunca vai ao browser via RSC — só via API após senha |
| CRON_SECRET | Autenticação do cron diário |

---

## Roles de Usuário

| Role | O que pode fazer |
|---|---|
| `admin` | Tudo: incluindo excluir defeitos, ver relatório de excluídos, criar usuários |
| `cashier` | Registrar e editar defeitos, avançar etapas, adicionar marcas/tipos |

---

## Cron Job

**Arquivo:** `vercel.json` na raiz do projeto  
**Schedule:** `0 12 * * *` (12h UTC = 9h BRT)  
**Endpoint:** `GET /api/cron/overdue`  
**Auth:** `Authorization: Bearer {CRON_SECRET}`

O middleware libera `/api/cron/` sem sessão de usuário — a autenticação é feita exclusivamente pelo CRON_SECRET no handler.

---

## Como Adicionar Usuários

1. Acessar `/cadastros/usuarios` como admin
2. Preencher nome, email, senha e role
3. O sistema cria via Supabase Admin API (service_role) — não usa signup público

---

## Storage (Supabase)

**Bucket:** `defect-photos`  
**Path novo:** `{defectId}/{timestamp}.{ext}` (multi-foto)  
**Path legado:** `{defectId}.{ext}` (migrado para tabela `defect_photos`)

---

## Possíveis Melhorias Futuras

- Verificar domínio no Resend para emails não irem para spam (trocar `onboarding@resend.dev` por `sistema@grupogobbi.com.br`)
- Paginação no painel gerencial (quando volume crescer)
- Relatório financeiro mensal por marca
- Notificação por WhatsApp no lugar de (ou além do) email de atrasos
