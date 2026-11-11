-- P5 do Tião (11/11/2026): papel da vaca no rebanho, destino do bezerro e raça do pai na cobertura.
-- Aditivo: colunas novas e opcionais. Vazio = padrão calculado pela raça (lib/herd-role.ts).
-- Descarte continua na coluna animals.to_discard, que já existe.
alter table public.animals
  add column if not exists herd_role text check (herd_role in ('reposicao', 'cruzamento'));

alter table public.animals
  add column if not exists calf_destination text check (calf_destination in ('venda', 'reposicao'));

alter table public.reproduction_records
  add column if not exists sire_breed text;

comment on column public.animals.herd_role is 'Papel da femea adulta: reposicao (bezerras ficam) ou cruzamento (filho todo vendido). Vazio = padrao pela raca. P5.';
comment on column public.animals.calf_destination is 'Destino do bezerro: venda na desmama ou reposicao. Vazio = padrao pela mae. P5.';
comment on column public.reproduction_records.sire_breed is 'Raca do pai na cobertura ou inseminacao (Angus, Nelore...). P5.';
