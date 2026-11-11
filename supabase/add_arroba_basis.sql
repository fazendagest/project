-- P6 item 6 do Tião (11/11/2026): a arroba do peso da venda é de carcaça (frigorífico) ou de peso vivo
-- (@ do comércio, 30 kg vivos). Sem ela, o R$ por @ não dá para comparar com a referência.
-- Aditivo: coluna nova, opcional; as vendas antigas ficam sem resposta até o dono editar.
alter table public.animal_sales
  add column if not exists arroba_basis text
  check (arroba_basis in ('carcaca', 'vivo'));

comment on column public.animal_sales.arroba_basis is
  'Arroba do peso da venda: carcaca (frigorifico, 15 kg de carcaca) ou vivo (@ do comercio, 30 kg vivos). P6 item 6.';
