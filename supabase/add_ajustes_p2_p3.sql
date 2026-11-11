-- 11/11/2026: ajustes do Tião (fazenda e gado de corte) na revisão do P2 e do P3.
-- Aditivo e seguro: colunas novas opcionais; a trava de tipo de entrada só ganha um valor novo.
-- Rodar no Supabase do cliente ANTES do push.

-- P2: compra de ração marcada para o porco não entra no custo do gado (e vice-versa).
alter table public.feed_stock add column if not exists for_pigs boolean not null default false;

-- P3: acerto de parceria em cabeças (bezerros) em vez de dinheiro.
alter table public.third_party_herds add column if not exists settled_heads int check (settled_heads is null or settled_heads > 0);

-- P3: área de pasto separada da área total (a lotação é por hectare de pasto).
alter table public.farms add column if not exists pasture_hectares numeric(10,2) check (pasture_hectares is null or pasture_hectares >= 0);

-- P3: bezerro recebido no acerto de parceria entra no rebanho com origem "parceria".
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.animals'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%entry_type%'
  loop
    execute format('alter table public.animals drop constraint %I', c);
  end loop;
end $$;
alter table public.animals add constraint animals_entry_type_check
  check (entry_type in ('nascimento','compra','arrendamento','parceria'));

notify pgrst, 'reload schema';
