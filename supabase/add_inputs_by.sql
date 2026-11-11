-- Gado de terceiros: quem dá o sal e a vacina do lote (Tião, teste do P3, 11/11/2026).
-- Aditivo: coluna opcional, sem valor padrão. Rodar antes do push.
alter table public.third_party_herds
  add column if not exists inputs_by text
  check (inputs_by in ('dono', 'eu', 'dividido'));
