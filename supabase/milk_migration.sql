-- ============================================================
-- FazendaGest - Migração Módulo de Leite
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS milk_production (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_liters numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milk_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  payment_date date,
  buyer_name text,
  total_liters numeric,
  price_per_liter numeric,
  total_amount numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE milk_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE milk_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farm access milk_production" ON milk_production
  FOR ALL USING (
    farm_id IN (SELECT id FROM farms WHERE owner_id = auth.uid())
    OR
    farm_id IN (SELECT farm_id FROM user_farms WHERE user_id = auth.uid())
  );

CREATE POLICY "farm access milk_payments" ON milk_payments
  FOR ALL USING (
    farm_id IN (SELECT id FROM farms WHERE owner_id = auth.uid())
    OR
    farm_id IN (SELECT farm_id FROM user_farms WHERE user_id = auth.uid())
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_milk_production_farm_date ON milk_production(farm_id, date);
CREATE INDEX IF NOT EXISTS idx_milk_payments_farm_month ON milk_payments(farm_id, reference_month);
CREATE INDEX IF NOT EXISTS idx_milk_payments_farm_payment_date ON milk_payments(farm_id, payment_date);

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
-- SELECT * FROM milk_production LIMIT 5;
-- SELECT * FROM milk_payments LIMIT 5;
