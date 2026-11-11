-- P4 do Tião (11/11/2026): desmama do bezerro, para o índice "kg desmamado por vaca exposta".
-- Aditivo: colunas novas e opcionais. Sem peso lançado, o painel diz o que falta (nunca 0%).
alter table public.animals
  add column if not exists weaned_at date;

alter table public.animals
  add column if not exists weaning_weight_kg numeric check (weaning_weight_kg is null or (weaning_weight_kg > 0 and weaning_weight_kg < 600));

comment on column public.animals.weaned_at is 'Data da desmama do bezerro. P4.';
comment on column public.animals.weaning_weight_kg is 'Peso vivo na desmama, em kg (balanca ou fita). P4.';
