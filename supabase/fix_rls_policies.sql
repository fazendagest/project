-- ============================================================
-- FazendaGest - Fix RLS v2 (subquery direta, sem função auxiliar)
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Grants obrigatórios (se ainda não rodou)
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;

-- 2. Política da tabela farms
drop policy if exists "farms_owner" on farms;
create policy "farms_owner" on farms
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 3. Políticas das tabelas filhas usando subquery direta em vez de get_user_farm_id()
--    Isso evita qualquer problema de contexto com funções security definer

-- animals
drop policy if exists "animals_farm" on animals;
create policy "animals_farm" on animals
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

-- health_records
drop policy if exists "health_farm" on health_records;
create policy "health_farm" on health_records
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

-- reproduction_records
drop policy if exists "repro_farm" on reproduction_records;
create policy "repro_farm" on reproduction_records
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

-- feed_stock
drop policy if exists "feed_stock_farm" on feed_stock;
create policy "feed_stock_farm" on feed_stock
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

-- feed_records
drop policy if exists "feed_records_farm" on feed_records;
create policy "feed_records_farm" on feed_records
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

-- animal_purchases
drop policy if exists "purchases_farm" on animal_purchases;
create policy "purchases_farm" on animal_purchases
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

-- animal_sales
drop policy if exists "sales_farm" on animal_sales;
create policy "sales_farm" on animal_sales
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

-- operational_expenses
drop policy if exists "expenses_farm" on operational_expenses;
create policy "expenses_farm" on operational_expenses
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));
