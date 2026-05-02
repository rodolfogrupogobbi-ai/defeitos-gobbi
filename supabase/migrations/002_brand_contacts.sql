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
