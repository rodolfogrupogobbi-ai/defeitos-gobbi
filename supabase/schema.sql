-- ============================================================
-- Grupo Gobbi — Defeitos — Database Schema
-- Run this ENTIRE file in Supabase SQL Editor (two separate
-- queries if needed: Part 1 then Part 2)
-- ============================================================

-- ========================
-- PART 1: Tables + Trigger
-- ========================

create extension if not exists "uuid-ossp";

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table defect_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'cashier')),
  created_at timestamptz not null default now()
);

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

create table whatsapp_templates (
  id uuid primary key default uuid_generate_v4(),
  stage text not null unique check (stage in ('received','awaiting_reimbursement','paid_to_client')),
  message_template text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger defects_updated_at
  before update on defects
  for each row execute function update_updated_at();

-- ========================
-- PART 2: RLS + Seed data
-- ========================

alter table profiles enable row level security;
alter table companies enable row level security;
alter table brands enable row level security;
alter table defect_types enable row level security;
alter table defects enable row level security;
alter table defect_history enable row level security;
alter table whatsapp_templates enable row level security;

create policy "auth read profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "auth read companies" on companies for select using (auth.role() = 'authenticated');
create policy "auth read brands" on brands for select using (auth.role() = 'authenticated');
create policy "auth read defect_types" on defect_types for select using (auth.role() = 'authenticated');
create policy "auth read defects" on defects for select using (auth.role() = 'authenticated');
create policy "auth read history" on defect_history for select using (auth.role() = 'authenticated');
create policy "auth read templates" on whatsapp_templates for select using (auth.role() = 'authenticated');

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

insert into companies (name, slug) values
  ('MPB', 'mpb'), ('BY', 'by'), ('RRPB', 'rrpb'),
  ('GOBBI', 'gobbi'), ('LA LUNA', 'la_luna'), ('GS', 'gs');

insert into whatsapp_templates (stage, message_template) values
  ('received', 'Olá, {client_name}! Seu produto {product_name} da marca {brand} foi recebido pela {company} em {received_at}. Protocolo: {protocol}. Em até 30 dias retornaremos com uma solução.'),
  ('awaiting_reimbursement', 'Olá, {client_name}! Seu defeito já foi encaminhado à marca {brand} e estamos aguardando o retorno deles. Em breve te avisamos!'),
  ('paid_to_client', 'Olá, {client_name}! O reembolso referente ao seu produto {product_name} foi efetuado. Qualquer dúvida, estamos à disposição!');
