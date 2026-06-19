import type { ActionResult } from '../../shared/types'
import { EditableRangeGrid } from './EditableRangeGrid'

interface Props {
  name: string
  text: string
  result: ActionResult | null
  onName: (name: string) => void
  onText: (text: string) => void
  onCell: (hand: string, value: number) => void
  onRemove?: () => void
}

function TrashIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2m-9 0v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6M10 11v6M14 11v6" />
    </svg>
  )
}

export function RangeActionCard({
  name,
  text,
  result,
  onName,
  onText,
  onCell,
  onRemove
}: Props): JSX.Element {
  const hasCells = !!result && result.cells.length > 0

  return (
    <section className="freq-card">
      <div className="freq-head">
        <input
          className="action-name-input"
          value={name}
          placeholder="Nome da frequencia (ex.: Raise, Call, 3bet all in)"
          onChange={(e) => onName(e.target.value)}
        />
        {onRemove && (
          <button className="btn btn-ghost btn-sm" onClick={onRemove}>
            Remover
          </button>
        )}
      </div>

      {hasCells ? (
        <>
          <EditableRangeGrid result={result} onChange={onCell} />
          <div className="range-clear">
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => onText('')}
              title="Limpar e colar outro range"
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            className="range-input"
            value={text}
            spellCheck={false}
            placeholder='Cole o JSON do Hand2Note aqui (ex.: [{"CellAbbreviation":"AA","HandCount":50}, ...])'
            onChange={(e) => onText(e.target.value)}
          />
          {text.trim() && (
            <p className="freq-error">Nenhuma mao valida reconhecida nesse JSON.</p>
          )}
        </>
      )}
    </section>
  )
}
