import { ImagePasteSlot } from './ImagePasteSlot'

interface Props {
  name: string
  dataUrl: string | null
  onName: (name: string) => void
  onImage: (dataUrl: string | null) => void
  onRemove?: () => void
}

export function ImageActionCard({ name, dataUrl, onName, onImage, onRemove }: Props): JSX.Element {
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
      <ImagePasteSlot action={name.trim() || 'Frequencia'} dataUrl={dataUrl} onImage={onImage} />
    </section>
  )
}
