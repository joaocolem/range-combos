import type { ActionResult, RangeCell } from '../shared/types'
import { RANKS, normalizeHand } from './hands'

const RANK_INDEX: Record<string, number> = Object.fromEntries(
  RANKS.map((r, i) => [r.toUpperCase(), i])
)

/** Le um combo de 4 chars (ex.: "AdAh", "KhJh") e retorna o rotulo canonico (AA, AKs, AKo). */
function canonicalCombo(combo: string): string | null {
  const m = /^([2-9TJQKA])([shdc])([2-9TJQKA])([shdc])$/i.exec(combo.trim())
  if (!m) return null
  const r1 = m[1].toUpperCase()
  const s1 = m[2].toLowerCase()
  const r2 = m[3].toUpperCase()
  const s2 = m[4].toLowerCase()

  if (r1 === r2) {
    if (s1 === s2) return null // combo impossivel (mesma carta)
    return r1 + r2 // par
  }

  const [hi, lo] = RANK_INDEX[r1] < RANK_INDEX[r2] ? [r1, r2] : [r2, r1]
  return hi + lo + (s1 === s2 ? 's' : 'o')
}

/**
 * Le o JSON exportado pelo Hand2Note. Cada item ja vem por mao em "CellAbbreviation"
 * (AA, AKs, AKo, ...) e o numero de combos da mao em "HandCount".
 * Extracao por regex para tolerar JSON corrompido (ex.: "48.169815a") nos campos
 * que nao usamos. Assume que HandCount aparece depois de CellAbbreviation no objeto.
 */
function parseH2NJson(text: string, action: string): ActionResult {
  const re = /"CellAbbreviation"\s*:\s*"([^"]+)"[\s\S]*?"HandCount"\s*:\s*(\d+(?:\.\d+)?)/g
  const map = new Map<string, number>()

  for (const m of text.matchAll(re)) {
    const hand = normalizeHand(m[1].trim())
    const count = parseFloat(m[2])
    if (!hand || !Number.isFinite(count) || count <= 0) continue
    map.set(hand, (map.get(hand) ?? 0) + count)
  }

  const cells: RangeCell[] = [...map.entries()].map(([hand, value]) => ({ hand, value }))
  const total = cells.reduce((s, c) => s + c.value, 0)
  return { action, cells, total }
}

/** Soma de pesos por mao a partir de combos individuais (ex.: "AdAh: 0.7353, ..."). */
function parseComboText(text: string, action: string): ActionResult {
  const map = new Map<string, number>()

  for (const raw of text.split(/[,\n;]+/)) {
    const token = raw.trim()
    if (!token) continue

    const sep = token.search(/[:=\s]/)
    const comboPart = sep === -1 ? token : token.slice(0, sep)
    const weightPart = sep === -1 ? '' : token.slice(sep + 1).trim()

    const hand = canonicalCombo(comboPart)
    if (!hand) continue

    let weight = 1
    if (weightPart) {
      const w = parseFloat(weightPart.replace(',', '.').replace('%', ''))
      if (!Number.isFinite(w) || w <= 0) continue
      weight = w > 1 ? w / 100 : w
    }

    map.set(hand, (map.get(hand) ?? 0) + weight)
  }

  const cells: RangeCell[] = [...map.entries()].map(([hand, value]) => ({ hand, value }))
  const total = cells.reduce((s, c) => s + c.value, 0)
  return { action, cells, total }
}

/**
 * Converte o range colado numa matriz por mao. Detecta automaticamente o formato:
 * JSON do Hand2Note (usa HandCount = combos da mao) ou texto "combo: peso".
 */
export function parseRange(text: string, action: string): ActionResult {
  if (/"CellAbbreviation"/.test(text)) return parseH2NJson(text, action)
  return parseComboText(text, action)
}
