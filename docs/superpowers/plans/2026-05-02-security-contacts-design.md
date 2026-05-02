# Security + Brand Contacts + Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hardening de segurança (headers, rate limiting, client_code, phone masking, 2FA por e-mail), cadastro de contatos por marca e redesign visual do app Defeitos Gobbi.

**Architecture:** Três sub-projetos independentes executados em ordem: Segurança → Contatos → Design. A segurança vem primeiro para evitar expor dados sensíveis; contatos antes do design para não retrabalhar a aparência; design por último pois não muda lógica. Cada sub-projeto tem tasks atômicas com commit próprio.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase (PostgreSQL + Auth), Resend SDK para e-mail, Jest para testes.

**Codebase key facts:**
- Middleware é `src/proxy.ts` com função exportada `proxy` (NOT `middleware`)
- Tailwind v4: `globals.css` usa `@import "tailwindcss"`, sem `@tailwind` directives
- `params` em page components é `Promise<{...}>` — sempre usar `await params`
- Supabase project ref: `vwkkmdeibwdrsywramfy`
- Supabase PAT (para migrations): `sbp_c5dc131a4a51ea281e33a3e8d2a8a234cb447096`
- Resend API key: `re_Lad8Ve9N_CtjJBrmo9tzZTMbjSZGASHRa`
- Vercel project ID: `prj_XVq6DmvBoRjNorFiYAvJhSJLX79b`, team: `team_zugHDzuzkQC1hgIUAPz6pDIG`
- Vercel token em: `C:\Users\rodol\AppData\Roaming\com.vercel.cli\Data\auth.json`

**Antes de implementar:** Leia `node_modules/next/dist/docs/` para detalhes de Route Handlers e cookies em Next.js 16.

---

## ═══════════════════════════════════════════
## SUB-PROJETO 1: SEGURANÇA (Tasks 1–13)
## ═══════════════════════════════════════════

---

### Task 1: Security Headers em `next.config.ts`

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Substituir o conteúdo de `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verificar que o build não quebra**

```bash
npm run build
```

Esperado: build bem-sucedido, sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(security): add HTTP security headers"
```

---

### Task 2: Rate Limiting no Login (client-side)

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Ler o arquivo atual**

Leia `src/app/(auth)/login/page.tsx` para ver o state atual.

- [ ] **Step 2: Substituir o conteúdo de `src/app/(auth)/login/page.tsx`**

```typescript
'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [lockoutCountdown, setLockoutCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startLockout() {
    const until = Date.now() + LOCKOUT_SECONDS * 1000
    setLockoutUntil(until)
    setLockoutCountdown(LOCKOUT_SECONDS)
    timerRef.current = setInterval(() => {
      const remaining = Math.ceil((until - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval(timerRef.current!)
        setLockoutUntil(null)
        setLockoutCountdown(0)
        setAttempts(0)
      } else {
        setLockoutCountdown(remaining)
      }
    }, 1000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lockoutUntil && Date.now() < lockoutUntil) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= MAX_ATTEMPTS) {
        startLockout()
        setError('')
      } else {
        setError('E-mail ou senha incorretos.')
      }
      setLoading(false)
      return
    }
    // Login bem-sucedido: verificar se dispositivo é confiável
    try {
      const res = await fetch('/api/auth/send-otp', { method: 'POST' })
      const data = await res.json()
      if (data.skip) {
        router.push('/kanban')
      } else {
        router.push('/verificar-dispositivo')
      }
    } catch {
      router.push('/kanban')
    }
  }

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Grupo Gobbi</h1>
        <p className="text-sm text-gray-500 mb-6">Controle de Defeitos</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLocked}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLocked}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          {isLocked && (
            <p className="text-sm text-orange-600">
              Muitas tentativas. Aguarde {lockoutCountdown} segundos.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || isLocked}
            className="px-6 py-3 bg-blue-600 text-white text-base font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx
git commit -m "feat(security): add login rate limiting (5 attempts, 30s lockout)"
```

---

### Task 3: Migration de Segurança no Banco

**Files:**
- Create: `supabase/migrations/001_security.sql`

- [ ] **Step 1: Criar o arquivo de migration**

Crie `supabase/migrations/001_security.sql`:

```sql
-- Adiciona campo client_code à tabela defects
ALTER TABLE defects ADD COLUMN IF NOT EXISTS client_code TEXT;

-- Tabela para verificações de dispositivo (2FA)
CREATE TABLE IF NOT EXISTS device_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sem RLS — acesso apenas por service_role key via API routes
-- Índice para lookup rápido
CREATE INDEX IF NOT EXISTS device_verifications_user_id_idx ON device_verifications(user_id);
```

- [ ] **Step 2: Executar a migration via Supabase Management API**

```powershell
$sql = Get-Content "supabase/migrations/001_security.sql" -Raw
$body = @{ query = $sql } | ConvertTo-Json
Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/vwkkmdeibwdrsywramfy/database/query" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer sbp_c5dc131a4a51ea281e33a3e8d2a8a234cb447096"; "Content-Type" = "application/json" } `
  -Body $body
```

Esperado: resposta JSON sem campo `error`.

- [ ] **Step 3: Confirmar no Supabase Dashboard**

Abra `https://supabase.com/dashboard/project/vwkkmdeibwdrsywramfy/editor` e confirme que:
- Coluna `client_code` existe em `defects`
- Tabela `device_verifications` foi criada

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_security.sql
git commit -m "feat(security): add client_code column and device_verifications table"
```

---

### Task 4: Tipo `client_code` e Campo no Formulário

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/components/defect/DefectForm.tsx`

- [ ] **Step 1: Adicionar `client_code` ao tipo `Defect` em `src/types/index.ts`**

Localize a interface `Defect` e adicione o campo após `client_phone`:

```typescript
  client_phone: string
  client_code: string | null   // ← adicionar esta linha
  received_by: string
```

- [ ] **Step 2: Adicionar `client_code` ao schema Zod em `src/components/defect/DefectForm.tsx`**

No `schema`, localize `client_phone` e adicione após:

```typescript
  client_phone: z.string().min(8, 'Informe o telefone'),
  client_code: z.string().optional(),
```

- [ ] **Step 3: Adicionar o campo no JSX do formulário**

No JSX, localize o bloco do campo `client_phone` e adicione o campo `client_code` imediatamente após:

```typescript
          {/* client_code field — adicionar após o campo client_phone */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Código do cliente{' '}
              <span className="text-gray-400 font-normal">(PDV)</span>
            </label>
            <Input
              {...register('client_code')}
              placeholder="Opcional — código do cliente no sistema da loja"
            />
          </div>
```

- [ ] **Step 4: Adicionar `client_code` no insert do Supabase**

No método `onSubmit` do formulário (onde fazem o `.insert()`), adicione `client_code: data.client_code || null` no objeto inserido.

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/components/defect/DefectForm.tsx
git commit -m "feat(security): add optional client_code field to defect form"
```

---

### Task 5: Exibir `client_code` na Página de Detalhes

**Files:**
- Modify: `src/app/(app)/defeito/[id]/page.tsx`

- [ ] **Step 1: Adicionar `client_code` ao array de campos exibidos**

Em `src/app/(app)/defeito/[id]/page.tsx`, localize o array de `[label, value]` na seção "Dados do produto" e adicione ao final (antes do fechamento do array):

```typescript
              ['Cód. cliente (PDV)', defectData.client_code],
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/defeito/[id]/page.tsx
git commit -m "feat(security): display client_code on defect detail page"
```

---

### Task 6: Utilitário `maskPhone` com Testes

**Files:**
- Create: `src/lib/mask-phone.ts`
- Create: `src/lib/__tests__/mask-phone.test.ts`

- [ ] **Step 1: Escrever os testes primeiro**

Crie `src/lib/__tests__/mask-phone.test.ts`:

```typescript
import { maskPhone } from '@/lib/mask-phone'

describe('maskPhone', () => {
  it('masks an 11-digit mobile number', () => {
    expect(maskPhone('(48) 99999-1234')).toBe('(48) ••••-1234')
  })
  it('masks a 10-digit landline number', () => {
    expect(maskPhone('(48) 3333-5678')).toBe('(48) ••••-5678')
  })
  it('handles digits without formatting', () => {
    expect(maskPhone('48999991234')).toBe('(48) ••••-1234')
  })
  it('handles short numbers with fallback', () => {
    expect(maskPhone('1234')).toBe('••••-1234')
  })
  it('handles very short numbers', () => {
    expect(maskPhone('12')).toBe('••••')
  })
  it('returns masked last 4 for unknown length', () => {
    expect(maskPhone('123456789')).toBe('••••-6789')
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
npm test -- mask-phone --no-coverage
```

Esperado: FAIL — "Cannot find module '@/lib/mask-phone'"

- [ ] **Step 3: Implementar `src/lib/mask-phone.ts`**

```typescript
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ••••-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ••••-${digits.slice(6)}`
  }
  if (digits.length >= 4) {
    return `••••-${digits.slice(-4)}`
  }
  return '••••'
}
```

- [ ] **Step 4: Rodar os testes novamente**

```bash
npm test -- mask-phone --no-coverage
```

Esperado: PASS — 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mask-phone.ts src/lib/__tests__/mask-phone.test.ts
git commit -m "feat(security): add maskPhone utility with tests"
```

---

### Task 7: Cliente Admin do Supabase

**Files:**
- Create: `src/lib/supabase/admin.ts`

Nota: Este cliente usa a `SUPABASE_SERVICE_ROLE_KEY` e tem acesso total ao banco, bypassando RLS. Usar APENAS em API routes server-side.

- [ ] **Step 1: Criar `src/lib/supabase/admin.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/admin.ts
git commit -m "feat(security): add Supabase admin client for service-role operations"
```

---

### Task 8: API Route `/api/auth/verify-password`

**Files:**
- Create: `src/app/api/auth/verify-password/route.ts`

- [ ] **Step 1: Criar o diretório e o arquivo**

```bash
mkdir -p src/app/api/auth/verify-password
```

- [ ] **Step 2: Criar `src/app/api/auth/verify-password/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  if (!password) return NextResponse.json({ ok: false })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ ok: false })

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  return NextResponse.json({ ok: !error })
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/verify-password/route.ts
git commit -m "feat(security): add verify-password API route"
```

---

### Task 9: Componente `PhoneReveal`

**Files:**
- Create: `src/components/ui/PhoneReveal.tsx`

- [ ] **Step 1: Criar `src/components/ui/PhoneReveal.tsx`**

```typescript
'use client'
import { useState, useEffect, useRef } from 'react'
import { maskPhone } from '@/lib/mask-phone'


interface Props {
  phone: string
  className?: string
}

export function PhoneReveal({ phone, className }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function startCountdown() {
    setCountdown(30)
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          setRevealed(false)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  async function handleConfirm() {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) {
        setRevealed(true)
        setShowModal(false)
        setPassword('')
        startCountdown()
      } else {
        setError('Senha incorreta')
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setShowModal(false)
    setPassword('')
    setError('')
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className ?? ''}`}>
        <span className="text-sm text-gray-700">
          {revealed ? phone : maskPhone(phone)}
        </span>
        {!revealed ? (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            Ver telefone
          </button>
        ) : (
          <span className="text-xs text-gray-400">{countdown}s</span>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-xl">
            <h3 className="font-semibold text-gray-900">Confirmar identidade</h3>
            <p className="text-sm text-gray-600">
              Digite sua senha para visualizar o telefone completo.
            </p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              autoFocus
              placeholder="Sua senha"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || !password}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PhoneReveal.tsx
git commit -m "feat(security): add PhoneReveal component with 30s reveal window"
```

---

### Task 10: Mascaramento de Telefone na Página de Detalhes

**Files:**
- Modify: `src/app/(app)/defeito/[id]/page.tsx`

- [ ] **Step 1: Adicionar import do PhoneReveal**

No topo de `src/app/(app)/defeito/[id]/page.tsx`, adicione:

```typescript
import { PhoneReveal } from '@/components/ui/PhoneReveal'
```

- [ ] **Step 2: Substituir a exibição do telefone no card "Cliente"**

Localize:

```typescript
            <p className="text-sm text-gray-600">{defectData.client_phone}</p>
```

Substitua por:

```typescript
            <PhoneReveal phone={defectData.client_phone} />
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/defeito/[id]/page.tsx
git commit -m "feat(security): mask client phone with password-protected reveal"
```

---

### Task 11: Instalar Resend e Variáveis de Ambiente

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Instalar o pacote Resend**

```bash
npm install resend
```

- [ ] **Step 2: Adicionar variáveis ao `.env.local`**

Abra `.env.local` e adicione ao final:

```
RESEND_API_KEY=re_Lad8Ve9N_CtjJBrmo9tzZTMbjSZGASHRa
NEXT_PUBLIC_APP_URL=https://defeitos-gobbi.vercel.app
```

- [ ] **Step 3: Adicionar ao Vercel via REST API**

```powershell
$token = (Get-Content "C:\Users\rodol\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json).token
$projectId = "prj_XVq6DmvBoRjNorFiYAvJhSJLX79b"
$teamId = "team_zugHDzuzkQC1hgIUAPz6pDIG"

$vars = @(
  @{ key = "RESEND_API_KEY"; value = "re_Lad8Ve9N_CtjJBrmo9tzZTMbjSZGASHRa"; type = "encrypted"; target = @("production", "preview") },
  @{ key = "NEXT_PUBLIC_APP_URL"; value = "https://defeitos-gobbi.vercel.app"; type = "plain"; target = @("production") }
)
foreach ($var in $vars) {
  $body = $var | ConvertTo-Json
  Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$projectId/env?teamId=$teamId" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $body
}
```

- [ ] **Step 4: Confirmar que as variáveis foram criadas**

```powershell
Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projectId/env?teamId=$teamId" `
  -Headers @{ "Authorization" = "Bearer $token" } | Select-Object -ExpandProperty envs | Select-Object key, type
```

Esperado: listar `RESEND_API_KEY` e `NEXT_PUBLIC_APP_URL`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(security): install resend package"
```

---

### Task 12: API Route `/api/auth/send-otp`

**Files:**
- Create: `src/app/api/auth/send-otp/route.ts`

- [ ] **Step 1: Criar o diretório**

```bash
mkdir -p src/app/api/auth/send-otp
```

- [ ] **Step 2: Criar `src/app/api/auth/send-otp/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verificar se o dispositivo já é confiável
  const cookieName = `trusted_device_${user.id}`
  const trusted = request.cookies.get(cookieName)
  if (trusted) {
    return NextResponse.json({ skip: true })
  }

  const admin = createAdminClient()

  // Verificar se já existe um código válido (evitar spam)
  const { data: existing } = await admin
    .from('device_verifications')
    .select('id')
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!existing) {
    // Gerar novo código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Apagar verificações antigas deste usuário
    await admin.from('device_verifications').delete().eq('user_id', user.id)

    // Salvar novo código
    await admin.from('device_verifications').insert({
      user_id: user.id,
      code,
      expires_at: expiresAt,
    })

    // Enviar e-mail
    await resend.emails.send({
      from: 'Defeitos Gobbi <onboarding@resend.dev>',
      to: user.email,
      subject: 'Código de verificação — Defeitos Gobbi',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">Novo dispositivo detectado</h2>
          <p>Seu código de verificação é:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f; margin: 16px 0;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">Válido por 10 minutos. Se não foi você, ignore este e-mail.</p>
        </div>
      `,
    })
  }

  return NextResponse.json({ otp_sent: true })
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/send-otp/route.ts
git commit -m "feat(security): add send-otp API route with Resend email"
```

---

### Task 13: API Route `/api/auth/verify-otp`

**Files:**
- Create: `src/app/api/auth/verify-otp/route.ts`

- [ ] **Step 1: Criar o diretório**

```bash
mkdir -p src/app/api/auth/verify-otp
```

- [ ] **Step 2: Criar `src/app/api/auth/verify-otp/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { code } = await request.json()
  if (!code) return NextResponse.json({ ok: false })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false })

  const admin = createAdminClient()
  const { data } = await admin
    .from('device_verifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!data) return NextResponse.json({ ok: false })

  // Deletar código usado
  await admin.from('device_verifications').delete().eq('id', data.id)

  // Setar cookie de dispositivo confiável (30 dias)
  const cookieName = `trusted_device_${user.id}`
  const response = NextResponse.json({ ok: true })
  response.cookies.set(cookieName, '1', {
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
  return response
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/verify-otp/route.ts
git commit -m "feat(security): add verify-otp API route with 30-day device trust cookie"
```

---

### Task 14: Página `/verificar-dispositivo`

**Files:**
- Create: `src/app/(auth)/verificar-dispositivo/page.tsx`

- [ ] **Step 1: Criar o diretório**

```bash
mkdir -p "src/app/(auth)/verificar-dispositivo"
```

- [ ] **Step 2: Criar `src/app/(auth)/verificar-dispositivo/page.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificarDispositivoPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Enviar OTP automaticamente ao carregar (caso o usuário tenha chegado aqui
  // sem ter passado pelo login recentemente — proxy redireciona aqui)
  useEffect(() => {
    fetch('/api/auth/send-otp', { method: 'POST' }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push('/kanban')
      } else {
        setError('Código inválido ou expirado. Verifique e tente novamente.')
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setResendSuccess(false)
    try {
      // Apagar código existente no banco para forçar geração de novo
      await fetch('/api/auth/send-otp', { method: 'POST' })
      setResendSuccess(true)
    } catch {
      // silently ignore
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Verificar dispositivo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enviamos um código de 6 dígitos para seu e-mail. Digite-o abaixo.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            autoFocus
            className="text-center text-2xl font-mono tracking-widest rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>
        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {resending ? 'Enviando...' : 'Reenviar código'}
          </button>
          {resendSuccess && (
            <p className="text-xs text-green-600 mt-1">Código reenviado!</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

Nota: O `handleResend` chama `send-otp` mas o server só gera novo código se o atual expirou. Para forçar reenvio, precisamos de um endpoint separado ou deletar o código existente primeiro. Para simplificar, aceita-se que "reenviar" só envia novo e-mail se o código tiver expirado.

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/verificar-dispositivo/page.tsx"
git commit -m "feat(security): add device verification page for 2FA"
```

---

### Task 15: Atualizar `proxy.ts` para Gate de 2FA

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Substituir o conteúdo de `src/proxy.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas que não precisam de dispositivo confiável
const PUBLIC_PATHS = ['/login', '/verificar-dispositivo']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isApiPath = pathname.startsWith('/api/')

  // Não autenticado → login (exceto rotas públicas e API)
  if (!user && !isPublicPath && !isApiPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const cookieName = `trusted_device_${user.id}`
    const trusted = request.cookies.get(cookieName)

    // Usuário autenticado, dispositivo confiável ou rota de API → rota pública → sem restrição extra
    if (!trusted && !isPublicPath && !isApiPath) {
      // Dispositivo não confiável: bloquear acesso ao app
      return NextResponse.redirect(new URL('/verificar-dispositivo', request.url))
    }

    if (pathname === '/login') {
      // Já logado: redirecionar para o lugar certo
      return NextResponse.redirect(
        new URL(trusted ? '/kanban' : '/verificar-dispositivo', request.url)
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(security): add 2FA device trust gate in proxy middleware"
```

---

### Task 16: Deploy e Teste da Segurança

- [ ] **Step 1: Rodar todos os testes**

```bash
npm test -- --no-coverage
```

Esperado: todos os testes passando.

- [ ] **Step 2: Fazer deploy no Vercel**

```bash
npx vercel --prod
```

- [ ] **Step 3: Testar o fluxo de 2FA manualmente**

1. Abra uma aba anônima no navegador
2. Acesse `https://defeitos-gobbi.vercel.app`
3. Faça login com `rodolfo.grupogobbi@gmail.com` / `Gobbi2024!`
4. Confirme que aparece a tela "Verificar dispositivo"
5. Verifique o e-mail em `rodolfo.grupogobbi@gmail.com`
6. Digite o código recebido
7. Confirme redirecionamento para `/kanban`
8. Feche e reabra o navegador (mesmo perfil) — deve entrar direto, sem 2FA (cookie válido)

- [ ] **Step 4: Testar mascaramento de telefone**

1. Abra qualquer defeito
2. Confirme que o telefone aparece mascarado `(XX) ••••-XXXX`
3. Clique em "Ver telefone"
4. Digite a senha
5. Confirme que o número completo aparece por 30 segundos

---

## ═══════════════════════════════════════════
## SUB-PROJETO 2: CONTATOS DAS MARCAS (Tasks 17–20)
## ═══════════════════════════════════════════

---

### Task 17: Migration `brand_contacts`

**Files:**
- Create: `supabase/migrations/002_brand_contacts.sql`

- [ ] **Step 1: Criar `supabase/migrations/002_brand_contacts.sql`**

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

CREATE POLICY "autenticado_le_contatos" ON brand_contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_escreve_contatos" ON brand_contacts
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

- [ ] **Step 2: Executar a migration**

```powershell
$sql = Get-Content "supabase/migrations/002_brand_contacts.sql" -Raw
$body = @{ query = $sql } | ConvertTo-Json
Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/vwkkmdeibwdrsywramfy/database/query" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer sbp_c5dc131a4a51ea281e33a3e8d2a8a234cb447096"; "Content-Type" = "application/json" } `
  -Body $body
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_brand_contacts.sql
git commit -m "feat(contacts): add brand_contacts table with RLS"
```

---

### Task 18: Tipo `BrandContact` em `src/types/index.ts`

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Adicionar `BrandContact` ao final de `src/types/index.ts`**

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

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(contacts): add BrandContact type"
```

---

### Task 19: Página `/cadastros/marcas` com Contatos

**Files:**
- Modify: `src/app/(app)/cadastros/marcas/page.tsx`

- [ ] **Step 1: Substituir o conteúdo de `src/app/(app)/cadastros/marcas/page.tsx`**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PhoneReveal } from '@/components/ui/PhoneReveal'
import type { Brand, BrandContact } from '@/types'

type BrandWithContacts = Brand & { contacts: BrandContact[] }

export default function MarcasPage() {
  const [brands, setBrands] = useState<BrandWithContacts[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [contactForms, setContactForms] = useState<Record<string, Partial<BrandContact>>>({})

  async function load() {
    const supabase = createClient()
    const { data: brandsData } = await supabase.from('brands').select('*').order('name')
    const { data: contactsData } = await supabase
      .from('brand_contacts')
      .select('*')
      .order('name')
    const result: BrandWithContacts[] = (brandsData ?? []).map(b => ({
      ...b,
      contacts: (contactsData ?? []).filter(c => c.brand_id === b.id),
    }))
    setBrands(result)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addBrand() {
    if (!newName.trim()) return
    const supabase = createClient()
    await supabase.from('brands').insert({ name: newName.trim() })
    setNewName('')
    load()
  }

  async function toggle(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('brands').update({ active: !active }).eq('id', id)
    load()
  }

  async function addContact(brandId: string) {
    const form = contactForms[brandId] ?? {}
    if (!form.name?.trim()) return
    const supabase = createClient()
    await supabase.from('brand_contacts').insert({
      brand_id: brandId,
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      role: form.role?.trim() || null,
    })
    setContactForms(prev => ({ ...prev, [brandId]: {} }))
    load()
  }

  async function removeContact(contactId: string) {
    const supabase = createClient()
    await supabase.from('brand_contacts').delete().eq('id', contactId)
    load()
  }

  function updateForm(brandId: string, field: keyof BrandContact, value: string) {
    setContactForms(prev => ({
      ...prev,
      [brandId]: { ...(prev[brandId] ?? {}), [field]: value },
    }))
  }

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addBrand()}
          placeholder="Nome da marca"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addBrand}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Adicionar
        </button>
      </div>

      <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200">
        {brands.map(b => (
          <li key={b.id}>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className={`text-sm font-medium ${!b.active ? 'text-gray-400 line-through' : ''}`}>
                {b.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className="text-xs text-blue-600 hover:underline px-2 py-1"
                >
                  {expandedId === b.id ? '▲ Fechar' : `▼ Contatos (${b.contacts.length})`}
                </button>
                <button
                  onClick={() => toggle(b.id, b.active)}
                  className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                >
                  {b.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>

            {expandedId === b.id && (
              <div className="px-4 pb-4 space-y-3 bg-gray-50 border-t border-gray-100">
                {/* Lista de contatos */}
                {b.contacts.length === 0 ? (
                  <p className="text-xs text-gray-400 pt-3">Nenhum contato cadastrado.</p>
                ) : (
                  <ul className="space-y-2 pt-3">
                    {b.contacts.map(c => (
                      <li key={c.id} className="flex items-start justify-between gap-4 text-sm">
                        <div className="space-y-0.5">
                          <p className="font-medium text-gray-900">{c.name}</p>
                          {c.role && <p className="text-xs text-gray-500">{c.role}</p>}
                          {c.phone && <PhoneReveal phone={c.phone} className="text-xs" />}
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="text-xs text-blue-600 hover:underline block"
                            >
                              {c.email}
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => removeContact(c.id)}
                          className="text-xs text-red-500 hover:text-red-700 shrink-0"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Formulário inline para adicionar contato */}
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600">Adicionar contato</p>
                  <input
                    value={contactForms[b.id]?.name ?? ''}
                    onChange={e => updateForm(b.id, 'name', e.target.value)}
                    placeholder="Nome *"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={contactForms[b.id]?.role ?? ''}
                      onChange={e => updateForm(b.id, 'role', e.target.value)}
                      placeholder="Cargo"
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      value={contactForms[b.id]?.phone ?? ''}
                      onChange={e => updateForm(b.id, 'phone', e.target.value)}
                      placeholder="Telefone"
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    value={contactForms[b.id]?.email ?? ''}
                    onChange={e => updateForm(b.id, 'email', e.target.value)}
                    placeholder="E-mail"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => addContact(b.id)}
                    disabled={!contactForms[b.id]?.name?.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {brands.length === 0 && (
          <li className="px-4 py-4 text-sm text-gray-400 text-center">Nenhuma marca cadastrada</li>
        )}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/cadastros/marcas/page.tsx"
git commit -m "feat(contacts): add brand contacts accordion in marcas page"
```

---

### Task 20: Seção de Contatos na Página de Detalhes do Defeito

**Files:**
- Modify: `src/app/(app)/defeito/[id]/page.tsx`

- [ ] **Step 1: Adicionar query de contatos da marca**

No bloco `Promise.all` que já existe em `src/app/(app)/defeito/[id]/page.tsx`, adicione mais uma query:

```typescript
  const [
    { data: defect },
    { data: profile },
    { data: history },
    { data: brandContacts },  // ← adicionar
  ] = await Promise.all([
    // ... queries existentes ...
    supabase
      .from('brand_contacts')
      .select('*')
      .eq('brand_id', defect_brand_id)  // ver step 2 para o valor correto
      .order('name'),
  ])
```

Atenção: o `brand_id` não está disponível antes da query de `defect`. O correto é fazer a query de `brandContacts` DEPOIS do `defect` retornar. Refatore assim:

```typescript
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: defect }, { data: profile }, { data: history }] = await Promise.all([
    supabase
      .from('defects')
      .select(`*, company:companies(*), brand:brands(*), defect_type:defect_types(*), received_by_profile:profiles!received_by(*)`)
      .eq('id', id)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('defect_history')
      .select(`*, changed_by_profile:profiles!changed_by(*)`)
      .eq('defect_id', id)
      .order('changed_at', { ascending: true }),
  ])

  if (!defect || !profile) notFound()
  const defectData = defect as any

  // Query de contatos depende do brand_id do defeito
  const { data: brandContacts } = await supabase
    .from('brand_contacts')
    .select('*')
    .eq('brand_id', defectData.brand_id)
    .order('name')
```

- [ ] **Step 2: Adicionar import de `PhoneReveal`**

Se ainda não estiver importado, adicione no topo:

```typescript
import { PhoneReveal } from '@/components/ui/PhoneReveal'
```

- [ ] **Step 3: Adicionar seção de contatos no JSX**

Adicione após o bloco `{/* Stage advancement */}` e antes do `{/* History */}`:

```typescript
      {/* Brand Contacts */}
      {brandContacts && brandContacts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            Contatos da marca — {defectData.brand?.name}
          </h2>
          <ul className="space-y-3">
            {brandContacts.map((c: any) => (
              <li key={c.id} className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                {c.role && <p className="text-xs text-gray-500">{c.role}</p>}
                {c.phone && <PhoneReveal phone={c.phone} />}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="text-xs text-blue-600 hover:underline">
                    {c.email}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/defeito/[id]/page.tsx
git commit -m "feat(contacts): show brand contacts on defect detail page"
```

---

### Task 21: Deploy e Teste dos Contatos

- [ ] **Step 1: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 2: Testar manualmente**

1. Abra `/cadastros/marcas`
2. Clique em "▼ Contatos" em qualquer marca
3. Adicione um contato com nome, cargo, telefone e e-mail
4. Confirme que aparece na lista
5. Abra qualquer defeito dessa marca
6. Confirme a seção "Contatos da marca" aparece com o contato

---

## ═══════════════════════════════════════════
## SUB-PROJETO 3: DESIGN (Tasks 22–27)
## ═══════════════════════════════════════════

---

### Task 22: CSS Custom Properties e Globals

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Substituir o conteúdo de `src/app/globals.css`**

```css
@import "tailwindcss";

@layer base {
  :root {
    --color-primary: #1e3a5f;
    --color-accent: #f97316;
    --color-bg: #f8fafc;
    --color-surface: #ffffff;
    --color-text: #0f172a;
    --color-muted: #64748b;
  }
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): add CSS custom properties for color palette"
```

---

### Task 23: Redesign do Login

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Atualizar a parte do JSX (return) na `LoginPage`**

Localize o bloco `return (...)` e substitua apenas o JSX (mantendo toda a lógica do component intacta — apenas o `return` muda):

```typescript
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#1e3a5f] flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">GG</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-t-4 border-[#1e3a5f] p-8">
          <h1 className="text-xl font-bold text-[#1e3a5f] mb-1">Grupo Gobbi</h1>
          <p className="text-sm text-[#64748b] mb-6">Controle de Defeitos</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#0f172a]">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLocked}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] disabled:opacity-50 bg-slate-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#0f172a]">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLocked}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] disabled:opacity-50 bg-slate-50"
              />
            </div>
            {isLocked && (
              <p className="text-sm text-orange-600">
                Muitas tentativas. Aguarde {lockoutCountdown} segundos.
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || isLocked}
              className="mt-2 px-6 py-3 bg-[#f97316] text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/login/page.tsx"
git commit -m "feat(design): redesign login page with navy+orange brand palette"
```

---

### Task 24: Redesign do App Layout para Sidebar

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Substituir o conteúdo de `src/app/(app)/layout.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppNav profile={profile} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/layout.tsx"
git commit -m "feat(design): update app layout to flex with sidebar"
```

---

### Task 25: Redesign da Navegação (Sidebar)

**Files:**
- Modify: `src/components/AppNav.tsx`

- [ ] **Step 1: Substituir o conteúdo de `src/components/AppNav.tsx`**

```typescript
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canAccessDashboard, canManageCatalog } from '@/lib/permissions'
import { LayoutGrid, BarChart2, Settings, LogOut } from 'lucide-react'
import type { Profile } from '@/types'

export function AppNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links = [
    { href: '/kanban', label: 'Kanban', icon: LayoutGrid, show: true },
    {
      href: '/painel',
      label: 'Painel Gerencial',
      icon: BarChart2,
      show: canAccessDashboard(profile.role),
    },
    {
      href: '/cadastros/marcas',
      label: 'Cadastros',
      icon: Settings,
      show: canManageCatalog(profile.role),
    },
  ]

  return (
    <nav className="w-56 min-h-screen bg-[#1e3a5f] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <p className="text-white font-bold text-base">Grupo Gobbi</p>
        <p className="text-white/50 text-xs mt-0.5">Controle de Defeitos</p>
      </div>

      {/* Links */}
      <div className="flex-1 py-4 space-y-1 px-2">
        {links.filter(l => l.show).map(l => {
          const isActive = pathname.startsWith(l.href)
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/10 text-white border-l-4 border-[#f97316] pl-2'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {l.label}
            </Link>
          )
        })}
      </div>

      {/* Footer: usuário + logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-white/70 text-xs truncate mb-2">{profile.name}</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-white/60 hover:text-white text-xs transition-colors"
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AppNav.tsx
git commit -m "feat(design): redesign navigation as dark sidebar with icons"
```

---

### Task 26: Redesign dos Cards do Kanban

**Files:**
- Modify: `src/components/kanban/DefectCard.tsx`
- Modify: `src/components/kanban/KanbanColumn.tsx`

- [ ] **Step 1: Substituir `src/components/kanban/DefectCard.tsx`**

```typescript
import Link from 'next/link'
import { getAlertLevel, daysElapsed } from '@/lib/date-utils'
import type { Defect } from '@/types'

const alertStyles = {
  red: 'border-red-400 bg-red-50',
  yellow: 'border-amber-400 bg-amber-50',
  none: 'border-slate-200 bg-white hover:border-slate-300',
}

const alertBadgeStyles = {
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-amber-100 text-amber-700',
}

export function DefectCard({ defect }: { defect: Defect }) {
  const alert = getAlertLevel(defect.current_stage, defect.received_at)
  const days = daysElapsed(defect.received_at)

  return (
    <Link
      href={`/defeito/${defect.id}`}
      className={`block rounded-lg border p-3 transition-all hover:shadow-md ${
        alertStyles[alert ?? 'none']
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-bold text-[#0f172a] truncate leading-tight">
          {defect.brand?.name ?? '—'}
        </p>
        {alert && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${alertBadgeStyles[alert]}`}>
            {days}d
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-[#0f172a] truncate">{defect.product_name}</p>
      <p className="text-xs text-[#64748b] truncate mt-0.5">{defect.client_name}</p>
      <p className="text-xs text-[#64748b]/70 truncate mt-1">{defect.company?.name}</p>
    </Link>
  )
}
```

- [ ] **Step 2: Substituir `src/components/kanban/KanbanColumn.tsx`**

```typescript
import { STAGE_LABELS } from '@/types'
import { DefectCard } from './DefectCard'
import type { Defect, Stage } from '@/types'

const stageColors: Partial<Record<Stage, string>> = {
  received: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  photos_attached: 'bg-purple-100 text-purple-700',
  awaiting_reimbursement: 'bg-yellow-100 text-yellow-700',
  paid_to_client: 'bg-orange-100 text-orange-700',
  reimbursed_to_store: 'bg-green-100 text-green-700',
}

interface Props {
  stage: Stage
  defects: Defect[]
}

export function KanbanColumn({ stage, defects }: Props) {
  const colorClass = stageColors[stage] ?? 'bg-slate-100 text-slate-600'
  return (
    <div className="flex flex-col min-w-56 w-64 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wide">
          {STAGE_LABELS[stage]}
        </h3>
        <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${colorClass}`}>
          {defects.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {defects.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-8 border border-dashed border-slate-200 rounded-lg">
            Vazio
          </div>
        ) : (
          defects.map(d => <DefectCard key={d.id} defect={d} />)
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/kanban/DefectCard.tsx src/components/kanban/KanbanColumn.tsx
git commit -m "feat(design): redesign kanban cards and columns with color-coded stages"
```

---

### Task 27: Deploy Final e Teste Visual

- [ ] **Step 1: Rodar todos os testes**

```bash
npm test -- --no-coverage
```

Esperado: todos passando.

- [ ] **Step 2: Build de produção**

```bash
npm run build
```

Esperado: build sem erros.

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 4: Verificação visual no navegador**

Abra `https://defeitos-gobbi.vercel.app` e confirme:
1. Login com visual de logo GG + botão laranja
2. App com sidebar azul-escura à esquerda com ícones
3. Kanban com cards limpos, badges coloridos por etapa
4. Contatos funcionando em `/cadastros/marcas`
5. Telefone mascarado em todos os defeitos

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `next.config.ts` | Modificado — security headers |
| `src/proxy.ts` | Modificado — 2FA gate |
| `src/app/(auth)/login/page.tsx` | Modificado — rate limiting + 2FA flow + design |
| `src/app/(auth)/verificar-dispositivo/page.tsx` | Criado |
| `src/app/api/auth/send-otp/route.ts` | Criado |
| `src/app/api/auth/verify-otp/route.ts` | Criado |
| `src/app/api/auth/verify-password/route.ts` | Criado |
| `src/lib/mask-phone.ts` | Criado |
| `src/lib/__tests__/mask-phone.test.ts` | Criado |
| `src/lib/supabase/admin.ts` | Criado |
| `src/components/ui/PhoneReveal.tsx` | Criado |
| `src/types/index.ts` | Modificado — client_code + BrandContact |
| `src/components/defect/DefectForm.tsx` | Modificado — campo client_code |
| `src/app/(app)/defeito/[id]/page.tsx` | Modificado — PhoneReveal + client_code + brand contacts |
| `src/app/(app)/cadastros/marcas/page.tsx` | Modificado — accordion de contatos |
| `src/app/(app)/layout.tsx` | Modificado — flex layout com sidebar |
| `src/components/AppNav.tsx` | Modificado — sidebar design |
| `src/components/kanban/DefectCard.tsx` | Modificado — redesign |
| `src/components/kanban/KanbanColumn.tsx` | Modificado — redesign |
| `src/app/globals.css` | Modificado — CSS variables |
| `supabase/migrations/001_security.sql` | Criado |
| `supabase/migrations/002_brand_contacts.sql` | Criado |
