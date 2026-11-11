-- 11/11/2026: categoria de despesa "Fora dos animais" (galinha, lavoura para vender, casa).
-- Essas despesas não entram no custo dos animais; as demais se dividem por cabeça (lib/investment.ts).
-- Aditivo e seguro: só amplia a lista aceita; nenhuma linha existente muda.
-- Rodar no Supabase do cliente ANTES do push, senão gravar essa categoria dá erro.
alter table public.operational_expenses drop constraint if exists operational_expenses_category_check;
alter table public.operational_expenses add constraint operational_expenses_category_check
  check (category in ('mao_de_obra','energia','manutencao','transporte','equipamento','veterinario','outro','fora_do_gado'));
