# Sistema de Controle de Defeitos — Grupo Gobbi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app for tracking product defects across 6 Grupo Gobbi companies, from receipt to brand reimbursement, with a Kanban board, WhatsApp messaging, and management dashboard.

**Architecture:** Next.js 14 App Router + Supabase (PostgreSQL + Auth + Storage). Permission logic lives in the app layer: Supabase RLS allows all authenticated users to read/write; the app checks `profile.role` before admin-only actions. Deployed on Vercel + Supabase free tier.

**Tech Stack:** Next.js 14, TypeScript, TailwindCSS, `@supabase/supabase-js`, `@supabase/ssr`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`, `recharts`, `xlsx`

---

## File Map

```
src/
  app/
    (auth)/login/page.tsx               # Login form
    (app)/layout.tsx                    # Shell: sidebar + auth guard
    (app)/kanban/page.tsx               # Kanban board
    (app)/defeito/novo/page.tsx         # New defect form
    (app)/defeito/[id]/page.tsx         # Defect detail
    (app)/painel/page.tsx               # Management dashboard
    (app)/cadastros/marcas/page.tsx     # Brands admin
    (app)/cadastros/tipos/page.tsx      # Defect types admin
    (app)/cadastros/usuarios/page.tsx   # Users admin
    (app)/cadastros/whatsapp/page.tsx   # WhatsApp templates admin
  components/
    kanban/KanbanBoard.tsx              # Board layout (6 columns)
    kanban/KanbanColumn.tsx             # Single stage column
    kanban/DefectCard.tsx               # Card with alerts
    defect/DefectForm.tsx               # Stage-1 create form
    defect/StageAdvancer.tsx            # Advance/close stage modal
    defect/HistoryList.tsx              # Audit trail
    defect/WhatsAppButton.tsx           # Opens wa.me link
    defect/PhotoUpload.tsx              # Single photo upload
    dashboard/DashboardFilters.tsx      # Filter panel
    dashboard/MetricCard.tsx            # Summary card
    dashboard/DefectsTable.tsx          # Filterable table
    dashboard/ExportButton.tsx          # Download xlsx
    ui/Button.tsx                       # Shared button
    ui/Input.tsx                        # Shared input
    ui/Select.tsx                       # Shared select
    ui/Modal.tsx                        # Shared modal
    ui/Badge.tsx                        # Stage/alert badge
  lib/
    supabase/client.ts                  # Browser client
    supabase/server.ts                  # Server client (cookies)
    supabase/middleware.ts              # Session refresh
    permissions.ts                      # Role checks
    whatsapp.ts                         # Template renderer + wa.me URL
    date-utils.ts                       # Days elapsed, alert level
  types/index.ts                        # All shared TypeScript types
  middleware.ts                         # Next.js auth middleware
```

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts` (via CLI)
- Create: `.env.local.example`
- Create: `src/types/index.ts`

- [ ] **Step 1: Scaffold Next.js project**

Run in `c:\Users\rodol\defeitos-gobbi`:
```powershell
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbo
```
When prompted: answer **Yes** to all defaults.

- [ ] **Step 2: Install runtime dependencies**
```powershell
npm install @supabase/supabase-js @supabase/ssr react-hook-form @hookform/resolvers zod date-fns lucide-react recharts xlsx
```

- [ ] **Step 3: Install dev/test dependencies**
```powershell
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom ts-jest @types/jest
```

- [ ] **Step 4: Add Jest config**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'
const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] },
}
export default config
```

Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Create `.env.local.example`**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- [ ] **Step 6: Define all TypeScript types**

Create `src/types/index.ts`:
```typescript
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
  awaiting_reimbursement: 'Aguardando Indenização',
  paid_to_client: 'Pago ao Cliente',
  reimbursed_to_store: 'Indenizado à Loja',
  improcedente: 'Improcedente',
  doacao: 'Doação',
  nao_enviado: 'Não Enviado',
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
  received_by: string
  received_at: string
  current_stage: Stage
  communication_channel: CommunicationChannel | null
  protocol_number: string | null
  photo_url: string | null
  client_amount_paid: number | null
  client_paid_at: string | null
  brand_reimbursement_amount: number | null
  brand_reimbursed_at: string | null
  reimbursement_method: ReimbursementMethod | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
  company?: Company
  brand?: Brand
  defect_type?: DefectType
  received_by_profile?: Profile
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
```

- [ ] **Step 7: Initialize git and commit**
```powershell
git init
git add .
git commit -m "feat: initialize Next.js project with dependencies and types"
```

---

## Task 2: Supabase Project + Database Schema

**Files:**
- No code files — all work done in Supabase dashboard SQL editor
- Create: `supabase/schema.sql` (for reference/version control)

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com, create a free account, create a new project named `defeitos-gobbi`. Wait for provisioning (~2 min). Copy the **Project URL** and **anon key** from Settings → API.

- [ ] **Step 2: Copy credentials to `.env.local`**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

- [ ] **Step 3: Run schema SQL**

Go to Supabase dashboard → SQL Editor → New query. Paste and run:

```sql
-- Extensions
create extension if not exists "uuid-ossp";

-- Companies
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Brands
create table brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Defect types
create table defect_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- User profiles (extends Supabase auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'cashier')),
  created_at timestamptz not null default now()
);

-- Defects
create table defects (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id),
  brand_id uuid not null references brands(id),
  product_name text not null,
  reference text not null,
  color text,
  size text,
  nf_number text,
  cod_use text,
  defect_type_id uuid not null references defect_types(id),
  client_name text not null,
  client_phone text not null,
  received_by uuid not null references profiles(id),
  received_at date not null default current_date,
  current_stage text not null default 'received' check (
    current_stage in (
      'received','in_progress','photos_attached','awaiting_reimbursement',
      'paid_to_client','reimbursed_to_store','improcedente','doacao','nao_enviado'
    )
  ),
  communication_channel text check (communication_channel in ('system','email','whatsapp')),
  protocol_number text,
  photo_url text,
  client_amount_paid numeric(10,2),
  client_paid_at date,
  brand_reimbursement_amount numeric(10,2),
  brand_reimbursed_at date,
  reimbursement_method text check (reimbursement_method in ('bank_transfer','invoice')),
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Defect history
create table defect_history (
  id uuid primary key default uuid_generate_v4(),
  defect_id uuid not null references defects(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  notes text,
  whatsapp_sent boolean not null default false
);

-- WhatsApp templates
create table whatsapp_templates (
  id uuid primary key default uuid_generate_v4(),
  stage text not null unique check (stage in ('received','awaiting_reimbursement','paid_to_client')),
  message_template text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on defects
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger defects_updated_at
  before update on defects
  for each row execute function update_updated_at();
```

- [ ] **Step 4: Run RLS and seed SQL**

New query in SQL Editor:

```sql
-- Enable RLS
alter table profiles enable row level security;
alter table companies enable row level security;
alter table brands enable row level security;
alter table defect_types enable row level security;
alter table defects enable row level security;
alter table defect_history enable row level security;
alter table whatsapp_templates enable row level security;

-- All authenticated users can read everything
create policy "auth read profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "auth read companies" on companies for select using (auth.role() = 'authenticated');
create policy "auth read brands" on brands for select using (auth.role() = 'authenticated');
create policy "auth read defect_types" on defect_types for select using (auth.role() = 'authenticated');
create policy "auth read defects" on defects for select using (auth.role() = 'authenticated');
create policy "auth read history" on defect_history for select using (auth.role() = 'authenticated');
create policy "auth read templates" on whatsapp_templates for select using (auth.role() = 'authenticated');

-- Write policies (role enforcement is in app layer)
create policy "auth insert defects" on defects for insert with check (auth.role() = 'authenticated');
create policy "auth update defects" on defects for update using (auth.role() = 'authenticated');
create policy "auth insert history" on defect_history for insert with check (auth.role() = 'authenticated');
create policy "auth insert brands" on brands for insert with check (auth.role() = 'authenticated');
create policy "auth update brands" on brands for update using (auth.role() = 'authenticated');
create policy "auth insert types" on defect_types for insert with check (auth.role() = 'authenticated');
create policy "auth update types" on defect_types for update using (auth.role() = 'authenticated');
create policy "auth update profiles" on profiles for update using (auth.uid() = id or auth.role() = 'authenticated');
create policy "auth insert profiles" on profiles for insert with check (auth.role() = 'authenticated');
create policy "auth update templates" on whatsapp_templates for update using (auth.role() = 'authenticated');

-- Seed companies
insert into companies (name, slug) values
  ('MPB', 'mpb'), ('BY', 'by'), ('RRPB', 'rrpb'),
  ('GOBBI', 'gobbi'), ('LA LUNA', 'la_luna'), ('GS', 'gs');

-- Seed WhatsApp templates
insert into whatsapp_templates (stage, message_template) values
  ('received', 'Olá, {client_name}! Seu produto {product_name} da marca {brand} foi recebido pela {company} em {received_at}. Protocolo: {protocol}. Em até 30 dias retornaremos com uma solução.'),
  ('awaiting_reimbursement', 'Olá, {client_name}! Seu defeito já foi encaminhado à marca {brand} e estamos aguardando o retorno deles. Em breve te avisamos!'),
  ('paid_to_client', 'Olá, {client_name}! O reembolso referente ao seu produto {product_name} foi efetuado. Qualquer dúvida, estamos à disposição!');
```

- [ ] **Step 5: Enable email auth in Supabase**

Go to Authentication → Providers → Email. Disable "Confirm email" (for simplicity — admins create users manually). Save.

- [ ] **Step 6: Save schema to repo**

Create `supabase/schema.sql` with the combined SQL from steps 3 and 4.

- [ ] **Step 7: Commit**
```powershell
git add supabase/schema.sql .env.local.example
git commit -m "feat: add Supabase schema and seed data"
```

---

## Task 3: Supabase Clients + Auth Middleware

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/middleware.ts`
- Create: `src/lib/permissions.ts`

- [ ] **Step 1: Write tests for permissions**

Create `src/lib/__tests__/permissions.test.ts`:
```typescript
import { canAdvanceToStage5, canAccessDashboard, canManageCatalog } from '@/lib/permissions'

describe('permissions', () => {
  it('admin can advance to stage 5', () => {
    expect(canAdvanceToStage5('admin')).toBe(true)
  })
  it('cashier cannot advance to stage 5', () => {
    expect(canAdvanceToStage5('cashier')).toBe(false)
  })
  it('admin can access dashboard', () => {
    expect(canAccessDashboard('admin')).toBe(true)
  })
  it('cashier cannot access dashboard', () => {
    expect(canAccessDashboard('cashier')).toBe(false)
  })
  it('admin can manage catalog (edit/disable)', () => {
    expect(canManageCatalog('admin')).toBe(true)
  })
  it('cashier cannot manage catalog (edit/disable)', () => {
    expect(canManageCatalog('cashier')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**
```powershell
npx jest src/lib/__tests__/permissions.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/permissions'`

- [ ] **Step 3: Create browser Supabase client**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Create server Supabase client**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 5: Create permissions module**

Create `src/lib/permissions.ts`:
```typescript
import type { Role } from '@/types'

export function canAdvanceToStage5(role: Role): boolean {
  return role === 'admin'
}

export function canAccessDashboard(role: Role): boolean {
  return role === 'admin'
}

export function canManageCatalog(role: Role): boolean {
  return role === 'admin'
}
```

- [ ] **Step 6: Run tests — expect PASS**
```powershell
npx jest src/lib/__tests__/permissions.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 7: Create Next.js middleware**

Create `src/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/kanban', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 8: Commit**
```powershell
git add -A
git commit -m "feat: add Supabase clients, permissions, and auth middleware"
```

---

## Task 4: App Shell — Layout, Login, Navigation

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/app/(app)/kanban/page.tsx` (placeholder)

- [ ] **Step 1: Create shared Button component**

Create `src/components/ui/Button.tsx`:
```typescript
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50',
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
            'bg-gray-100 text-gray-900 hover:bg-gray-200': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
            'text-gray-700 hover:bg-gray-100': variant === 'ghost',
            'px-2 py-1 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

- [ ] **Step 2: Create utils (cn helper)**

Create `src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Install missing dep:
```powershell
npm install clsx tailwind-merge
```

- [ ] **Step 3: Create shared Input component**

Create `src/components/ui/Input.tsx`:
```typescript
import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
```

- [ ] **Step 4: Create Badge component**

Create `src/components/ui/Badge.tsx`:
```typescript
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
```

- [ ] **Step 5: Create login page**

Create `src/app/(auth)/login/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
    } else {
      router.push('/kanban')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Grupo Gobbi</h1>
        <p className="text-sm text-gray-500 mb-6">Controle de Defeitos</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="E-mail" type="email" value={email}
            onChange={e => setEmail(e.target.value)} required />
          <Input label="Senha" type="password" value={password}
            onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create app shell layout**

Create `src/app/(app)/layout.tsx`:
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
    <div className="min-h-screen bg-gray-50">
      <AppNav profile={profile} />
      <main className="max-w-screen-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 7: Create AppNav component**

Create `src/components/AppNav.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canAccessDashboard, canManageCatalog } from '@/lib/permissions'
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
    { href: '/kanban', label: 'Kanban', show: true },
    { href: '/painel', label: 'Painel Gerencial', show: canAccessDashboard(profile.role) },
    { href: '/cadastros/marcas', label: 'Cadastros', show: canManageCatalog(profile.role) },
  ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">Grupo Gobbi</span>
          <div className="flex gap-1">
            {links.filter(l => l.show).map(l => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith(l.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{profile.name}</span>
          <button onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-900">Sair</button>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 8: Create Kanban placeholder page**

Create `src/app/(app)/kanban/page.tsx`:
```typescript
export default function KanbanPage() {
  return <div className="text-gray-500">Kanban em construção...</div>
}
```

- [ ] **Step 9: Create root redirect**

Create `src/app/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function RootPage() {
  redirect('/kanban')
}
```

- [ ] **Step 10: Run dev server and verify login works**
```powershell
npm run dev
```
Open http://localhost:3000 — should redirect to `/login`. Sign in redirects to `/kanban`.

- [ ] **Step 11: Create first admin user**

In Supabase dashboard → Authentication → Users → Create new user. Enter Paloma's email + password.

Then in SQL Editor:
```sql
insert into profiles (id, name, role)
values ('<user-id-from-supabase>', 'Paloma', 'admin');
```

- [ ] **Step 12: Commit**
```powershell
git add -A
git commit -m "feat: add login page, app shell layout, and navigation"
```

---

## Task 5: Date Utilities + Kanban Alert Logic

**Files:**
- Create: `src/lib/date-utils.ts`
- Create: `src/lib/__tests__/date-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/date-utils.test.ts`:
```typescript
import { daysElapsed, getAlertLevel } from '@/lib/date-utils'

describe('daysElapsed', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(daysElapsed(today)).toBe(0)
  })
  it('returns correct count for past date', () => {
    const past = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
    expect(daysElapsed(past)).toBe(5)
  })
})

describe('getAlertLevel', () => {
  it('returns null for active closed stages', () => {
    expect(getAlertLevel('reimbursed_to_store', '2020-01-01')).toBeNull()
    expect(getAlertLevel('improcedente', '2020-01-01')).toBeNull()
  })
  it('returns null under 15 days', () => {
    const recent = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
    expect(getAlertLevel('received', recent)).toBeNull()
  })
  it('returns yellow between 15 and 30 days', () => {
    const d = new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0]
    expect(getAlertLevel('received', d)).toBe('yellow')
  })
  it('returns red over 30 days', () => {
    const d = new Date(Date.now() - 35 * 86400000).toISOString().split('T')[0]
    expect(getAlertLevel('received', d)).toBe('red')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
```powershell
npx jest src/lib/__tests__/date-utils.test.ts
```

- [ ] **Step 3: Implement date utils**

Create `src/lib/date-utils.ts`:
```typescript
import { differenceInDays, parseISO, startOfDay } from 'date-fns'
import type { Stage } from '@/types'
import { CLOSED_STAGES } from '@/types'

export function daysElapsed(dateStr: string): number {
  return differenceInDays(startOfDay(new Date()), parseISO(dateStr))
}

export function getAlertLevel(stage: Stage, receivedAt: string): 'yellow' | 'red' | null {
  if (stage === 'reimbursed_to_store' || CLOSED_STAGES.includes(stage)) return null
  const days = daysElapsed(receivedAt)
  if (days > 30) return 'red'
  if (days >= 15) return 'yellow'
  return null
}
```

- [ ] **Step 4: Run — expect PASS**
```powershell
npx jest src/lib/__tests__/date-utils.test.ts
```

- [ ] **Step 5: Commit**
```powershell
git add -A
git commit -m "feat: add date utilities and alert level logic"
```

---

## Task 6: WhatsApp Template Utilities

**Files:**
- Create: `src/lib/whatsapp.ts`
- Create: `src/lib/__tests__/whatsapp.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/whatsapp.test.ts`:
```typescript
import { renderTemplate, buildWhatsAppUrl } from '@/lib/whatsapp'

describe('renderTemplate', () => {
  it('replaces all placeholders', () => {
    const template = 'Olá, {client_name}! Produto: {product_name}, Marca: {brand}.'
    const result = renderTemplate(template, {
      client_name: 'João', product_name: 'Tênis', brand: 'Nike',
      company: '', received_at: '', protocol: '',
    })
    expect(result).toBe('Olá, João! Produto: Tênis, Marca: Nike.')
  })
  it('leaves unknown placeholders empty', () => {
    const result = renderTemplate('Olá {client_name} {unknown}', {
      client_name: 'Ana', product_name: '', brand: '',
      company: '', received_at: '', protocol: '',
    })
    expect(result).toBe('Olá Ana {unknown}')
  })
})

describe('buildWhatsAppUrl', () => {
  it('produces a wa.me URL with encoded message', () => {
    const url = buildWhatsAppUrl('5551999999999', 'Olá João!')
    expect(url).toBe('https://wa.me/5551999999999?text=Ol%C3%A1%20Jo%C3%A3o!')
  })
  it('strips non-numeric chars from phone', () => {
    const url = buildWhatsAppUrl('(51) 9 9999-9999', 'teste')
    expect(url).toContain('wa.me/51999999999')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
```powershell
npx jest src/lib/__tests__/whatsapp.test.ts
```

- [ ] **Step 3: Implement whatsapp utilities**

Create `src/lib/whatsapp.ts`:
```typescript
export interface TemplateVars {
  client_name: string
  product_name: string
  brand: string
  company: string
  received_at: string
  protocol: string
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace('{client_name}', vars.client_name)
    .replace('{product_name}', vars.product_name)
    .replace('{brand}', vars.brand)
    .replace('{company}', vars.company)
    .replace('{received_at}', vars.received_at)
    .replace('{protocol}', vars.protocol)
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '')
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
}
```

- [ ] **Step 4: Run — expect PASS**
```powershell
npx jest src/lib/__tests__/whatsapp.test.ts
```

- [ ] **Step 5: Commit**
```powershell
git add -A
git commit -m "feat: add WhatsApp template renderer and URL builder"
```

---

## Task 7: New Defect Form (Stage 1)

**Files:**
- Create: `src/app/(app)/defeito/novo/page.tsx`
- Create: `src/components/defect/DefectForm.tsx`
- Create: `src/components/defect/PhotoUpload.tsx`
- Create: `src/components/ui/Select.tsx`
- Create: `src/components/ui/Modal.tsx`

- [ ] **Step 1: Create Select component**

Create `src/components/ui/Select.tsx`:
```typescript
import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'
```

- [ ] **Step 2: Create Modal component**

Create `src/components/ui/Modal.tsx`:
```typescript
'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create PhotoUpload component**

Create `src/components/defect/PhotoUpload.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X } from 'lucide-react'

interface PhotoUploadProps {
  defectId: string
  existingUrl: string | null
  onUploaded: (url: string) => void
}

export function PhotoUpload({ defectId, existingUrl, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(existingUrl)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${defectId}.${ext}`
    const { error } = await supabase.storage.from('defect-photos').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('defect-photos').getPublicUrl(path)
      setPreview(data.publicUrl)
      onUploaded(data.publicUrl)
    }
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">Foto do produto</label>
      {preview ? (
        <div className="relative w-32 h-32">
          <img src={preview} alt="Foto do defeito" className="w-full h-full object-cover rounded-lg" />
          <button onClick={() => setPreview(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
            <X size={12} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400">
          <Upload size={20} className="text-gray-400" />
          <span className="text-xs text-gray-400 mt-1">{uploading ? 'Enviando...' : 'Adicionar foto'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={uploading} />
        </label>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create the new defect page with form**

Create `src/app/(app)/defeito/novo/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DefectForm } from '@/components/defect/DefectForm'

export default async function NovoDefeitoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: companies }, { data: brands }, { data: defectTypes }, { data: profile }] =
    await Promise.all([
      supabase.from('companies').select('*').eq('active', true).order('name'),
      supabase.from('brands').select('*').eq('active', true).order('name'),
      supabase.from('defect_types').select('*').eq('active', true).order('name'),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Registrar Novo Defeito</h1>
      <DefectForm
        companies={companies ?? []}
        brands={brands ?? []}
        defectTypes={defectTypes ?? []}
        receivedBy={user.id}
        receivedByName={profile?.name ?? ''}
      />
    </div>
  )
}
```

- [ ] **Step 5: Create DefectForm component**

Create `src/components/defect/DefectForm.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Company, Brand, DefectType } from '@/types'

const schema = z.object({
  company_id: z.string().min(1, 'Selecione a empresa'),
  brand_id: z.string().min(1, 'Selecione a marca'),
  product_name: z.string().min(1, 'Informe o produto'),
  reference: z.string().min(1, 'Informe a referência'),
  color: z.string().optional(),
  size: z.string().optional(),
  nf_number: z.string().optional(),
  cod_use: z.string().optional(),
  defect_type_id: z.string().min(1, 'Selecione o tipo de defeito'),
  client_name: z.string().min(1, 'Informe o nome do cliente'),
  client_phone: z.string().min(8, 'Informe o telefone'),
  received_at: z.string().min(1, 'Informe a data'),
})
type FormData = z.infer<typeof schema>

interface Props {
  companies: Company[]
  brands: Brand[]
  defectTypes: DefectType[]
  receivedBy: string
  receivedByName: string
}

export function DefectForm({ companies, brands, defectTypes, receivedBy, receivedByName }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newType, setNewType] = useState('')
  const [brandList, setBrandList] = useState(brands)
  const [typeList, setTypeList] = useState(defectTypes)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { received_at: new Date().toISOString().split('T')[0] },
  })

  async function addBrand() {
    if (!newBrand.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('brands').insert({ name: newBrand.trim() }).select().single()
    if (data) { setBrandList(prev => [...prev, data]); setValue('brand_id', data.id); setNewBrand('') }
  }

  async function addType() {
    if (!newType.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('defect_types').insert({ name: newType.trim(), created_by: receivedBy }).select().single()
    if (data) { setTypeList(prev => [...prev, data]); setValue('defect_type_id', data.id); setNewType('') }
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data: defect, error: err } = await supabase
      .from('defects')
      .insert({ ...data, received_by: receivedBy, current_stage: 'received' })
      .select()
      .single()
    if (err) { setError('Erro ao salvar. Tente novamente.'); setSaving(false); return }
    await supabase.from('defect_history').insert({
      defect_id: defect.id, from_stage: null, to_stage: 'received', changed_by: receivedBy,
    })
    router.push(`/defeito/${defect.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Empresa *" options={companies.map(c => ({ value: c.id, label: c.name }))}
          placeholder="Selecione" error={errors.company_id?.message} {...register('company_id')} />
        <div className="flex flex-col gap-1">
          <Select label="Marca *" options={brandList.map(b => ({ value: b.id, label: b.name }))}
            placeholder="Selecione" error={errors.brand_id?.message} {...register('brand_id')} />
          <div className="flex gap-2 mt-1">
            <input value={newBrand} onChange={e => setNewBrand(e.target.value)}
              placeholder="Nova marca..." className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
            <button type="button" onClick={addBrand} className="text-xs text-blue-600 hover:underline">+ Adicionar</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Produto *" error={errors.product_name?.message} {...register('product_name')} />
        <Input label="Referência *" error={errors.reference?.message} {...register('reference')} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Cor" {...register('color')} />
        <Input label="Tamanho" {...register('size')} />
        <Input label="NF" {...register('nf_number')} />
      </div>
      <Input label="Cód. Use" {...register('cod_use')} />
      <div className="flex flex-col gap-1">
        <Select label="Tipo de defeito *" options={typeList.map(t => ({ value: t.id, label: t.name }))}
          placeholder="Selecione" error={errors.defect_type_id?.message} {...register('defect_type_id')} />
        <div className="flex gap-2 mt-1">
          <input value={newType} onChange={e => setNewType(e.target.value)}
            placeholder="Novo tipo..." className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
          <button type="button" onClick={addType} className="text-xs text-blue-600 hover:underline">+ Adicionar</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nome do cliente *" error={errors.client_name?.message} {...register('client_name')} />
        <Input label="Telefone (WhatsApp) *" error={errors.client_phone?.message} {...register('client_phone')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Data de recebimento *" type="date" error={errors.received_at?.message} {...register('received_at')} />
        <Input label="Recebido por" value={receivedByName} readOnly className="bg-gray-50" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Registrar Defeito'}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 6: Enable Supabase Storage bucket**

In Supabase dashboard → Storage → New bucket. Name: `defect-photos`. Toggle **Public** to ON. Save.

- [ ] **Step 7: Run dev server and test form manually**
```powershell
npm run dev
```
Navigate to http://localhost:3000/defeito/novo. Fill in the form, submit. Verify redirect to defect detail (404 for now is OK).

- [ ] **Step 8: Commit**
```powershell
git add -A
git commit -m "feat: add new defect form with brand/type inline creation"
```

---

## Task 8: Defect Detail Page + History

**Files:**
- Create: `src/app/(app)/defeito/[id]/page.tsx`
- Create: `src/components/defect/HistoryList.tsx`
- Create: `src/components/defect/WhatsAppButton.tsx`
- Create: `src/components/defect/StageAdvancer.tsx`

- [ ] **Step 1: Create HistoryList component**

Create `src/components/defect/HistoryList.tsx`:
```typescript
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { STAGE_LABELS } from '@/types'
import type { DefectHistory } from '@/types'

export function HistoryList({ history }: { history: DefectHistory[] }) {
  if (!history.length) return <p className="text-sm text-gray-400">Nenhuma movimentação ainda.</p>

  return (
    <ol className="relative border-l border-gray-200 ml-3">
      {history.map(h => (
        <li key={h.id} className="mb-4 ml-4">
          <div className="absolute -left-1.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
          <p className="text-sm font-medium text-gray-900">
            {h.from_stage ? `${STAGE_LABELS[h.from_stage as keyof typeof STAGE_LABELS]} → ` : ''}
            {STAGE_LABELS[h.to_stage as keyof typeof STAGE_LABELS]}
          </p>
          <p className="text-xs text-gray-500">
            {h.changed_by_profile?.name ?? '—'} · {format(new Date(h.changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          {h.notes && <p className="text-xs text-gray-600 mt-0.5">{h.notes}</p>}
          {h.whatsapp_sent && <p className="text-xs text-green-600 mt-0.5">✓ WhatsApp enviado</p>}
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 2: Create WhatsAppButton component**

Create `src/components/defect/WhatsAppButton.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { renderTemplate, buildWhatsAppUrl } from '@/lib/whatsapp'
import type { Defect, WhatsAppTemplate, WhatsAppTemplateStage } from '@/types'

const STAGE_TO_TEMPLATE: Partial<Record<string, WhatsAppTemplateStage>> = {
  received: 'received',
  awaiting_reimbursement: 'awaiting_reimbursement',
  paid_to_client: 'paid_to_client',
}

interface Props {
  defect: Defect
  userId: string
}

export function WhatsAppButton({ defect, userId }: Props) {
  const [loading, setLoading] = useState(false)
  const templateStage = STAGE_TO_TEMPLATE[defect.current_stage]
  if (!templateStage) return null

  async function handleClick() {
    setLoading(true)
    const supabase = createClient()
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('stage', templateStage)
      .single() as { data: WhatsAppTemplate | null }

    if (!template) { setLoading(false); return }

    const message = renderTemplate(template.message_template, {
      client_name: defect.client_name,
      product_name: defect.product_name,
      brand: defect.brand?.name ?? '',
      company: defect.company?.name ?? '',
      received_at: new Date(defect.received_at).toLocaleDateString('pt-BR'),
      protocol: defect.protocol_number ?? 'sem protocolo',
    })

    await supabase.from('defect_history').insert({
      defect_id: defect.id,
      from_stage: defect.current_stage,
      to_stage: defect.current_stage,
      changed_by: userId,
      notes: 'Mensagem WhatsApp enviada',
      whatsapp_sent: true,
    })

    window.open(buildWhatsAppUrl(defect.client_phone, message), '_blank')
    setLoading(false)
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleClick} disabled={loading}>
      <MessageCircle size={14} className="mr-1.5" />
      {loading ? 'Abrindo...' : 'Enviar WhatsApp'}
    </Button>
  )
}
```

- [ ] **Step 3: Create StageAdvancer component**

Create `src/components/defect/StageAdvancer.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { canAdvanceToStage5 } from '@/lib/permissions'
import { ACTIVE_STAGES, CLOSED_STAGES, STAGE_LABELS } from '@/types'
import type { Defect, Stage, Role } from '@/types'

const NEXT_STAGE: Partial<Record<Stage, Stage>> = {
  received: 'in_progress',
  in_progress: 'photos_attached',
  photos_attached: 'awaiting_reimbursement',
  awaiting_reimbursement: 'paid_to_client',
  paid_to_client: 'reimbursed_to_store',
}

interface Props { defect: Defect; userId: string; userRole: Role }

export function StageAdvancer({ defect, userId, userRole }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [channel, setChannel] = useState('email')
  const [protocol, setProtocol] = useState('')
  const [clientPaid, setClientPaid] = useState('')
  const [clientPaidAt, setClientPaidAt] = useState('')
  const [brandAmount, setBrandAmount] = useState('')
  const [brandAt, setBrandAt] = useState('')
  const [reimbMethod, setReimbMethod] = useState('invoice')
  const [closeStage, setCloseStage] = useState<Stage>('improcedente')
  const [closeNotes, setCloseNotes] = useState('')

  const nextStage = NEXT_STAGE[defect.current_stage]
  const isFinished = defect.current_stage === 'reimbursed_to_store' || CLOSED_STAGES.includes(defect.current_stage)

  if (isFinished) return null
  if (nextStage === 'paid_to_client' && !canAdvanceToStage5(userRole)) return null

  async function advance() {
    if (!nextStage) return
    setSaving(true)
    const supabase = createClient()
    const updates: Partial<Defect> = { current_stage: nextStage }
    if (nextStage === 'in_progress') { updates.communication_channel = channel as any; updates.protocol_number = protocol }
    if (nextStage === 'paid_to_client') { updates.client_amount_paid = parseFloat(clientPaid); updates.client_paid_at = clientPaidAt }
    if (nextStage === 'reimbursed_to_store') {
      updates.brand_reimbursement_amount = parseFloat(brandAmount)
      updates.brand_reimbursed_at = brandAt
      updates.reimbursement_method = reimbMethod as any
    }
    await supabase.from('defects').update(updates).eq('id', defect.id)
    await supabase.from('defect_history').insert({
      defect_id: defect.id, from_stage: defect.current_stage,
      to_stage: nextStage, changed_by: userId,
    })
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function closeDefect() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('defects').update({ current_stage: closeStage, resolution_notes: closeNotes }).eq('id', defect.id)
    await supabase.from('defect_history').insert({
      defect_id: defect.id, from_stage: defect.current_stage,
      to_stage: closeStage, changed_by: userId, notes: closeNotes,
    })
    setSaving(false)
    setCloseOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-2">
        {nextStage && (
          <Button onClick={() => setOpen(true)}>
            Avançar para: {STAGE_LABELS[nextStage]}
          </Button>
        )}
        {defect.current_stage === 'awaiting_reimbursement' && canAdvanceToStage5(userRole) && (
          <Button variant="danger" onClick={() => setCloseOpen(true)}>Encerrar (Improcedente/Outro)</Button>
        )}
      </div>

      {/* Advance modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={`Avançar para: ${nextStage ? STAGE_LABELS[nextStage] : ''}`}>
        <div className="flex flex-col gap-4">
          {nextStage === 'in_progress' && (
            <>
              <Select label="Canal de comunicação" value={channel} onChange={e => setChannel(e.target.value)}
                options={[{value:'email',label:'E-mail'},{value:'whatsapp',label:'WhatsApp'},{value:'system',label:'Sistema da marca'}]} />
              <Input label="Protocolo / número" value={protocol} onChange={e => setProtocol(e.target.value)} />
            </>
          )}
          {nextStage === 'paid_to_client' && (
            <>
              <Input label="Valor pago ao cliente (R$)" type="number" step="0.01" value={clientPaid} onChange={e => setClientPaid(e.target.value)} required />
              <Input label="Data do pagamento" type="date" value={clientPaidAt} onChange={e => setClientPaidAt(e.target.value)} required />
            </>
          )}
          {nextStage === 'reimbursed_to_store' && (
            <>
              <Input label="Valor recebido da marca (R$)" type="number" step="0.01" value={brandAmount} onChange={e => setBrandAmount(e.target.value)} required />
              <Input label="Data do recebimento" type="date" value={brandAt} onChange={e => setBrandAt(e.target.value)} required />
              <Select label="Forma" value={reimbMethod} onChange={e => setReimbMethod(e.target.value)}
                options={[{value:'invoice',label:'Nota Fiscal'},{value:'bank_transfer',label:'Conta Corrente'}]} />
            </>
          )}
          <Button onClick={advance} disabled={saving}>{saving ? 'Salvando...' : 'Confirmar'}</Button>
        </div>
      </Modal>

      {/* Close modal */}
      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Encerrar defeito">
        <div className="flex flex-col gap-4">
          <Select label="Desfecho" value={closeStage} onChange={e => setCloseStage(e.target.value as Stage)}
            options={[
              {value:'improcedente',label:'Improcedente'},
              {value:'doacao',label:'Doação'},
              {value:'nao_enviado',label:'Não enviado'},
            ]} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Observação *</label>
            <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows={3}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm" required />
          </div>
          <Button variant="danger" onClick={closeDefect} disabled={saving || !closeNotes}>
            {saving ? 'Salvando...' : 'Encerrar'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
```

- [ ] **Step 4: Create defect detail page**

Create `src/app/(app)/defeito/[id]/page.tsx`:
```typescript
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { STAGE_LABELS } from '@/types'
import { HistoryList } from '@/components/defect/HistoryList'
import { WhatsAppButton } from '@/components/defect/WhatsAppButton'
import { StageAdvancer } from '@/components/defect/StageAdvancer'
import { PhotoUpload } from '@/components/defect/PhotoUpload'
import { getAlertLevel } from '@/lib/date-utils'
import { Badge } from '@/components/ui/Badge'

export default async function DefectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: defect }, { data: profile }, { data: history }] = await Promise.all([
    supabase.from('defects').select(`*, company:companies(*), brand:brands(*), defect_type:defect_types(*), received_by_profile:profiles!defects_received_by_fkey(*)`).eq('id', params.id).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('defect_history').select(`*, changed_by_profile:profiles!defect_history_changed_by_fkey(*)`).eq('defect_id', params.id).order('changed_at', { ascending: true }),
  ])

  if (!defect || !profile) notFound()

  const alert = getAlertLevel(defect.current_stage, defect.received_at)

  async function handlePhotoUpdate(url: string) {
    'use server'
    const supabase = await createClient()
    await supabase.from('defects').update({ photo_url: url }).eq('id', params.id)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {defect.brand?.name} — {defect.product_name}
          </h1>
          <p className="text-sm text-gray-500">{defect.company?.name} · Ref: {defect.reference}</p>
        </div>
        <div className="flex items-center gap-2">
          {alert && <Badge variant={alert}>{alert === 'red' ? '⚠ Atrasado' : '⏳ Atenção'}</Badge>}
          <Badge>{STAGE_LABELS[defect.current_stage]}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Dados do produto</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Cor', defect.color], ['Tamanho', defect.size],
              ['NF', defect.nf_number], ['Cód. Use', defect.cod_use],
              ['Tipo de defeito', defect.defect_type?.name],
              ['Recebido em', format(new Date(defect.received_at), 'dd/MM/yyyy', { locale: ptBR })],
              ['Recebido por', defect.received_by_profile?.name],
              ['Canal', defect.communication_channel ?? '—'],
              ['Protocolo', defect.protocol_number ?? '—'],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
            <h2 className="font-semibold text-gray-900">Cliente</h2>
            <p className="text-sm font-medium">{defect.client_name}</p>
            <p className="text-sm text-gray-600">{defect.client_phone}</p>
            <WhatsAppButton defect={defect} userId={user.id} />
          </div>

          {(defect.client_amount_paid || defect.brand_reimbursement_amount) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
              <h2 className="font-semibold text-gray-900">Financeiro</h2>
              {defect.client_amount_paid && (
                <p className="text-sm">Pago ao cliente: <strong>R$ {defect.client_amount_paid.toFixed(2)}</strong></p>
              )}
              {defect.brand_reimbursement_amount && (
                <p className="text-sm">Recebido da marca: <strong>R$ {defect.brand_reimbursement_amount.toFixed(2)}</strong></p>
              )}
            </div>
          )}

          <PhotoUpload defectId={defect.id} existingUrl={defect.photo_url} onUploaded={handlePhotoUpdate} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <StageAdvancer defect={defect} userId={user.id} userRole={profile.role} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Histórico</h2>
        <HistoryList history={history ?? []} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Test manually**
```powershell
npm run dev
```
Create a defect via `/defeito/novo`, verify redirect to detail page, check all fields display correctly.

- [ ] **Step 6: Commit**
```powershell
git add -A
git commit -m "feat: add defect detail page with stage advancer, WhatsApp, and history"
```

---

## Task 9: Kanban Board

**Files:**
- Modify: `src/app/(app)/kanban/page.tsx`
- Create: `src/components/kanban/KanbanBoard.tsx`
- Create: `src/components/kanban/KanbanColumn.tsx`
- Create: `src/components/kanban/DefectCard.tsx`

- [ ] **Step 1: Create DefectCard component**

Create `src/components/kanban/DefectCard.tsx`:
```typescript
import Link from 'next/link'
import { getAlertLevel, daysElapsed } from '@/lib/date-utils'
import { Badge } from '@/components/ui/Badge'
import type { Defect } from '@/types'

export function DefectCard({ defect }: { defect: Defect }) {
  const alert = getAlertLevel(defect.current_stage, defect.received_at)
  const days = daysElapsed(defect.received_at)

  return (
    <Link href={`/defeito/${defect.id}`}
      className={`block bg-white rounded-lg border p-3 hover:shadow-md transition-shadow ${
        alert === 'red' ? 'border-red-300 bg-red-50' :
        alert === 'yellow' ? 'border-yellow-300 bg-yellow-50' :
        'border-gray-200'
      }`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{defect.brand?.name}</p>
        <Badge variant={alert ?? 'gray'}>{days}d</Badge>
      </div>
      <p className="text-xs text-gray-600 truncate">{defect.product_name}</p>
      <p className="text-xs text-gray-500 truncate">{defect.client_name}</p>
      <p className="text-xs text-gray-400 mt-1">{defect.company?.name}</p>
    </Link>
  )
}
```

- [ ] **Step 2: Create KanbanColumn**

Create `src/components/kanban/KanbanColumn.tsx`:
```typescript
import { STAGE_LABELS } from '@/types'
import { DefectCard } from './DefectCard'
import type { Defect, Stage } from '@/types'

interface Props { stage: Stage; defects: Defect[] }

export function KanbanColumn({ stage, defects }: Props) {
  return (
    <div className="flex flex-col min-w-56 w-64 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{STAGE_LABELS[stage]}</h3>
        <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{defects.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {defects.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-8 border border-dashed border-gray-200 rounded-lg">Vazio</div>
        )}
        {defects.map(d => <DefectCard key={d.id} defect={d} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create KanbanBoard**

Create `src/components/kanban/KanbanBoard.tsx`:
```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ACTIVE_STAGES } from '@/types'
import { KanbanColumn } from './KanbanColumn'
import { Button } from '@/components/ui/Button'
import type { Defect } from '@/types'

export function KanbanBoard({ defects }: { defects: Defect[] }) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? defects.filter(d =>
        d.client_name.toLowerCase().includes(search.toLowerCase()) ||
        d.brand?.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.product_name.toLowerCase().includes(search.toLowerCase())
      )
    : defects

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente, marca ou produto..."
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-72" />
        <Link href="/defeito/novo">
          <Button>+ Novo Defeito</Button>
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ACTIVE_STAGES.map(stage => (
          <KanbanColumn key={stage} stage={stage}
            defects={filtered.filter(d => d.current_stage === stage)} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update Kanban page with real data**

Replace `src/app/(app)/kanban/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { ACTIVE_STAGES } from '@/types'

export default async function KanbanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: defects } = await supabase
    .from('defects')
    .select('*, company:companies(*), brand:brands(*), defect_type:defect_types(*)')
    .in('current_stage', ACTIVE_STAGES)
    .order('received_at', { ascending: true })

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Kanban de Defeitos</h1>
      <KanbanBoard defects={defects ?? []} />
    </div>
  )
}
```

- [ ] **Step 5: Test manually**
```powershell
npm run dev
```
Verify the Kanban shows columns, cards appear in correct columns, alerts color correctly.

- [ ] **Step 6: Commit**
```powershell
git add -A
git commit -m "feat: add Kanban board with columns, cards, and alert colors"
```

---

## Task 10: Admin — Brands, Defect Types, Users, Templates

**Files:**
- Create: `src/app/(app)/cadastros/marcas/page.tsx`
- Create: `src/app/(app)/cadastros/tipos/page.tsx`
- Create: `src/app/(app)/cadastros/usuarios/page.tsx`
- Create: `src/app/(app)/cadastros/whatsapp/page.tsx`
- Create: `src/app/(app)/cadastros/layout.tsx`

- [ ] **Step 1: Create cadastros layout (admin guard)**

Create `src/app/(app)/cadastros/layout.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CadastrosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/kanban')

  const tabs = [
    { href: '/cadastros/marcas', label: 'Marcas' },
    { href: '/cadastros/tipos', label: 'Tipos de Defeito' },
    { href: '/cadastros/usuarios', label: 'Usuários' },
    { href: '/cadastros/whatsapp', label: 'Mensagens WhatsApp' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Cadastros</h1>
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <Link key={t.href} href={t.href}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-700 border-b-2 border-transparent hover:border-blue-600 transition-colors">
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create Brands admin page**

Create `src/app/(app)/cadastros/marcas/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Brand } from '@/types'

export default function MarcasPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('brands').select('*').order('name')
    setBrands(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add() {
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

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div className="max-w-md space-y-4">
      <div className="flex gap-2">
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da marca" />
        <Button onClick={add}>Adicionar</Button>
      </div>
      <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200">
        {brands.map(b => (
          <li key={b.id} className="flex items-center justify-between px-4 py-2.5">
            <span className={`text-sm ${!b.active ? 'text-gray-400 line-through' : ''}`}>{b.name}</span>
            <Button size="sm" variant="ghost" onClick={() => toggle(b.id, b.active)}>
              {b.active ? 'Desativar' : 'Ativar'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Create Defect Types admin page**

Create `src/app/(app)/cadastros/tipos/page.tsx` — same pattern as marcas but for `defect_types` table.

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { DefectType } from '@/types'

export default function TiposPage() {
  const [types, setTypes] = useState<DefectType[]>([])
  const [newName, setNewName] = useState('')

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('defect_types').select('*').order('name')
    setTypes(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!newName.trim()) return
    const supabase = createClient()
    await supabase.from('defect_types').insert({ name: newName.trim() })
    setNewName('')
    load()
  }

  async function toggle(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('defect_types').update({ active: !active }).eq('id', id)
    load()
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="flex gap-2">
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Tipo de defeito" />
        <Button onClick={add}>Adicionar</Button>
      </div>
      <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200">
        {types.map(t => (
          <li key={t.id} className="flex items-center justify-between px-4 py-2.5">
            <span className={`text-sm ${!t.active ? 'text-gray-400 line-through' : ''}`}>{t.name}</span>
            <Button size="sm" variant="ghost" onClick={() => toggle(t.id, t.active)}>
              {t.active ? 'Desativar' : 'Ativar'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Create Users admin page**

Create `src/app/(app)/cadastros/usuarios/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Profile, Role } from '@/types'

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('cashier')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').order('name')
    setProfiles(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function createUser() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role }),
    })
    if (!res.ok) { setError('Erro ao criar usuário'); setLoading(false); return }
    setEmail(''); setName(''); setPassword(''); setRole('cashier')
    load()
    setLoading(false)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Novo usuário</h2>
        <Input label="Nome" value={name} onChange={e => setName(e.target.value)} />
        <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input label="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <Select label="Perfil" value={role} onChange={e => setRole(e.target.value as Role)}
          options={[{value:'admin',label:'Admin'},{value:'cashier',label:'Caixa'}]} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={createUser} disabled={loading}>{loading ? 'Criando...' : 'Criar Usuário'}</Button>
      </div>
      <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200">
        {profiles.map(p => (
          <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-gray-500">{p.role === 'admin' ? 'Admin' : 'Caixa'}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Create API route for user creation (needs service role key)**

Create `src/app/api/users/route.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password, name, role } = await request.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: authUser, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('profiles').insert({ id: authUser.user.id, name, role })
  return NextResponse.json({ ok: true })
}
```

Add to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
(Find in Supabase dashboard → Settings → API → service_role key)

- [ ] **Step 6: Create WhatsApp templates page**

Create `src/app/(app)/cadastros/whatsapp/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { STAGE_LABELS } from '@/types'
import type { WhatsAppTemplate, WhatsAppTemplateStage } from '@/types'

const TEMPLATE_STAGES: WhatsAppTemplateStage[] = ['received', 'awaiting_reimbursement', 'paid_to_client']

export default function WhatsAppPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('whatsapp_templates').select('*')
    setTemplates(data ?? [])
    const init: Record<string, string> = {}
    data?.forEach(t => { init[t.stage] = t.message_template })
    setEditing(init)
  }
  useEffect(() => { load() }, [])

  async function save(stage: WhatsAppTemplateStage) {
    const supabase = createClient()
    await supabase.from('whatsapp_templates').update({ message_template: editing[stage], updated_at: new Date().toISOString() }).eq('stage', stage)
    setSaved(prev => ({ ...prev, [stage]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [stage]: false })), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-gray-500">
        Variáveis disponíveis: {'{client_name}'} {'{product_name}'} {'{brand}'} {'{company}'} {'{received_at}'} {'{protocol}'}
      </p>
      {TEMPLATE_STAGES.map(stage => (
        <div key={stage} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Etapa: {STAGE_LABELS[stage]}</h2>
          <textarea rows={4} value={editing[stage] ?? ''}
            onChange={e => setEditing(prev => ({ ...prev, [stage]: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <Button size="sm" onClick={() => save(stage)}>
            {saved[stage] ? '✓ Salvo!' : 'Salvar'}
          </Button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Test all cadastros pages manually**
```powershell
npm run dev
```
Login as admin, navigate to `/cadastros/marcas`, `/cadastros/tipos`, `/cadastros/usuarios`, `/cadastros/whatsapp`. Verify each works.

- [ ] **Step 8: Commit**
```powershell
git add -A
git commit -m "feat: add admin cadastros pages (brands, types, users, WhatsApp templates)"
```

---

## Task 11: Management Dashboard

**Files:**
- Modify: `src/app/(app)/painel/page.tsx`
- Create: `src/components/dashboard/DashboardFilters.tsx`
- Create: `src/components/dashboard/MetricCard.tsx`
- Create: `src/components/dashboard/DefectsTable.tsx`
- Create: `src/components/dashboard/ExportButton.tsx`

- [ ] **Step 1: Create MetricCard**

Create `src/components/dashboard/MetricCard.tsx`:
```typescript
interface Props { label: string; value: string | number; sub?: string }

export function MetricCard({ label, value, sub }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create ExportButton**

Create `src/components/dashboard/ExportButton.tsx`:
```typescript
'use client'
import { utils, writeFile } from 'xlsx'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'
import { STAGE_LABELS } from '@/types'
import type { Defect } from '@/types'

export function ExportButton({ defects }: { defects: Defect[] }) {
  function handleExport() {
    const rows = defects.map(d => ({
      'Empresa': d.company?.name ?? '',
      'Marca': d.brand?.name ?? '',
      'Produto': d.product_name,
      'Referência': d.reference,
      'Cor': d.color ?? '',
      'Tamanho': d.size ?? '',
      'NF': d.nf_number ?? '',
      'Cód. Use': d.cod_use ?? '',
      'Tipo de Defeito': d.defect_type?.name ?? '',
      'Cliente': d.client_name,
      'Telefone': d.client_phone,
      'Recebido em': format(new Date(d.received_at), 'dd/MM/yyyy'),
      'Situação': STAGE_LABELS[d.current_stage],
      'Canal': d.communication_channel ?? '',
      'Protocolo': d.protocol_number ?? '',
      'Valor Pago Cliente': d.client_amount_paid ?? '',
      'Data Pagamento Cliente': d.client_paid_at ? format(new Date(d.client_paid_at), 'dd/MM/yyyy') : '',
      'Valor Recebido Marca': d.brand_reimbursement_amount ?? '',
      'Data Recebimento Marca': d.brand_reimbursed_at ? format(new Date(d.brand_reimbursed_at), 'dd/MM/yyyy') : '',
      'Forma Reembolso': d.reimbursement_method === 'invoice' ? 'Nota Fiscal' : d.reimbursement_method === 'bank_transfer' ? 'Conta Corrente' : '',
      'Observações': d.resolution_notes ?? '',
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Defeitos')
    writeFile(wb, `defeitos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  return (
    <Button variant="secondary" onClick={handleExport}>
      ↓ Exportar Excel
    </Button>
  )
}
```

- [ ] **Step 3: Create DefectsTable**

Create `src/components/dashboard/DefectsTable.tsx`:
```typescript
import Link from 'next/link'
import { format } from 'date-fns'
import { STAGE_LABELS } from '@/types'
import { Badge } from '@/components/ui/Badge'
import type { Defect } from '@/types'

export function DefectsTable({ defects }: { defects: Defect[] }) {
  if (!defects.length) return <p className="text-sm text-gray-400">Nenhum defeito encontrado.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
            {['Empresa','Marca','Produto','Cliente','Recebido','Situação','Pago','Recebido Marca'].map(h => (
              <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {defects.map(d => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="py-2 pr-4 text-gray-600">{d.company?.name}</td>
              <td className="py-2 pr-4 font-medium">{d.brand?.name}</td>
              <td className="py-2 pr-4">
                <Link href={`/defeito/${d.id}`} className="text-blue-600 hover:underline">
                  {d.product_name}
                </Link>
              </td>
              <td className="py-2 pr-4">{d.client_name}</td>
              <td className="py-2 pr-4 text-gray-600">{format(new Date(d.received_at), 'dd/MM/yy')}</td>
              <td className="py-2 pr-4"><Badge>{STAGE_LABELS[d.current_stage]}</Badge></td>
              <td className="py-2 pr-4">{d.client_amount_paid ? `R$ ${d.client_amount_paid.toFixed(2)}` : '—'}</td>
              <td className="py-2 pr-4">{d.brand_reimbursement_amount ? `R$ ${d.brand_reimbursement_amount.toFixed(2)}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Create dashboard page**

Replace `src/app/(app)/painel/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DefectsTable } from '@/components/dashboard/DefectsTable'
import { ExportButton } from '@/components/dashboard/ExportButton'
import { canAccessDashboard } from '@/lib/permissions'
import { subYears, format } from 'date-fns'

interface SearchParams { from?: string; to?: string; company?: string; brand?: string; stage?: string; operator?: string }

export default async function PainelPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !canAccessDashboard(profile.role)) redirect('/kanban')

  const from = searchParams.from ?? format(subYears(new Date(), 1), 'yyyy-MM-dd')
  const to = searchParams.to ?? format(new Date(), 'yyyy-MM-dd')

  let query = supabase.from('defects')
    .select('*, company:companies(*), brand:brands(*), defect_type:defect_types(*), received_by_profile:profiles!defects_received_by_fkey(*)')
    .gte('received_at', from)
    .lte('received_at', to)
    .order('received_at', { ascending: false })

  if (searchParams.company) query = query.eq('company_id', searchParams.company)
  if (searchParams.brand) query = query.eq('brand_id', searchParams.brand)
  if (searchParams.stage) query = query.eq('current_stage', searchParams.stage)
  if (searchParams.operator) query = query.eq('received_by', searchParams.operator)

  const { data: defects } = await query
  const all = defects ?? []

  const totalClientPaid = all.reduce((s, d) => s + (d.client_amount_paid ?? 0), 0)
  const totalBrandReceived = all.reduce((s, d) => s + (d.brand_reimbursement_amount ?? 0), 0)
  const openBalance = totalClientPaid - totalBrandReceived

  const byBrand: Record<string, number> = {}
  all.forEach(d => { const n = d.brand?.name ?? 'Desconhecida'; byBrand[n] = (byBrand[n] ?? 0) + 1 })
  const topBrand = Object.entries(byBrand).sort((a, b) => b[1] - a[1])[0]

  const [{ data: companies }, { data: brands }, { data: profiles }] = await Promise.all([
    supabase.from('companies').select('*').eq('active', true),
    supabase.from('brands').select('*').eq('active', true),
    supabase.from('profiles').select('*'),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Painel Gerencial</h1>

      {/* Filters */}
      <form className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">De</label>
          <input type="date" name="from" defaultValue={from} className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Até</label>
          <input type="date" name="to" defaultValue={to} className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Empresa</label>
          <select name="company" defaultValue={searchParams.company ?? ''} className="border border-gray-300 rounded px-2 py-1 text-sm bg-white">
            <option value="">Todas</option>
            {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Marca</label>
          <select name="brand" defaultValue={searchParams.brand ?? ''} className="border border-gray-300 rounded px-2 py-1 text-sm bg-white">
            <option value="">Todas</option>
            {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Situação</label>
          <select name="stage" defaultValue={searchParams.stage ?? ''} className="border border-gray-300 rounded px-2 py-1 text-sm bg-white">
            <option value="">Todas</option>
            {[['received','Recebido'],['in_progress','Processo Iniciado'],['awaiting_reimbursement','Ag. Indenização'],['paid_to_client','Pago ao Cliente'],['reimbursed_to_store','Indenizado à Loja'],['improcedente','Improcedente'],['doacao','Doação'],['nao_enviado','Não Enviado']].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Operador</label>
          <select name="operator" defaultValue={searchParams.operator ?? ''} className="border border-gray-300 rounded px-2 py-1 text-sm bg-white">
            <option value="">Todos</option>
            {profiles?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md">Filtrar</button>
        </div>
      </form>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total de defeitos" value={all.length} />
        <MetricCard label="Marca com mais defeitos" value={topBrand?.[0] ?? '—'} sub={topBrand ? `${topBrand[1]} ocorrências` : ''} />
        <MetricCard label="Reembolsado ao cliente" value={`R$ ${totalClientPaid.toFixed(2)}`} />
        <MetricCard label="Recebido das marcas" value={`R$ ${totalBrandReceived.toFixed(2)}`} />
        <MetricCard label="Saldo em aberto" value={`R$ ${openBalance.toFixed(2)}`} sub={openBalance > 0 ? 'A recuperar das marcas' : 'Em dia'} />
        <MetricCard label="Improcedentes" value={all.filter(d => d.current_stage === 'improcedente').length} />
        <MetricCard label="Em andamento" value={all.filter(d => ['received','in_progress','photos_attached','awaiting_reimbursement'].includes(d.current_stage)).length} />
        <MetricCard label="Finalizados" value={all.filter(d => d.current_stage === 'reimbursed_to_store').length} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">{all.length} defeitos</h2>
          <ExportButton defects={all} />
        </div>
        <DefectsTable defects={all} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Test dashboard manually**
```powershell
npm run dev
```
Navigate to `/painel`. Verify metrics show, filters work, table renders, export downloads xlsx file.

- [ ] **Step 6: Commit**
```powershell
git add -A
git commit -m "feat: add management dashboard with metrics, filters, table, and Excel export"
```

---

## Task 12: Deploy to Vercel

**Files:**
- No code changes — deployment configuration only

- [ ] **Step 1: Create GitHub repository**

Go to https://github.com/new. Create a private repo named `defeitos-gobbi`.

- [ ] **Step 2: Push code to GitHub**
```powershell
git remote add origin https://github.com/<your-username>/defeitos-gobbi.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Deploy on Vercel**

Go to https://vercel.com → Add New Project → Import from GitHub → select `defeitos-gobbi`.

In **Environment Variables**, add:
```
NEXT_PUBLIC_SUPABASE_URL=<your value>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your value>
SUPABASE_SERVICE_ROLE_KEY=<your value>
```

Click **Deploy**. Wait ~2 min.

- [ ] **Step 4: Set Supabase allowed URL**

In Supabase dashboard → Authentication → URL Configuration → add your Vercel URL (e.g., `https://defeitos-gobbi.vercel.app`) to **Site URL** and **Redirect URLs**.

- [ ] **Step 5: Smoke test on production**

Open the Vercel URL. Login, create a defect, advance stages, check dashboard. Verify photo upload works.

- [ ] **Step 6: Final commit**
```powershell
git add -A
git commit -m "chore: finalize deployment configuration"
git push
```

---

## Post-deploy: Create remaining users

For each user (Rodolfo, Rodrigo, Angela, Ilair, Cleonice), create via `/cadastros/usuarios`:
- Paloma & Rodolfo & Rodrigo → role: **admin**
- Angela, Ilair, Cleonice → role: **cashier**
