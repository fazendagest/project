-- Saúde: número do atestado da vacina de brucelose no SIDAGO (Tião, P6, 11/11/2026).
-- Aditivo: coluna opcional. Rodar antes do push.
alter table public.health_records
  add column if not exists sidago_certificate text;
