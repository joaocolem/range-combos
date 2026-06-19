import type { ActionResult, RangeCell } from '../shared/types'
import { handCombos, normalizeHand } from './hands'
import { hrcOrder } from './merge'

/**
 * Infere o range de fold a partir de uma unica frequencia global de fold.
 *
 * Ideia: antes da acao, cada mao e recebida proporcionalmente aos seus combos
 * reais (par 6, suited 4, offsuit 12). O "peso cheio" de uma mao = combos * u,
 * onde u (escala por combo) e desconhecido. As maos jogadas (Raise/Call/...)
 * mostram quanto da mao NAO foldou (obs). O fold de cada mao e o que falta para
 * o peso cheio: fold = max(0, u*combos - obs). Maos fortes ja chegam ao peso
 * cheio (fold ~ 0); maos fracas absorvem o fold. Calibramos u por bisseccao
 * ate que fold_total / (jogado_total + fold_total) seja igual a % informada.
 */
export function computeFoldResult(played: ActionResult[], foldFraction: number): ActionResult {
  const target = Math.max(0, Math.min(0.999, foldFraction))
  const hands = hrcOrder() // 169 maos canonicas

  const obs = new Map<string, number>()
  for (const r of played) {
    for (const c of r.cells) {
      const h = normalizeHand(c.hand)
      obs.set(h, (obs.get(h) ?? 0) + c.value)
    }
  }

  const combos: Record<string, number> = {}
  for (const h of hands) combos[h] = handCombos(h)

  const foldOf = (u: number, h: string): number => Math.max(0, u * combos[h] - (obs.get(h) ?? 0))

  const impliedFold = (u: number): number => {
    let fold = 0
    let total = 0
    for (const h of hands) {
      const f = foldOf(u, h)
      fold += f
      total += Math.max(obs.get(h) ?? 0, u * combos[h]) // jogado + fold da mao
    }
    return total > 0 ? fold / total : 0
  }

  // Bisseccao em u (impliedFold e monotonica crescente de 0 a 1).
  let lo = 0
  let hi = 1
  while (impliedFold(hi) < target && hi < 1e15) hi *= 2
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (impliedFold(mid) < target) lo = mid
    else hi = mid
  }
  const u = (lo + hi) / 2

  const cells: RangeCell[] = []
  for (const h of hands) {
    const v = foldOf(u, h)
    if (v > 0) cells.push({ hand: h, value: v })
  }
  const total = cells.reduce((s, c) => s + c.value, 0)
  return { action: 'Fold', cells, total }
}
