-- ============================================================
-- FazendaGest - Migração Cadastro / Register
-- Execute no SQL Editor do Supabase após multitenant_migration.sql
-- ============================================================

-- Colunas para módulo de leite na tabela farms
ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS milk_active boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS milkings_per_day integer DEFAULT 1 NOT NULL;

-- Coluna para função do usuário na fazenda (proprietario/gerente/veterinario/caseiro)
ALTER TABLE user_farms
  ADD COLUMN IF NOT EXISTS farm_role text DEFAULT 'proprietario';

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
-- SELECT id, name, milk_active, milkings_per_day FROM farms LIMIT 5;
-- SELECT user_id, farm_id, role, farm_role FROM user_farms LIMIT 5;
