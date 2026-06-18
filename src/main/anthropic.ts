import Anthropic from '@anthropic-ai/sdk'
import type { ActionResult, RangeCell } from '../shared/types'

const MODEL = 'claude-opus-4-8'

const PROMPT = `Voce esta lendo uma tabela de range de poker a partir de um print de um solver/HUD.
A tabela e uma matriz 13x13 de maos iniciais:
- pares (AA, KK, ..., 22) ficam na diagonal;
- maos suited (ex.: AKs) no triangulo superior-direito;
- maos offsuit (ex.: AKo) no triangulo inferior-esquerdo.
Cada celula mostra um rotulo de mao e um numero (o valor de combos/peso como exibido).
Os numeros podem usar sufixo "k" para milhares (1.1k = 1100) ou "m" para milhoes.

Leia TODAS as celulas visiveis. Para cada celula retorne:
- "hand": o rotulo canonico da mao (AA, AKs, AKo, 72o, etc., carta mais alta primeiro);
- "value": o numero exibido com o sufixo ja expandido para um inteiro simples.
Se uma celula nao tiver numero ou estiver ilegivel, use value 0.
Nao invente celulas que nao aparecem. Responda apenas com os dados estruturados.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cells: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          hand: { type: 'string' },
          value: { type: 'number' }
        },
        required: ['hand', 'value']
      }
    }
  },
  required: ['cells']
}

function parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl)
  if (!match) throw new Error('Imagem invalida (esperado data URL base64).')
  return { mediaType: match[1], data: match[2] }
}

function extractJson(content: Anthropic.Messages.ContentBlock[]): string {
  for (const block of content) {
    if (block.type === 'text') return block.text
  }
  return ''
}

/** Le uma imagem de range e retorna as celulas + total para uma acao. */
export async function identifyImage(
  apiKey: string,
  dataUrl: string,
  action: string
): Promise<ActionResult> {
  const client = new Anthropic({ apiKey })
  const { mediaType, data } = parseDataUrl(dataUrl)

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    // output_config ainda nao esta nos tipos publicos do SDK em todas as versoes.
    output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as 'image/png', data }
          },
          { type: 'text', text: PROMPT }
        ]
      }
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  if (res.stop_reason === 'refusal') {
    throw new Error('O modelo recusou a solicitacao para esta imagem.')
  }

  const text = extractJson(res.content)
  let parsed: { cells?: RangeCell[] }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Nao foi possivel interpretar a resposta do modelo.')
  }

  const cells: RangeCell[] = (parsed.cells ?? [])
    .filter((c) => c && typeof c.hand === 'string' && Number.isFinite(c.value))
    .map((c) => ({ hand: c.hand.trim(), value: Number(c.value) }))

  const total = cells.reduce((sum, c) => sum + c.value, 0)
  return { action, cells, total }
}

/** Testa se a chave funciona com uma chamada barata. */
export async function testKey(apiKey: string): Promise<void> {
  const client = new Anthropic({ apiKey })
  await client.messages.countTokens({
    model: MODEL,
    messages: [{ role: 'user', content: 'ping' }]
  })
}
