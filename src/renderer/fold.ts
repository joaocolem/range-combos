import type { ActionResult, RangeCell } from '../shared/types'
import { normalizeHand } from './hands'
import { hrcOrder } from './merge'

type Cat = 'pair' | 'suited' | 'offsuit'

function category(h: string): Cat {
  if (h.length === 2) return 'pair'
  return h.endsWith('s') ? 'suited' : 'offsuit'
}

// Maos de referencia: o maximo de combos que NAO foldam em cada categoria.
const ANCHORS = ['AA', 'KK', 'AKs', 'AKo'].map(normalizeHand)

export interface FoldResult extends ActionResult {
  foldFraction: number // fold efetivo resultante (0..1)
}

/**
 * Infere o range de fold ancorando o "peso cheio" por categoria:
 *  - pares:   AA / KK  (o maior nao folda)
 *  - suited:  AKs
 *  - offsuit: AKo
 * Cada mao folda a diferenca ate o cheio da sua categoria (fold = cheio - jogado),
 * preservando o play minimo da mao. As maos ancora nunca foldam. Se o usuario
 * informar uma % de fold, uma escala global e calibrada por bisseccao para bater
 * essa %; senao, usa-se o cheio ancorado direto (escala = 1).
 */
export function computeFoldResult(played: ActionResult[], target: number | null): FoldResult {
  const hands = hrcOrder()

  const obs = new Map<string, number>()
  for (const r of played) {
    for (const c of r.cells) {
      const h = normalizeHand(c.hand)
      obs.set(h, (obs.get(h) ?? 0) + c.value)
    }
  }
  const get = (h: string): number => obs.get(h) ?? 0

  // Maximo observado por categoria (fallback caso uma ancora nao apareca).
  const catMax: Record<Cat, number> = { pair: 0, suited: 0, offsuit: 0 }
  for (const h of hands) {
    const c = category(h)
    catMax[c] = Math.max(catMax[c], get(h))
  }
  const catFull: Record<Cat, number> = {
    pair: Math.max(get('AA'), get('KK')) || catMax.pair,
    suited: get('AKs') || catMax.suited,
    offsuit: get('AKo') || catMax.offsuit
  }

  const anchors = new Set(ANCHORS)
  const foldAt = (k: number, h: string): number => {
    if (anchors.has(h)) return 0
    return Math.max(0, k * catFull[category(h)] - get(h))
  }

  const impliedFold = (k: number): number => {
    let fold = 0
    let total = 0
    for (const h of hands) {
      const f = foldAt(k, h)
      fold += f
      total += get(h) + f
    }
    return total > 0 ? fold / total : 0
  }

  // Escala k: 1 (cheio ancorado) ou calibrada para a % informada.
  let k = 1
  if (target != null && target > 0) {
    const t = Math.min(0.999, target)
    let lo = 0
    let hi = 1
    while (impliedFold(hi) < t && hi < 1e6) hi *= 2
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2
      if (impliedFold(mid) < t) lo = mid
      else hi = mid
    }
    k = (lo + hi) / 2
  }

  const cells: RangeCell[] = []
  for (const h of hands) {
    const v = foldAt(k, h)
    if (v > 0) cells.push({ hand: h, value: v })
  }
  const total = cells.reduce((s, c) => s + c.value, 0)
  return { action: 'Fold', cells, total, foldFraction: impliedFold(k) }
}
