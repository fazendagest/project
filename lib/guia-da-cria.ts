// Texto do "Guia da cria" (Tião, fazenda e gado de cria, P9, revisado em 11/11/2026). Não mudar o conteúdo sem o Tião.
// Marcação: **negrito** e "(ver no sistema: Tela)", que vira link pela tabela SYSTEM_LINKS.

export type GuideItem = string | { text: string; sub: string[] }
export type GuideBlock =
  | { p: string }
  | { ul: GuideItem[] }
  | { cards: { name: string; what: string; bad: string; target: string }[] }

export type GuideSection = { id: string; title: string; blocks: GuideBlock[] }

/** Tela do sistema citada no texto: "(ver no sistema: X)". */
export const SYSTEM_LINKS: Record<string, string> = {
  'Reprodução': '/app/reproduction',
  'Gado de terceiros': '/app/pasture',
}

/** Seção aberta pelo link "Entenda estes números" do cartão da cria. */
export const NUMBERS_SECTION_ID = 'numeros'

export const GUIDE_TITLE = 'Guia da cria: como esta fazenda ganha dinheiro'

export const GUIDE_FOOTER = 'Referências: Embrapa, IFAG e Secretaria de Agricultura de Goiás, nov/2026. Os preços mudam; os números da sua fazenda estão no Dashboard.'

export const GUIDE: GuideSection[] = [
  {
    id: 'negocio',
    title: '1. O negócio em uma frase',
    blocks: [
      { p: 'A fazenda vive de **fazer bezerro e vender na desmama**, com 7 a 8 meses. A vaca é a fábrica, e o bezerro é o produto. Cada vaca precisa dar **um bezerro por ano**. Vaca que passa um ano sem bezerro come o pasto, o sal e o remédio de graça.' },
      { p: 'Do bezerro concebido até a venda passam uns 17 meses: 9 meses e meio de gestação mais 7 a 8 de mamada. Por isso o erro custa caro: quem descobre tarde que a vaca está vazia perde um ano inteiro dela.' },
    ],
  },
  {
    id: 'calendario',
    title: '2. O ano da fazenda, mês a mês',
    blocks: [
      {
        ul: [
          '**Novembro a janeiro, estação de monta:** o touro fica com as vacas só nesses 90 dias, ou se faz inseminação. Fora desse tempo, o touro fica separado. Assim todos os bezerros nascem juntos, desmamam juntos e são vendidos num lote igual, que vale mais.',
          '**Fevereiro, diagnóstico de gestação:** o veterinário faz o toque em todas as vacas e novilhas que estavam na monta. Lance cada resultado (ver no sistema: Reprodução).',
          {
            text: '**Março a maio:**',
            sub: [
              'desmama, aos 7 a 8 meses;',
              'venda dos bezerros e das vacas vazias;',
              'vacina de brucelose nas bezerras de 3 a 8 meses, com o veterinário, e atestado no SIDAGO.',
            ],
          },
          '**Maio a outubro, seca:** sal proteinado, pasto guardado (vedado) para a seca e água sempre limpa.',
          '**Agosto a outubro, parição:** vacas prenhes num pasto perto da sede, com o caseiro passando todo dia.',
          '**Outubro:** exame do touro (andrológico) antes da estação.',
          '**Maio e novembro:** Declaração de Rebanho no SIDAGO. Sem ela não sai GTA, e sem GTA não se vende nem se transporta animal. É de graça. A GTA custa uns R$ 18 por caminhão mais centavos por cabeça.',
        ],
      },
    ],
  },
  {
    id: NUMBERS_SECTION_ID,
    title: '3. Os números que dizem se está dando certo',
    blocks: [
      { p: 'Todos aparecem no Dashboard, no cartão «Cria: como está e a meta».' },
      {
        cards: [
          { name: 'Prenhez', what: 'das vacas que foram para a monta, quantas emprenharam', bad: 'abaixo de 70%', target: '80%' },
          { name: 'Desmame', what: 'bezerros desmamados ÷ vacas que foram para a monta. É o número mais importante.', bad: 'abaixo de 60%', target: '80% em 2028' },
          { name: 'Kg de bezerro por vaca', what: 'peso de bezerro desmamado ÷ vacas que foram para a monta. Junta tudo num número só.', bad: 'abaixo de 100 kg', target: '135 kg em 2028; 160 kg em 2030' },
          { name: 'Mortalidade de bezerros', what: 'bezerros que morreram ÷ nascidos', bad: 'acima de 5%', target: 'abaixo de 3%' },
          { name: 'Intervalo entre partos', what: 'tempo entre um parto e o seguinte da mesma vaca', bad: 'acima de 15 meses', target: '12 a 13 meses' },
          { name: 'Idade ao primeiro parto', what: 'idade da novilha quando pare o primeiro bezerro', bad: 'acima de 40 meses', target: '36 meses; 30 em 2030' },
          { name: 'Custo por vaca no ano', what: 'tudo o que o gado gastou no ano ÷ vacas e novilhas', bad: '', target: 'menor que o preço do bezerro' },
        ],
      },
      { p: '**A conta que manda:** o custo de um bezerro é o custo da vaca no ano dividido pela taxa de desmame. Se a vaca custa R$ 1.500 por ano e a fazenda desmama 75%, cada bezerro custou R$ 2.000. Se o bezerro vende por menos que isso, a fazenda perde dinheiro, mesmo vendendo.' },
      { p: '**Para os números ficarem certos, lance:** cada nascimento com a mãe, cada diagnóstico, o peso na desmama (balança ou fita), cada venda e cada compra de sal, ração e remédio, além das despesas do mês (caseiro, energia, diesel).' },
    ],
  },
  {
    id: 'vender-vaca',
    title: '4. Quando vender uma vaca',
    blocks: [
      { p: 'Nem toda vaca compensa vender, e nem toda compensa manter. A pergunta é sempre a mesma: **ela vai dar bezerro no ano que vem?**' },
      { p: '**Vender (descarte):**' },
      {
        ul: [
          'vazia no toque de fevereiro (é a regra mais importante);',
          'falhou dois anos seguidos;',
          'velha, de 10 anos ou mais, com dente gasto, se emprenhou mal;',
          'problema de úbere, casco ou parto difícil que se repete;',
          'bezerro que sempre desmama leve, bem abaixo dos outros.',
        ],
      },
      { p: '**Manter:**' },
      {
        ul: [
          'prenhe no toque, mesmo que tenha sido comprada cara: vender prenhe joga fora o bezerro que já está a caminho;',
          'vaca que pare todo ano e desmama bezerro pesado, mesmo que não seja bonita.',
        ],
      },
      { p: '**Quando vender a vaca de descarte:** logo depois da desmama, de março a maio, quando ela ainda está gorda das águas. A vaca vazia que entra na seca perde peso e come o pasto que as prenhes vão precisar. Vaca gorda vende pela arroba no frigorífico; vaca magra vende por cabeça e vale menos. Antes de vender, compare o preço oferecido com a referência de Goiás que aparece na venda.' },
      { p: '**Não vender por aperto de caixa uma vaca boa e prenhe.** Se faltar dinheiro, venda primeiro as vazias, as velhas e os bezerros machos.' },
    ],
  },
  {
    id: 'macho',
    title: '5. Macho: vender ou deixar para procriar?',
    blocks: [
      {
        ul: [
          '**Bezerro macho é para vender na desmama.** Quem faz bezerro é a vaca. Macho que fica na fazenda come pasto e não gera bezerro.',
          '**Só um macho fica para cobrir: o touro.** Um touro dá conta de 25 a 30 vacas na estação. Ele precisa passar no exame andrológico todo ano, antes da estação.',
          '**Touro tem prazo:** depois de 3 a 4 anos na fazenda, as filhas dele entram na reprodução. Aí ele precisa ser trocado, para não cobrir as próprias filhas, o que dá bezerro mais fraco.',
          '**Boi é o macho castrado:** ele não procria. Boi só fica na fazenda se a ideia for engordar para vender, e isso não é o negócio desta fazenda.',
          '**Quando vale segurar os machos para recriar:** só se o boi gordo ficar caro em relação ao bezerro (um boi gordo comprando mais de 2,3 bezerros) e se houver pasto guardado para a seca. Hoje o boi compra uns 1,9 bezerro: é hora de vender desmamado.',
        ],
      },
    ],
  },
  {
    id: 'bezerras',
    title: '6. Quais bezerras ficam',
    blocks: [
      {
        ul: [
          '**As bezerras das vacas de leite (Gir, Girolando) não ficam:** todo filho delas é vendido. Elas são vacas de cruzamento.',
          '**As bezerras das Nelore boas ficam como reposição,** mas só as melhores: as mais pesadas na desmama, filhas de vacas que parem todo ano.',
          '**Por ano, separe uns 20% das vacas em novilhas de reposição.** Elas substituem as vacas descartadas.',
          '**A novilha entra na estação de monta com uns 24 meses e bom peso.** Se não emprenhar até os 3 anos, ela sai.',
        ],
      },
    ],
  },
  {
    id: 'nao-fazer',
    title: '7. O que não fazer',
    blocks: [
      {
        ul: [
          'Comprar vaca quando o preço está no alto, como agora.',
          'Comprar bezerro para recriar quando o bezerro está caro.',
          'Deixar o touro solto com as vacas o ano todo.',
          'Segurar bezerro desmamado esperando o preço subir.',
          'Vender ou transportar animal sem GTA, ou fêmea sem o atestado da vacina de brucelose.',
          'Medicar por conta própria: remédio e dose são com o veterinário.',
        ],
      },
    ],
  },
  {
    id: 'pasto',
    title: '8. O pasto que sobra',
    blocks: [
      { p: 'Enquanto o rebanho próprio é pequeno, o pasto que sobra pode receber gado de vizinho conhecido, em parceria ou aluguel, com contrato escrito, exame de brucelose e tuberculose, GTA e cerca conferida (ver no sistema: Gado de terceiros). O sistema avisa quando a lotação passa do que o pasto aguenta: acima de 1 UA por hectare sem adubação.' },
    ],
  },
]
