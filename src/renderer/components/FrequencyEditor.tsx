import { useState } from 'react'
import type { Frequency } from '../App'
import { hrcString } from '../merge'
import { ImagePasteSlot } from './ImagePasteSlot'
import { RangeGridPreview } from './RangeGridPreview'
import { MergedGridPreview } from './MergedGridPreview'

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
  const [showMerged, setShowMerged] = useState(false)
  const hasAnyImage = frequency.slots.some((s) => s.dataUrl)
  const results = frequency.results

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

      {results && results.length > 0 && (
        <div className="freq-results-wrap">
          <div className="freq-tools">
            <button className="btn btn-primary btn-sm" onClick={() => setShowMerged((s) => !s)}>
              {showMerged ? 'Ocultar range mesclado' : 'Calcular range mesclado'}
            </button>
          </div>

          {showMerged && <MergedGridPreview results={results} />}

          <div className="freq-results">
            {results.map((res) => (
              <RangeGridPreview
                key={res.action}
                result={res}
                hrc={hrcString(results, res.action)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
