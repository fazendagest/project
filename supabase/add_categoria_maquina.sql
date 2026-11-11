-- Despesa: categoria "Máquina e trator" (Tião, P6, 11/11/2026). Horas de trator não são mão de obra.
-- Aditivo e seguro: só amplia a lista aceita; nenhuma linha existente muda. Rodar ANTES do push.
alter table public.operational_expenses drop constraint if exists operational_expenses_category_check;
alter table public.operational_expenses add constraint operational_expenses_category_check
  check (category in ('mao_de_obra','maquina','energia','manutencao','transporte','equipamento','veterinario','outro','fora_do_gado'));
