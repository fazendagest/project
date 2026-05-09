-- ============================================================
-- FazendaGest - Migração Multi-Tenant
-- Execute no SQL Editor do Supabase (em ordem)
-- ============================================================

-- ============================================================
-- PASSO 1: Adicionar novas colunas à tabela farms
-- ============================================================
ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'trial' NOT NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at date DEFAULT (CURRENT_DATE + INTERVAL '90 days');

-- ============================================================
-- PASSO 2: Criar tabela user_farms (vínculo usuário-fazenda)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_farms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'owner' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, farm_id)
);

-- ============================================================
-- PASSO 3: Habilitar RLS na tabela user_farms
-- ============================================================
ALTER TABLE user_farms ENABLE ROW LEVEL SECURITY;

-- Grants para a nova tabela
GRANT ALL ON user_farms TO anon, authenticated;

-- ============================================================
-- PASSO 4: Políticas RLS para user_farms
-- ============================================================
DROP POLICY IF EXISTS "user_farms_owner" ON user_farms;
CREATE POLICY "user_farms_owner" ON user_farms
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PASSO 5: Atualizar política de farms para incluir is_active
-- (mantém owner_id como mecanismo principal de isolamento)
-- ============================================================
DROP POLICY IF EXISTS "farms_owner" ON farms;
CREATE POLICY "farms_owner" ON farms
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ============================================================
-- PASSO 6: Migração de dados - criar user_farms para fazendas existentes
-- ============================================================
INSERT INTO user_farms (user_id, farm_id, role)
SELECT owner_id, id, 'owner'
FROM farms
WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, farm_id) DO NOTHING;

-- ============================================================
-- PASSO 7: Atualizar função helper get_user_farm_id
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_farm_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT farm_id FROM user_farms WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- PASSO 8: Script de migração do fazendeiro atual
-- IMPORTANTE: Substitua 'SEU_USER_ID_AQUI' pelo seu user_id real
-- (encontre em Supabase > Authentication > Users)
-- ============================================================

-- Verificar seu user_id e fazenda atual:
-- SELECT id, owner_id, name FROM farms;
-- SELECT id FROM auth.users WHERE email = 'seu@email.com';

-- Atualizar nome da fazenda principal (opcional):
-- UPDATE farms SET owner_name = 'Seu Nome', city = 'Sua Cidade', state = 'UF'
-- WHERE owner_id = 'SEU_USER_ID_AQUI';

-- ============================================================
-- VERIFICAÇÃO: Confirmar que a migração funcionou
-- ============================================================
-- SELECT uf.user_id, f.name, f.is_active, f.plan
-- FROM user_farms uf
-- JOIN farms f ON f.id = uf.farm_id;
