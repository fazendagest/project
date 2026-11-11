-- 11/11/2026: despesa fixa (salário do caseiro, conta de luz), paga todo mês.
-- Uma linha só: date = primeiro pagamento; vale todo mês, no mesmo dia, até fixed_until (vazio = continua).
-- O fazendeiro não precisa lançar de novo a cada mês (Henrique, 11/11/2026).
-- Aditivo e seguro: colunas novas; as linhas que já existem continuam iguais (is_fixed = false).
-- Rodar no Supabase do cliente ANTES do push, senão gravar despesa dá erro.
alter table public.operational_expenses add column if not exists is_fixed boolean not null default false;
alter table public.operational_expenses add column if not exists fixed_until date;
