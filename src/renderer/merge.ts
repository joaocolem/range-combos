import type { ActionResult } from '../shared/types'
import { RANKS, normalizeHand } from './hands'

export interface MergeSegment {
  action: string
  fraction: number // combos da acao / total da mao (0..1)
  index: number // posicao da acao (para cor)
}

export interface MergedCell {
  hand: string
  total: number
  segments: MergeSegment[]
}

/** Ordem canonica de maos para exportacao HRC:
 *  pares (AA..22), depois por carta alta: suited (AKs..A2s) e offsuit (AKo..A2o). */
export function hrcOrder(): string[] {
  const order: string[] = []
  for (let i = 0; i < RANKS.length; i++) order.push(RANKS[i] + RANKS[i])
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = i + 1; j < RANKS.length; j++) order.push(RANKS[i] + RANKS[j] + 's')
    for (let j = i + 1; j < RANKS.length; j++) order.push(RANKS[i] + RANKS[j] + 'o')
  }
  return order
}

function valueMap(r: ActionResult): Map<string, number> {
  const m = new Map<string, number>()
  for (const c of r.cells) m.set(normalizeHand(c.hand), c.value)
  return m
}

function totalsMap(maps: Map<string, number>[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const m of maps) for (const [h, v] of m) totals.set(h, (totals.get(h) ?? 0) + v)
  return totals
}

/** Mescla as acoes por mao: cada celula recebe segmentos proporcionais aos combos. */
export function computeMerge(results: ActionResult[]): Map<string, MergedCell> {
  const maps = results.map(valueMap)
  const totals = totalsMap(maps)
  const out = new Map<string, MergedCell>()

  for (const [hand, total] of totals) {
    if (total <= 0) continue
    const segments: MergeSegment[] = []
    results.forEach((r, idx) => {
      const v = maps[idx].get(hand) ?? 0
      if (v > 0) segments.push({ action: r.action, fraction: v / total, index: idx })
    })
    out.set(hand, { hand, total, segments })
  }
  return out
}

/** String no formato HRC para uma acao: "MAO:fracao, ...".
 *  fracao = combos da acao / total da mao (as mesmas % da mescla). */
export function hrcString(results: ActionResult[], action: string): string {
  const target = results.find((r) => r.action === action)
  if (!target) return ''
  const maps = results.map(valueMap)
  const totals = totalsMap(maps)
  const targetMap = valueMap(target)

  const parts: string[] = []
  for (const hand of hrcOrder()) {
    const total = totals.get(hand) ?? 0
    if (total <= 0) continue
    const frac = (targetMap.get(hand) ?? 0) / total
    const rounded = Math.round(frac * 1000) / 1000
    if (rounded <= 0) continue
    parts.push(`${hand}:${rounded.toFixed(3)}`)
  }
  return parts.join(', ')
}
