import type { ActionResult } from '../../shared/types'
import { RANKS, handAt, normalizeHand } from '../hands'
import { actionRgb, rgbCss } from '../colors'
import { computeMerge, type MergedCell } from '../merge'

interface Props {
  results: ActionResult[]
}

function cellBackground(cell: MergedCell): string {
  let acc = 0
  const stops: string[] = []
  for (const seg of cell.segments) {
    const c = rgbCss(actionRgb(seg.action, seg.index))
    stops.push(`${c} ${(acc * 100).toFixed(2)}%`)
    acc += seg.fraction
    stops.push(`${c} ${(acc * 100).toFixed(2)}%`)
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

function cellTitle(hand: string, cell?: MergedCell): string {
  if (!cell) return hand
  const parts = cell.segments.map((s) => `${s.action} ${Math.round(s.fraction * 100)}%`)
  return `${hand} — ${parts.join(', ')}`
}

export function MergedGridPreview({ results }: Props): JSX.Element {
  const merged = computeMerge(results)

  return (
    <div className="grid-block">
      <div className="grid-block-head">
        <span className="grid-action">Range mesclado</span>
        <div className="legend">
          {results.map((r, i) => (
            <span key={r.action} className="legend-item">
              <span className="legend-swatch" style={{ background: rgbCss(actionRgb(r.action, i)) }} />
              {r.action}
            </span>
          ))}
        </div>
      </div>

      <div className="grid13">
        {RANKS.map((_, row) =>
          RANKS.map((__, col) => {
            const hand = handAt(row, col)
            const cell = merged.get(normalizeHand(hand))
            const on = !!cell && cell.segments.length > 0
            return (
              <div
                key={hand}
                className={`cell ${on ? 'cell-on cell-merged' : 'cell-off'}`}
                style={on ? { background: cellBackground(cell!) } : undefined}
                title={cellTitle(hand, cell)}
              >
                <span className="cell-hand">{hand}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
