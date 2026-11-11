-- 11/11/2026: pedido do Tião (fazenda e gado de corte), P3.
-- Gado de terceiros no pasto da fazenda: aluguel de pasto (R$ por cabeça por mês) ou parceria (acerto no fim).
-- Aditivo e seguro: tabela nova; nenhuma linha existente muda.
-- O telefone do dono fica só no banco (dado pessoal de terceiro não vai para o repositório).
-- Rodar no Supabase do cliente ANTES do push.

create table if not exists public.third_party_herds (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  owner_name text not null,
  owner_phone text,
  deal_type text not null check (deal_type in ('aluguel','parceria')),
  -- Aluguel: R$ por cabeça por mês.
  agreed_value numeric(12,2) check (agreed_value is null or agreed_value >= 0),
  -- Parceria: como foi combinado (ex.: 30% do ganho de peso) e quanto recebeu no acerto.
  partnership_terms text,
  settled_value numeric(12,2) check (settled_value is null or settled_value >= 0),
  herd_kind text not null default 'boi' check (herd_kind in ('vaca','boi','novilha','bezerro')),
  head_count int not null check (head_count > 0),
  entry_date date not null,
  exit_date date check (exit_date is null or exit_date >= entry_date),
  gta_number text,
  brucelose_tb_exam boolean not null default false,
  exam_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_third_party_herds_farm on public.third_party_herds(farm_id);

alter table public.third_party_herds enable row level security;

drop policy if exists "third_party_herds_farm" on public.third_party_herds;
create policy "third_party_herds_farm" on public.third_party_herds
  for all to authenticated
  using (
    farm_id in (select id from public.farms where owner_id = (select auth.uid()))
    or farm_id in (select farm_id from public.user_farms where user_id = (select auth.uid()))
  )
  with check (
    farm_id in (select id from public.farms where owner_id = (select auth.uid()))
    or farm_id in (select farm_id from public.user_farms where user_id = (select auth.uid()))
  );

-- Endurecimento do P1 (revisão de segurança de 11/11/2026): o diagnóstico só pode apontar para animal da mesma fazenda.
drop policy if exists "pregnancy_checks_farm" on public.pregnancy_checks;
create policy "pregnancy_checks_farm" on public.pregnancy_checks
  for all to authenticated
  using (
    farm_id in (select id from public.farms where owner_id = (select auth.uid()))
    or farm_id in (select farm_id from public.user_farms where user_id = (select auth.uid()))
  )
  with check (
    (
      farm_id in (select id from public.farms where owner_id = (select auth.uid()))
      or farm_id in (select farm_id from public.user_farms where user_id = (select auth.uid()))
    )
    and exists (select 1 from public.animals a where a.id = animal_id and a.farm_id = pregnancy_checks.farm_id)
  );

notify pgrst, 'reload schema';
