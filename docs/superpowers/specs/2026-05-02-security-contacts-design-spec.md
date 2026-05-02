# Segurança + Contatos de Marcas + Design — Spec

**Goal:** Três melhorias ao Defeitos Gobbi: hardening de segurança, contatos por marca e redesign visual.

**Ordem de execução:** Segurança → Contatos → Design (evita retrabalho visual após mudanças de dados).

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase, Resend SDK.

---

## Sub-projeto 1: Segurança

### 1.1 Security Headers

Adicionar `headers()` em `next.config.ts`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 1.2 Rate Limiting no Login (client-side)

Em `src/app/(auth)/login/page.tsx`:
- Contador de tentativas falhas no state
- 5 falhas → lockout de 30 segundos com countdown visível
- Mensagem: "Muitas tentativas. Aguarde 30 segundos."
- Supabase já tem rate limiting server-side embutido

### 1.3 Campo `client_code` (código do cliente)

- Coluna `client_code TEXT` (nullable) na tabela `defects`
- Campo opcional no formulário de novo defeito, label "Código do cliente (PDV)"
- Exibido na página de detalhes do defeito
- Adicionado ao tipo `Defect` em `src/types/index.ts`

### 1.4 Mascaramento de Telefone

**Exibição padrão:** `(##) ••••-5678` (oculta os 4 dígitos do meio)

**Função utilitária:** `maskPhone(phone: string): string` em `src/lib/mask-phone.ts`

**Componente `PhoneReveal`** (`src/components/ui/PhoneReveal.tsx`):
- Exibe número mascarado + botão "Ver telefone"
- Click → modal com input de senha
- Submit → chama server action `POST /api/auth/verify-password`
  - Server action usa `supabase.auth.signInWithPassword({ email: user.email, password })` (precisa do email do usuário autenticado)
  - Retorna `{ ok: boolean }`
- Sucesso → número completo por 30 segundos com countdown
- Falha → "Senha incorreta"
- Aplica-se a todos os perfis (admin e caixa)

### 1.5 2FA por E-mail em Novo Dispositivo

**Fluxo completo:**

1. Login bem-sucedido em `/login` (Supabase seta cookie de sessão)
2. Login page chama `POST /api/auth/send-otp` (sem body — server action lê sessão)
   - Route lê userId da sessão Supabase server-side
   - Verifica cookie `trusted_device_<userId>` (httpOnly — só visível no servidor)
   - Se cookie presente → retorna `{ skip: true }` → login page redireciona para `/kanban`
   - Se cookie ausente → gera código 6 dígitos → salva em `device_verifications` (expira 10 min) → envia e-mail via Resend → retorna `{ otp_sent: true }` → login page redireciona para `/verificar-dispositivo`
3. Página `/verificar-dispositivo`: input 6 dígitos + botão Verificar
   - Obtém userId da sessão Supabase (server component ou client com session)
4. Submit → `POST /api/auth/verify-otp` com `{ code }`
   - Route lê userId da sessão Supabase server-side
   - Busca registro em `device_verifications` onde `user_id = userId AND expires_at > now()`
   - Se código correto → deleta registro → seta `Set-Cookie: trusted_device_<userId>=1; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax` → retorna `{ ok: true }`
   - Se inválido ou expirado → retorna `{ ok: false }`
5. Sucesso → redirecionar para `/kanban`
6. Falha → mostrar "Código inválido ou expirado"

**Proteção no `proxy.ts` (middleware):**
- Usuário autenticado sem cookie `trusted_device_<userId>` + rota diferente de `/login` e `/verificar-dispositivo` → redirecionar para `/verificar-dispositivo`
- Isso garante que mesmo quem "pular" o fluxo seja bloqueado

**Tabela nova:**
```sql
CREATE TABLE device_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Sem RLS — acesso apenas por service_role key via API routes
```

**Variáveis de ambiente:**
- `RESEND_API_KEY` — já configurada no Resend (API key: `re_Lad8Ve9N_...`)
- `NEXT_PUBLIC_APP_URL=https://defeitos-gobbi.vercel.app`

**Pacotes novos:** `resend`

### Arquivos do Sub-projeto 1

Criados:
- `supabase/migrations/001_security.sql`
- `src/app/api/auth/send-otp/route.ts`
- `src/app/api/auth/verify-otp/route.ts`
- `src/app/api/auth/verify-password/route.ts`
- `src/app/(auth)/verificar-dispositivo/page.tsx`
- `src/lib/mask-phone.ts`
- `src/components/ui/PhoneReveal.tsx`

Modificados:
- `next.config.ts`
- `src/proxy.ts` (ou `src/lib/proxy.ts` — verificar localização exata) — adicionar verificação de trusted_device cookie
- `src/app/(auth)/login/page.tsx`
- `src/types/index.ts`
- `src/components/defect/DefectForm.tsx`
- `src/app/(app)/defeito/[id]/page.tsx`

---

## Sub-projeto 2: Contatos das Marcas

### Data Model

```sql
CREATE TABLE brand_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE brand_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticado lê" ON brand_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin escreve" ON brand_contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

### Tipo TypeScript

```typescript
export interface BrandContact {
  id: string
  brand_id: string
  name: string
  phone: string | null
  email: string | null
  role: string | null
  created_at: string
}
```

### UI — `/cadastros/marcas`

Cada marca na lista expande ao clicar em "▼ Contatos":
- Lista de contatos existentes (nome, cargo, telefone com PhoneReveal, e-mail)
- Botão "Remover" ao lado de cada contato (admin only)
- Formulário inline "Adicionar contato": nome (obrigatório), cargo, telefone, e-mail + botão Adicionar (admin only)

### UI — Página de Detalhes do Defeito

Nova seção "Contatos da Marca" entre os dados do defeito e o histórico:
- Lista compacta de contatos da marca do defeito
- Campos: nome, cargo, telefone (PhoneReveal), e-mail com link `mailto:`
- Se não há contatos: "Nenhum contato cadastrado para esta marca"

### Arquivos do Sub-projeto 2

Criados:
- `supabase/migrations/002_brand_contacts.sql`

Modificados:
- `src/types/index.ts` — adicionar `BrandContact`
- `src/app/(app)/cadastros/marcas/page.tsx` — reescrita com accordion de contatos
- `src/app/(app)/defeito/[id]/page.tsx` — seção de contatos da marca

---

## Sub-projeto 3: Design

### Paleta de Cores

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#1e3a5f` | Nav, headers |
| `--color-accent` | `#f97316` | CTAs, botões primários |
| `--color-bg` | `#f8fafc` | Fundo das páginas |
| `--color-surface` | `#ffffff` | Cards, modais |
| `--color-text` | `#0f172a` | Texto principal |
| `--color-muted` | `#64748b` | Texto secundário |

Definidas em `src/app/globals.css` como CSS custom properties dentro de `@layer base`.

### Componentes Redesenhados

**Login (`src/app/(auth)/login/page.tsx`):**
- Fundo em gradiente suave (slate-50 → slate-100)
- Card com borda top colorida `#1e3a5f` (4px)
- Logotipo "GG" em círculo navy acima do card
- Botão "Entrar" em laranja (`#f97316`)

**Navegação (`src/components/AppNav.tsx`):**
- Sidebar fixa 220px, fundo `#1e3a5f`
- Ícones Lucide + labels em branco
- Item ativo com destaque laranja na borda esquerda + fundo semi-transparente
- Nome do usuário no rodapé da sidebar

**Cards do Kanban (`src/components/kanban/DefectCard.tsx`):**
- Badges de etapa com cor específica por estágio
- Alerta amarelo (15 dias) e vermelho (30 dias) mais visíveis
- Fonte menor e hierarquia mais clara (produto em bold, cliente em muted)

**Colunas do Kanban (`src/components/kanban/KanbanColumn.tsx`):**
- Header com badge de contagem de itens

**Layout geral (`src/app/(app)/layout.tsx`):**
- Fundo `#f8fafc` nas páginas

### Arquivos do Sub-projeto 3

Modificados:
- `src/app/globals.css`
- `src/app/(auth)/login/page.tsx`
- `src/components/AppNav.tsx`
- `src/components/kanban/DefectCard.tsx`
- `src/components/kanban/KanbanColumn.tsx`
- `src/app/(app)/layout.tsx`

---

## Supabase — Execução das Migrations

As migrations serão executadas via Supabase Management API (não via CLI), usando a service_role key. Cada arquivo SQL em `supabase/migrations/` é executado via `POST https://vwkkmdeibwdrsywramfy.supabase.co/rest/v1/rpc` ou via query direta com a API de database.

## Vercel — Variáveis de Ambiente

Após implementação, adicionar via Vercel REST API:
- `RESEND_API_KEY` (production)
- `NEXT_PUBLIC_APP_URL=https://defeitos-gobbi.vercel.app` (production)
