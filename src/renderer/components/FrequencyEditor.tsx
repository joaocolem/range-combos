import type { Frequency } from '../App'
import { ImagePasteSlot } from './ImagePasteSlot'
import { RangeGridPreview } from './RangeGridPreview'

interface Props {
  index: number
  frequency: Frequency
  onSetImage: (slotIndex: number, dataUrl: string | null) => void
  onConfirm: () => void
  onRemove?: () => void
}

export function FrequencyEditor({
  index,
  frequency,
  onSetImage,
  onConfirm,
  onRemove
}: Props): JSX.Element {
  const hasAnyImage = frequency.slots.some((s) => s.dataUrl)

  return (
    <section className="freq-card">
      <div className="freq-head">
        <h2 className="freq-title">Frequencia {index}</h2>
        {onRemove && (
          <button className="btn btn-ghost btn-sm" onClick={onRemove}>
            Remover
          </button>
        )}
      </div>

      <div className="slots">
        {frequency.slots.map((slot, i) => (
          <ImagePasteSlot
            key={slot.action}
            action={slot.action}
            dataUrl={slot.dataUrl}
            onImage={(url) => onSetImage(i, url)}
          />
        ))}
      </div>

      <div className="freq-actions">
        <button
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={frequency.loading || !hasAnyImage}
        >
          {frequency.loading ? 'Identificando...' : 'OK'}
        </button>
        {frequency.error && <span className="freq-error">{frequency.error}</span>}
      </div>

      {frequency.results && frequency.results.length > 0 && (
        <div className="freq-results">
          {frequency.results.map((res) => (
            <RangeGridPreview key={res.action} result={res} />
          ))}
        </div>
      )}
    </section>
  )
}
