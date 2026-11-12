-- 11/11/2026: pedido do Tião (fazenda e gado de cria), P10, aprovado pelo Henrique.
-- "Ofertas recebidas": o fazendeiro anota as ofertas de compradores para comparar antes de fechar a venda.
-- Uso interno: nada é enviado a ninguém. Aditivo e seguro: tabela nova; nenhuma linha existente muda.
-- O nome do comprador é dado de terceiro: fica só no banco, com acesso só do dono da fazenda.
-- Rodar no Supabase do cliente ANTES do push.

create table if not exists public.sale_offers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  buyer_name text not null check (length(trim(buyer_name)) between 1 and 120),
  animal_ids uuid[] not null check (cardinality(animal_ids) between 1 and 500),
  -- Preço por @ (vivo ou carcaça) ou por cabeça.
  price_kind text not null check (price_kind in ('arroba','cabeca')),
  price numeric(12,2) not null check (price > 0),
  arroba_basis text not null default 'vivo' check (arroba_basis in ('vivo','carcaca')),
  -- Peso estimado em @ vivo de cada animal sem peso no cadastro ("se não pesou, estime").
  est_arrobas numeric(8,2) check (est_arrobas is null or (est_arrobas > 0 and est_arrobas < 100)),
  -- Quem paga o frete; quando é o fazendeiro, quanto.
  freight_by text not null default 'comprador' check (freight_by in ('comprador','vendedor')),
  freight_value numeric(12,2) check (freight_value is null or freight_value >= 0),
  payment text not null default 'vista' check (payment in ('vista','prazo')),
  payment_days int check (payment_days is null or (payment_days > 0 and payment_days <= 720)),
  offer_date date not null default current_date,
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_sale_offers_farm on public.sale_offers(farm_id, offer_date desc);

alter table public.sale_offers enable row level security;

-- Só o dono da fazenda (como a farms), e todos os animais da oferta têm de ser da mesma fazenda.
drop policy if exists "sale_offers_owner" on public.sale_offers;
create policy "sale_offers_owner" on public.sale_offers
  for all to authenticated
  using (farm_id in (select id from public.farms where owner_id = (select auth.uid())))
  with check (
    farm_id in (select id from public.farms where owner_id = (select auth.uid()))
    and not exists (
      select 1 from unnest(animal_ids) as x(id)
      where not exists (select 1 from public.animals a where a.id = x.id and a.farm_id = sale_offers.farm_id)
    )
  );
