import { useCallback, useState } from 'react'

interface Props {
  action: string
  dataUrl: string | null
  onImage: (dataUrl: string | null) => void
}

function actionClass(action: string): string {
  const a = action.toLowerCase()
  if (a === 'raise') return 'slot-raise'
  if (a === 'call') return 'slot-call'
  return 'slot-neutral'
}

export function ImagePasteSlot({ action, dataUrl, onImage }: Props): JSX.Element {
  const [hover, setHover] = useState(false)

  const readFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => onImage(typeof reader.result === 'string' ? reader.result : null)
      reader.readAsDataURL(file)
    },
    [onImage]
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const it of Array.from(items)) {
        if (it.type.startsWith('image/')) {
          const file = it.getAsFile()
          if (file) {
            e.preventDefault()
            readFile(file)
            return
          }
        }
      }
    },
    [readFile]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setHover(false)
      const file = e.dataTransfer?.files?.[0]
      if (file && file.type.startsWith('image/')) readFile(file)
    },
    [readFile]
  )

  return (
    <div className={`slot ${actionClass(action)}`}>
      <div className="slot-header">
        <span className="slot-label">{action}</span>
        {dataUrl && (
          <button className="slot-clear" onClick={() => onImage(null)} title="Remover imagem">
            ✕
          </button>
        )}
      </div>

      <div
        className={`slot-drop ${hover ? 'is-hover' : ''} ${dataUrl ? 'has-image' : ''}`}
        tabIndex={0}
        onPaste={onPaste}
        onDragOver={(e) => {
          e.preventDefault()
          setHover(true)
        }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
      >
        {dataUrl ? (
          <img className="slot-thumb" src={dataUrl} alt={`Print de ${action}`} />
        ) : (
          <div className="slot-empty">
            <div className="slot-empty-icon">⌘V / Ctrl+V</div>
            <div className="slot-empty-text">
              Clique aqui e cole o print, ou arraste a imagem
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
