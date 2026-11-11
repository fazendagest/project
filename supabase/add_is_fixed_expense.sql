-- 11/11/2026: despesa fixa (salário do caseiro, conta de luz), paga todo mês.
-- Cada mês continua sendo uma linha; is_fixed só avisa o sistema para lembrar de lançar o mês seguinte.
-- Aditivo e seguro: coluna nova com padrão false; as políticas de RLS da tabela continuam valendo.
-- Rodar no Supabase do cliente ANTES do push, senão gravar despesa dá erro.
alter table public.operational_expenses add column if not exists is_fixed boolean not null default false;
