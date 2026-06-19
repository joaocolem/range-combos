import type { RangeCell } from '../shared/types'

export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const

/** Rotulo canonico da mao na posicao (linha, coluna) da matriz 13x13. */
export function handAt(row: number, col: number): string {
  if (row === col) return RANKS[row] + RANKS[row]
  if (col > row) return RANKS[row] + RANKS[col] + 's' // suited, carta mais alta primeiro
  return RANKS[col] + RANKS[row] + 'o' // offsuit
}

/** Normaliza um rotulo de mao para comparacao (maiusculo, sufixo minusculo). */
export function normalizeHand(hand: string): string {
  const h = hand.trim()
  if (h.length < 2) return h.toUpperCase()
  const body = h.slice(0, 2).toUpperCase()
  const suffix = h.slice(2).toLowerCase()
  return body + suffix
}

/** Combos reais de uma mao no baralho: par = 6, suited = 4, offsuit = 12. */
export function handCombos(hand: string): number {
  const h = normalizeHand(hand)
  if (h.length === 2) return 6 // par (AA, KK, ...)
  if (h.endsWith('s')) return 4 // suited
  return 12 // offsuit
}

/** Constroi um mapa mao -> valor a partir das celulas identificadas. */
export function buildValueMap(cells: RangeCell[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const c of cells) map.set(normalizeHand(c.hand), c.value)
  return map
}

/** Formata um numero como o solver (1100 -> "1.1k", 1234000 -> "1.2m"). */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ''
  if (value >= 1_000_000) return trim(value / 1_000_000) + 'm'
  if (value >= 1_000) return trim(value / 1_000) + 'k'
  return String(Math.round(value))
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '')
}
