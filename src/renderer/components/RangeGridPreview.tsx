import type { ActionResult } from '../../shared/types'
import { RANKS, buildValueMap, formatCompact, handAt, normalizeHand } from '../hands'

interface Props {
  result: ActionResult
}

function accentRgb(action: string): [number, number, number] {
  const a = action.toLowerCase()
  if (a === 'raise') return [216, 78, 58]
  if (a === 'call') return [56, 120, 198]
  return [70, 160, 110]
}

export function RangeGridPreview({ result }: Props): JSX.Element {
  const map = buildValueMap(result.cells)
  const max = Math.max(1, ...result.cells.map((c) => c.value))
  const [r, g, b] = accentRgb(result.action)

  return (
    <div className="grid-block">
      <div className="grid-block-head">
        <span className="grid-action">{result.action}</span>
        <span className="grid-total">
          Total de combos: <strong>{Math.round(result.total).toLocaleString('pt-BR')}</strong>
        </span>
      </div>

      <div className="grid13">
        {RANKS.map((_, row) =>
          RANKS.map((__, col) => {
            const hand = handAt(row, col)
            const value = map.get(normalizeHand(hand)) ?? 0
            const ratio = value > 0 ? Math.min(1, value / max) : 0
            const alpha = value > 0 ? 0.14 + ratio * 0.78 : 0
            const bg = value > 0 ? `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})` : 'transparent'
            return (
              <div
                key={hand}
                className={`cell ${value > 0 ? 'cell-on' : 'cell-off'}`}
                style={{ backgroundColor: bg }}
                title={`${hand}: ${value.toLocaleString('pt-BR')}`}
              >
                <span className="cell-hand">{hand}</span>
                <span className="cell-val">{formatCompact(value)}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
