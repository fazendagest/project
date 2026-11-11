-- 11/11/2026: separa touro (macho inteiro, reprodutor) de boi (castrado) no gado.
-- Aditivo e seguro: coluna nova com padrão false; as políticas de RLS da tabela continuam valendo.
alter table public.animals add column if not exists is_breeder boolean not null default false;
