-- ============================================================
-- FazendaGest - Schema completo do banco de dados
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Habilitar extensões necessárias
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELA: farms (propriedades)
-- ============================================================
create table if not exists farms (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  location text,
  area_hectares numeric(10,2),
  created_at timestamptz default now() not null
);

-- ============================================================
-- TABELA: animals (animais)
-- ============================================================
create table if not exists animals (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references farms(id) on delete cascade not null,
  code text not null,
  name text,
  species text not null check (species in ('bovino','equino','suino')),
  breed text,
  sex text not null check (sex in ('M','F')),
  birth_date date,
  entry_date date not null default current_date,
  entry_type text not null check (entry_type in ('nascimento','compra')),
  status text not null default 'ativo' check (status in ('ativo','vendido','abatido','morto')),
  notes text,
  photo_url text,
  market_value numeric(12,2),
  created_at timestamptz default now() not null
);

create index if not exists idx_animals_farm_id on animals(farm_id);
create index if not exists idx_animals_species on animals(species);
create index if not exists idx_animals_status on animals(status);
create unique index if not exists idx_animals_code_farm on animals(farm_id, code);

-- ============================================================
-- TABELA: health_records (registros de saúde)
-- ============================================================
create table if not exists health_records (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references farms(id) on delete cascade not null,
  animal_id uuid references animals(id) on delete cascade not null,
  type text not null check (type in ('vacina','vermifugacao','medicamento','consulta')),
  product_name text not null,
  dose text,
  application_date date not null default current_date,
  next_due_date date,
  applied_by text,
  cost numeric(10,2) default 0,
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_health_farm_id on health_records(farm_id);
create index if not exists idx_health_animal_id on health_records(animal_id);
create index if not exists idx_health_date on health_records(application_date);

-- ============================================================
-- TABELA: reproduction_records (registros de reprodução)
-- ============================================================
create table if not exists reproduction_records (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references farms(id) on delete cascade not null,
  female_id uuid references animals(id) on delete cascade not null,
  male_id uuid references animals(id) on delete set null,
  external_male_name varchar,
  coverage_date date not null,
  expected_birth_date date,
  actual_birth_date date,
  offspring_count int default 0,
  status text not null default 'coberta' check (status in ('coberta','prenha','parida','perdida')),
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_repro_farm_id on reproduction_records(farm_id);
create index if not exists idx_repro_female_id on reproduction_records(female_id);

-- ============================================================
-- TABELA: feed_stock (estoque de ração/insumos)
-- ============================================================
create table if not exists feed_stock (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references farms(id) on delete cascade not null,
  product_name text not null,
  unit text not null check (unit in ('kg','saco','fardo','litro','outro')),
  current_quantity numeric(12,2) default 0,
  min_quantity numeric(12,2) default 0,
  cost_per_unit numeric(10,2) default 0,
  last_updated timestamptz default now() not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_feed_stock_farm_id on feed_stock(farm_id);
create index if not exists idx_feed_stock_purchase_date on feed_stock(purchase_date);

-- ============================================================
-- TABELA: feed_records (registros de consumo de ração)
-- ============================================================
create table if not exists feed_records (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references farms(id) on delete cascade not null,
  species text not null check (species in ('bovino','equino','suino','geral')),
  feed_stock_id uuid references feed_stock(id) on delete set null,
  date date not null default current_date,
  quantity_used numeric(12,2) not null,
  cost_total numeric(12,2) default 0,
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_feed_records_farm_id on feed_records(farm_id);
create index if not exists idx_feed_records_date on feed_records(date);
create index if not exists idx_feed_records_species on feed_records(species);

-- ============================================================
-- TABELA: animal_purchases (compra de animais)
-- ============================================================
create table if not exists animal_purchases (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references farms(id) on delete cascade not null,
  animal_id uuid references animals(id) on delete cascade not null,
  seller_name text,
  purchase_date date not null default current_date,
  purchase_price numeric(12,2) default 0,
  weight_kg numeric(8,2),
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_purchases_farm_id on animal_purchases(farm_id);
create index if not exists idx_purchases_animal_id on animal_purchases(animal_id);
create index if not exists idx_purchases_date on animal_purchases(purchase_date);

-- ============================================================
-- TABELA: animal_sales (venda de animais)
-- ============================================================
create table if not exists animal_sales (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references farms(id) on delete cascade not null,
  animal_id uuid references animals(id) on delete cascade not null,
  buyer_name text,
  sale_date date not null default current_date,
  sale_price numeric(12,2) not null,
  weight_kg numeric(8,2),
  price_per_kg numeric(8,2),
  sale_type text not null check (sale_type in ('venda','abate')),
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_sales_farm_id on animal_sales(farm_id);
create index if not exists idx_sales_animal_id on animal_sales(animal_id);
create index if not exists idx_sales_date on animal_sales(sale_date);

-- ============================================================
-- TABELA: operational_expenses (despesas operacionais)
-- ============================================================
create table if not exists operational_expenses (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references farms(id) on delete cascade not null,
  category text not null check (category in ('mao_de_obra','energia','manutencao','transporte','equipamento','veterinario','outro')),
  date date not null default current_date,
  amount numeric(12,2) not null,
  description text not null,
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_expenses_farm_id on operational_expenses(farm_id);
create index if not exists idx_expenses_date on operational_expenses(date);
create index if not exists idx_expenses_category on operational_expenses(category);

-- ============================================================
-- GRANTS (permissões de acesso para o role authenticated)
-- ============================================================
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table farms enable row level security;
alter table animals enable row level security;
alter table health_records enable row level security;
alter table reproduction_records enable row level security;
alter table feed_stock enable row level security;
alter table feed_records enable row level security;
alter table animal_purchases enable row level security;
alter table animal_sales enable row level security;
alter table operational_expenses enable row level security;

-- Políticas: usuário só acessa fazendas que ele criou
create policy "farms_owner" on farms
  for all using (owner_id = auth.uid());

-- Helper function para obter farm_id do usuário autenticado
create or replace function get_user_farm_id()
returns uuid language sql stable security definer
set search_path = public as $$
  select id from farms where owner_id = auth.uid() limit 1;
$$;

-- Políticas para todas as tabelas filhas (subquery direta, mais robusta)
create policy "animals_farm" on animals
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

create policy "health_farm" on health_records
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

create policy "repro_farm" on reproduction_records
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

create policy "feed_stock_farm" on feed_stock
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

create policy "feed_records_farm" on feed_records
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

create policy "purchases_farm" on animal_purchases
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

create policy "sales_farm" on animal_sales
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

create policy "expenses_farm" on operational_expenses
  for all
  using  (farm_id in (select id from farms where owner_id = auth.uid()))
  with check (farm_id in (select id from farms where owner_id = auth.uid()));

-- ============================================================
-- VIEW: animal_costs (custo acumulado por animal)
-- ============================================================
create or replace view animal_costs as
select
  a.id as animal_id,
  a.farm_id,
  a.code,
  a.name,
  a.species,
  a.status,
  a.entry_date,
  coalesce(p.purchase_price, 0) as purchase_cost,
  coalesce(h.health_cost, 0) as health_cost,
  coalesce(p.purchase_price, 0) + coalesce(h.health_cost, 0) as total_cost,
  s.sale_price,
  s.sale_date,
  case
    when s.sale_price is not null
    then s.sale_price - (coalesce(p.purchase_price, 0) + coalesce(h.health_cost, 0))
    else null
  end as profit,
  case
    when s.sale_price is not null and s.sale_price > 0
    then round(
      (s.sale_price - (coalesce(p.purchase_price, 0) + coalesce(h.health_cost, 0)))
      / s.sale_price * 100, 2
    )
    else null
  end as margin_pct,
  case
    when s.sale_date is not null
    then (s.sale_date - a.entry_date)
    else (current_date - a.entry_date)
  end as days_in_stock
from animals a
left join (
  select animal_id, sum(purchase_price) as purchase_price
  from animal_purchases group by animal_id
) p on p.animal_id = a.id
left join (
  select animal_id, sum(cost) as health_cost
  from health_records group by animal_id
) h on h.animal_id = a.id
left join (
  select animal_id, sum(sale_price) as sale_price, max(sale_date) as sale_date
  from animal_sales group by animal_id
) s on s.animal_id = a.id;

-- ============================================================
-- FUNÇÃO: next_animal_code
-- ============================================================
create or replace function next_animal_code(p_farm_id uuid, p_species text)
returns text language plpgsql as $$
declare
  prefix text;
  next_num int;
begin
  prefix := case p_species
    when 'bovino' then 'BOV'
    when 'equino' then 'EQU'
    when 'suino' then 'SUI'
    else 'ANI'
  end;

  select coalesce(max(
    cast(regexp_replace(code, '[^0-9]', '', 'g') as int)
  ), 0) + 1
  into next_num
  from animals
  where farm_id = p_farm_id
    and code like prefix || '-%';

  return prefix || '-' || lpad(next_num::text, 3, '0');
end;
$$;

-- ============================================================
-- MIGRAÇÃO: colunas de compra no feed_stock
-- Execute no SQL Editor do Supabase após o schema principal
-- ============================================================
alter table feed_stock add column if not exists purchase_date date;
alter table feed_stock add column if not exists total_cost numeric(12,2) default 0;

-- Popular dados existentes: custo total a partir do estoque × custo unitário,
-- data de compra a partir de last_updated
update feed_stock
set
  total_cost = current_quantity * cost_per_unit,
  purchase_date = last_updated::date
where total_cost is null or total_cost = 0;
