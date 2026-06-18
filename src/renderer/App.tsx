import { useCallback, useEffect, useState } from 'react'
import type { ActionResult, UpdateStatus } from '../shared/types'
import { FrequencyEditor } from './components/FrequencyEditor'
import { SettingsModal } from './components/Settings'

export interface Slot {
  action: string
  dataUrl: string | null
}

export interface Frequency {
  id: string
  slots: Slot[]
  results: ActionResult[] | null
  loading: boolean
  error: string | null
}

const DEFAULT_ACTIONS = ['Raise', 'Call']

let counter = 0
function newFrequency(): Frequency {
  counter += 1
  return {
    id: `freq-${counter}-${Date.now()}`,
    slots: DEFAULT_ACTIONS.map((a) => ({ action: a, dataUrl: null })),
    results: null,
    loading: false,
    error: null
  }
}

function updateBannerText(s: UpdateStatus): string | null {
  switch (s.state) {
    case 'available':
      return `Atualizacao ${s.version ?? ''} disponivel. Baixando...`
    case 'downloading':
      return `Baixando atualizacao... ${s.percent ?? 0}%`
    case 'downloaded':
      return `Atualizacao ${s.version ?? ''} pronta. Reinicie o app para aplicar.`
    case 'error':
      return null
    default:
      return null
  }
}

export function App(): JSX.Element {
  const [frequencies, setFrequencies] = useState<Frequency[]>([newFrequency()])
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [updateBanner, setUpdateBanner] = useState<string | null>(null)

  const refreshKey = useCallback(async () => {
    setHasKey(await window.api.hasApiKey())
  }, [])

  useEffect(() => {
    refreshKey()
    const off = window.api.onUpdateStatus((s) => setUpdateBanner(updateBannerText(s)))
    return off
  }, [refreshKey])

  const patchFrequency = useCallback((id: string, patch: Partial<Frequency>) => {
    setFrequencies((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  const setSlotImage = useCallback((id: string, index: number, dataUrl: string | null) => {
    setFrequencies((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f
        const slots = f.slots.map((s, i) => (i === index ? { ...s, dataUrl } : s))
        return { ...f, slots, results: null, error: null }
      })
    )
  }, [])

  const addFrequency = useCallback(() => {
    setFrequencies((prev) => [...prev, newFrequency()])
  }, [])

  const removeFrequency = useCallback((id: string) => {
    setFrequencies((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))
  }, [])

  const identify = useCallback(
    async (id: string) => {
      if (!(await window.api.hasApiKey())) {
        setSettingsOpen(true)
        return
      }
      const freq = frequencies.find((f) => f.id === id)
      if (!freq) return
      const images = freq.slots
        .filter((s) => s.dataUrl)
        .map((s) => ({ action: s.action, dataUrl: s.dataUrl as string }))
      if (!images.length) {
        patchFrequency(id, { error: 'Cole pelo menos uma imagem antes de confirmar.' })
        return
      }

      patchFrequency(id, { loading: true, error: null, results: null })
      const resp = await window.api.identify(images)
      if (resp.ok) {
        patchFrequency(id, { loading: false, results: resp.results })
      } else {
        patchFrequency(id, { loading: false, error: resp.error })
      }
    },
    [frequencies, patchFrequency]
  )

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">♠</span>
          <span className="brand-name">Range Combos</span>
        </div>
        <div className="topbar-right">
          {hasKey === false && <span className="badge badge-warn">Sem chave de API</span>}
          <button className="btn btn-ghost" onClick={() => setSettingsOpen(true)}>
            Configuracoes
          </button>
        </div>
      </header>

      {updateBanner && <div className="update-banner">{updateBanner}</div>}

      <main className="content">
        <div className="intro">
          <h1>Identificar ranges</h1>
          <p>
            Tire um print da tabela (Raise/Call) e cole com <kbd>Ctrl</kbd>+<kbd>V</kbd> em cada
            campo. Clique em <strong>OK</strong> para identificar o range e os combos.
          </p>
        </div>

        {frequencies.map((freq, i) => (
          <FrequencyEditor
            key={freq.id}
            index={i + 1}
            frequency={freq}
            onSetImage={(idx, url) => setSlotImage(freq.id, idx, url)}
            onConfirm={() => identify(freq.id)}
            onRemove={frequencies.length > 1 ? () => removeFrequency(freq.id) : undefined}
          />
        ))}

        <button className="btn btn-add" onClick={addFrequency}>
          + Adicionar frequencia
        </button>
      </main>

      {settingsOpen && (
        <SettingsModal
          onClose={() => {
            setSettingsOpen(false)
            refreshKey()
          }}
        />
      )}
    </div>
  )
}
