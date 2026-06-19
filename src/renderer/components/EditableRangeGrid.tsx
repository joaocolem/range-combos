import { useState } from 'react'
import type { ActionResult } from '../../shared/types'
import { RANKS, buildValueMap, formatCompact, handAt, normalizeHand } from '../hands'
import { actionRgb } from '../colors'

interface Props {
  result: ActionResult
  onChange: (hand: string, value: number) => void
}

export function EditableRangeGrid({ result, onChange }: Props): JSX.Element {
  const map = buildValueMap(result.cells)
  const max = Math.max(1, ...result.cells.map((c) => c.value))
  const [r, g, b] = actionRgb(result.action)

  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const startEdit = (hand: string, current: number): void => {
    setEditing(hand)
    setDraft(current ? String(Math.round(current)) : '')
  }

  const commit = (): void => {
    if (editing) {
      const v = parseFloat(draft.replace(',', '.'))
      onChange(editing, isNaN(v) ? 0 : Math.max(0, v))
    }
    setEditing(null)
  }

  return (
    <div className="grid-block">
      <div className="grid-block-head">
        <span className="grid-action">{result.action}</span>
        <span className="grid-total">
          Combos: <strong>{Math.round(result.total).toLocaleString('pt-BR')}</strong>
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
            const isEditing = editing === hand
            return (
              <div
                key={hand}
                className={`cell cell-editable ${value > 0 ? 'cell-on' : 'cell-off'}`}
                style={{ backgroundColor: isEditing ? 'var(--bg)' : bg }}
                onDoubleClick={() => startEdit(hand, value)}
                title={`${hand}: ${value.toLocaleString('pt-BR')} — clique 2x para editar`}
              >
                <span className="cell-hand">{hand}</span>
                {isEditing ? (
                  <input
                    className="cell-input"
                    autoFocus
                    inputMode="numeric"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commit()
                      if (e.key === 'Escape') setEditing(null)
                    }}
                  />
                ) : (
                  <span className="cell-val">{formatCompact(value)}</span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
