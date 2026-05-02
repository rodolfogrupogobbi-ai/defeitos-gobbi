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
