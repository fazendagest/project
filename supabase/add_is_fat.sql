-- Animal gordo, pronto para o frigorífico (decisão de 11/11/2026, opção A).
-- Quando marcado, o valor de mercado sai pela arroba do boi gordo, novilha gorda ou vaca gorda
-- do IFAG, usando o peso vivo. Rodar no Supabase do cliente ANTES do push: sem a coluna,
-- salvar animal dá erro.
alter table animals add column if not exists is_fat boolean not null default false;
