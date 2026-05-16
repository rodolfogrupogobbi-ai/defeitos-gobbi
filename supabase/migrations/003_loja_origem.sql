-- Add loja_origem field to defects
ALTER TABLE defects
  ADD COLUMN IF NOT EXISTS loja_origem TEXT
  CHECK (loja_origem IN ('MPB_FEMININO', 'MPB_MASCULINO', 'LA_LUNA', 'OUTLET'));
