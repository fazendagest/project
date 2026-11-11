-- 11/11/2026: pedido do Tião (fazenda e gado de corte), P1.
-- 1) Diagnóstico de gestação (toque ou ultrassom) na vaca e na novilha: data, resultado e previsão de parto.
-- 2) Motivo da venda.
-- 3) Data e causa da morte.
-- Aditivo e seguro: tabela nova e colunas novas, opcionais; nenhuma linha existente muda.
-- Rodar no Supabase do cliente ANTES do push, senão gravar venda e animal dá erro.

create table if not exists public.pregnancy_checks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  exam_date date not null default current_date,
  result text not null check (result in ('prenhe','vazia')),
  expected_birth_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pregnancy_checks_farm on public.pregnancy_checks(farm_id);
create index if not exists idx_pregnancy_checks_animal on public.pregnancy_checks(animal_id);

alter table public.pregnancy_checks enable row level security;

drop policy if exists "pregnancy_checks_farm" on public.pregnancy_checks;
create policy "pregnancy_checks_farm" on public.pregnancy_checks
  for all to authenticated
  using (
    farm_id in (select id from public.farms where owner_id = (select auth.uid()))
    or farm_id in (select farm_id from public.user_farms where user_id = (select auth.uid()))
  )
  with check (
    farm_id in (select id from public.farms where owner_id = (select auth.uid()))
    or farm_id in (select farm_id from public.user_farms where user_id = (select auth.uid()))
  );

alter table public.animal_sales add column if not exists sale_reason text
  check (sale_reason in ('bezerro_desmamado','magro','gordo','descarte','outro'));

alter table public.animals add column if not exists death_date date;
alter table public.animals add column if not exists death_cause text
  check (death_cause in ('doenca','parto','bicho','acidente','clima','desconhecida'));

notify pgrst, 'reload schema';
