-- 11/11/2026: pedido do Tião (fazenda e gado de cria), com a opção A do Henrique: os avisos ficam só
-- dentro do sistema por 30 dias, e depois se decide se vale mandar por WhatsApp. Para medir, um registro
-- por dia em que o DONO abre qualquer tela: fazenda e data, nada mais (sem hora, sem tela, sem aparelho).
-- Só aparece na área /admin, que lê com a chave de serviço no servidor.
-- Aditivo e seguro: tabela nova; nenhuma linha existente muda.

create table if not exists public.farm_access_days (
  farm_id uuid not null references public.farms(id) on delete cascade,
  day date not null,
  primary key (farm_id, day)
);

alter table public.farm_access_days enable row level security;

-- O dono grava e lê só o dia da própria fazenda. Sem UPDATE nem DELETE: o registro não se altera.
drop policy if exists "farm_access_days_owner_insert" on public.farm_access_days;
create policy "farm_access_days_owner_insert" on public.farm_access_days
  for insert to authenticated
  with check (farm_id in (select id from public.farms where owner_id = (select auth.uid())));

drop policy if exists "farm_access_days_owner_select" on public.farm_access_days;
create policy "farm_access_days_owner_select" on public.farm_access_days
  for select to authenticated
  using (farm_id in (select id from public.farms where owner_id = (select auth.uid())));
