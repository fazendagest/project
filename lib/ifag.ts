import { unstable_cache } from 'next/cache'
import { normalize, type IfagPrice, type IfagPrices } from '@/lib/market-reference'

// Cotações agropecuárias de Goiás do IFAG (Sistema Faeg), painel público em Power BI
// (link "Cotações" em ifag.org.br). Lemos a mesma consulta que o painel faz.
// Não é uma API oficial: se o IFAG mudar o painel, a leitura falha e as telas
// simplesmente não mostram o preço sugerido (o fazendeiro continua digitando o dele).

const RESOURCE_KEY = 'dc910544-6f95-4fe9-a6c1-f12ab486e7f6'
const QUERY_URL = 'https://wabi-brazil-south-b-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true'
const DATASET_ID = '28a4350f-c1c7-4802-9c71-505f9490af79'
const REPORT_ID = 'ea91c5d4-e70a-4ccc-9a5c-235676c316d6'
const MODEL_ID = 1894310

const MEASURES = ['Cotação Média', 'valor_min', 'valor_max', 'LegaendaCotacao']

/** Só o que interessa à fazenda: gado por cabeça, porco, boi, novilha e vaca gorda, milho. */
function wanted(name: string) {
  const n = normalize(name)
  return /^(nelore|mestico) (femea|macho) \(/.test(n) || n === 'suino' || n.startsWith('boi gordo - ') || n.startsWith('vaca gorda - ') || n.startsWith('novilha gorda - ') || n === 'milho'
}

function buildQuery() {
  return {
    version: '1.0.0',
    queries: [{
      Query: {
        Commands: [{
          SemanticQueryDataShapeCommand: {
            Query: {
              Version: 2,
              From: [{ Name: 'c', Entity: 'dCultura', Type: 0 }, { Name: 'm', Entity: 'Medidas', Type: 0 }],
              Select: [
                { Column: { Expression: { SourceRef: { Source: 'c' } }, Property: 'nome' }, Name: 'nome' },
                ...MEASURES.map(p => ({ Measure: { Expression: { SourceRef: { Source: 'm' } }, Property: p }, Name: p })),
              ],
            },
            Binding: {
              Primary: { Groupings: [{ Projections: [0, 1, 2, 3, 4] }] },
              DataReduction: { DataVolume: 4, Primary: { Top: { Count: 3000 } } },
              Version: 1,
            },
          },
        }],
      },
      ApplicationContext: { DatasetId: DATASET_ID, Sources: [{ ReportId: REPORT_ID }] },
    }],
    cancelQueries: [],
    modelId: MODEL_ID,
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Desfaz a compressão do Power BI: bit R = repete o valor da linha anterior, bit Ø = vazio. */
function decode(json: any): IfagPrice[] {
  const ds = json?.results?.[0]?.result?.data?.dsr?.DS?.[0]
  const rows: any[] = ds?.PH?.[0]?.DM0 ?? []
  const dicts: Record<string, string[]> = ds?.ValueDicts ?? {}
  const cols = 1 + MEASURES.length
  let prev: any[] = new Array(cols).fill(null)
  const out: IfagPrice[] = []
  for (const row of rows) {
    const c = [...(row.C ?? [])]
    const rep: number = row.R ?? 0
    const nul: number = row['Ø'] ?? 0
    const vals: any[] = []
    for (let i = 0; i < cols; i++) {
      if (rep & (1 << i)) vals.push(prev[i])
      else if (nul & (1 << i)) vals.push(null)
      else vals.push(c.length ? c.shift() : null)
    }
    prev = vals
    const name = typeof vals[0] === 'number' ? dicts.D0?.[vals[0]] : vals[0]
    if (typeof name !== 'string' || !wanted(name)) continue
    const legend = typeof vals[4] === 'number' ? dicts.D1?.[vals[4]] ?? '' : String(vals[4] ?? '')
    const m = legend.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    const avg = Number(vals[1]), min = Number(vals[2]), max = Number(vals[3])
    if (!m || !Number.isFinite(avg) || avg <= 0) continue
    out.push({
      product: name,
      avg,
      min: Number.isFinite(min) && min > 0 ? min : avg,
      max: Number.isFinite(max) && max > 0 ? max : avg,
      quotedAt: `${m[3]}-${m[2]}-${m[1]}`,
    })
  }
  return out
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchIfag(): Promise<IfagPrices> {
  const res = await fetch(QUERY_URL, {
    method: 'POST',
    headers: { 'X-PowerBI-ResourceKey': RESOURCE_KEY, 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(buildQuery()),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`IFAG respondeu ${res.status}`)
  const prices = decode(await res.json())
  // Lança erro para não guardar uma resposta vazia no cache.
  if (prices.length < 5) throw new Error('IFAG: resposta sem cotações')
  return { prices, fetchedAt: new Date().toISOString() }
}

// Confere o painel uma vez por dia (o IFAG publica o gado toda semana; assim a cotação
// nova aparece no máximo um dia depois). Sem custo: é uma chamada guardada em cache.
const cachedIfag = unstable_cache(fetchIfag, ['ifag-cotacoes-v2'], { revalidate: 86_400, tags: ['ifag'] })

/** Cotações do IFAG ou null se o painel não respondeu. Nunca quebra a tela. */
export async function getIfagPrices(): Promise<IfagPrices | null> {
  try {
    return await cachedIfag()
  } catch (e) {
    console.error('[ifag] falha ao ler cotações:', e)
    return null
  }
}
