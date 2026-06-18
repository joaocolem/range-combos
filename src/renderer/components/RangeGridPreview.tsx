import { useState } from 'react'
import type { ActionResult } from '../../shared/types'
import { RANKS, buildValueMap, formatCompact, handAt, normalizeHand } from '../hands'
import { actionRgb } from '../colors'

interface Props {
  result: ActionResult
  hrc: string
}

export function RangeGridPreview({ result, hrc }: Props): JSX.Element {
  const map = buildValueMap(result.cells)
  const max = Math.max(1, ...result.cells.map((c) => c.value))
  const [r, g, b] = actionRgb(result.action)
  const [copied, setCopied] = useState(false)

  const copyHrc = async (): Promise<void> => {
    if (!hrc) return
    await window.api.clipboardWrite(hrc)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="grid-block">
      <div className="grid-block-head">
        <span className="grid-action">{result.action}</span>
        <div className="grid-head-right">
          <span className="grid-total">
            Combos: <strong>{Math.round(result.total).toLocaleString('pt-BR')}</strong>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={copyHrc} disabled={!hrc}>
            {copied ? 'Copiado!' : 'Copiar HRC'}
          </button>
        </div>
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
