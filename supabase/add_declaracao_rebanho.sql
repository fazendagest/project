-- Declaração de Rebanho no SIDAGO marcada como feita, por fazenda e por período (Tião, P7, 11/11/2026).
-- Ex.: '2026-11' (2ª etapa, novembro) e '2027-05' (1ª etapa, maio).
-- Aditivo: coluna com valor padrão. Sem ela o painel continua de pé; só o botão "Já fiz" não grava.
alter table public.farms
  add column if not exists herd_declarations text[] not null default '{}';
