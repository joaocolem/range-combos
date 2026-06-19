import { useCallback, useEffect, useState } from 'react'
import type { ActionResult, UpdateStatus } from '../shared/types'
import { hrcString } from './merge'
import { computeFoldResult } from './fold'
import { ImageActionCard } from './components/ImageActionCard'
import { FoldActionCard } from './components/FoldActionCard'
import { RangeGridPreview } from './components/RangeGridPreview'
import { MergedGridPreview } from './components/MergedGridPreview'
import { SettingsModal } from './components/Settings'

interface ImageAction {
  id: string
  kind: 'image'
  name: string
  dataUrl: string | null
}

interface FoldActionItem {
  id: string
  kind: 'fold'
  percentText: string
}

type ActionItem = ImageAction | FoldActionItem

let counter = 0
function imageAction(name = ''): ImageAction {
  counter += 1
  return { id: `a${counter}-${Date.now()}`, kind: 'image', name, dataUrl: null }
}
function foldAction(): FoldActionItem {
  counter += 1
  return { id: `f${counter}-${Date.now()}`, kind: 'fold', percentText: '' }
}

function bannerText(s: UpdateStatus): string | null {
  switch (s.state) {
    case 'checking':
      return 'Verificando atualizacoes...'
    case 'available':
      return `Nova versao ${s.version ?? ''} disponivel. Deseja baixar?`
    case 'downloading':
      return `Baixando atualizacao... ${s.percent ?? 0}%`
    case 'downloaded':
      return `Atualizacao ${s.version ?? ''} baixada.`
    case 'not-available':
      return s.message ?? 'Voce ja esta na ultima versao.'
    default:
      return null
  }
}

export function App(): JSX.Element {
  const [actions, setActions] = useState<ActionItem[]>(() => [
    imageAction('Raise'),
    imageAction('Call')
  ])
  const [results, setResults] = useState<ActionResult[] | null>(null)
  const [foldPct, setFoldPct] = useState<number | null>(null)
  const [computing, setComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [update, setUpdate] = useState<UpdateStatus | null>(null)

  const refreshKey = useCallback(async () => {
    setHasKey(await window.api.hasApiKey())
  }, [])

  useEffect(() => {
    refreshKey()
    const off = window.api.onUpdateStatus((s) => setUpdate(s))
    return off
  }, [refreshKey])

  const onDownloadUpdate = useCallback(() => {
    if (window.api.platform === 'darwin') window.api.openDownloadPage()
    else window.api.downloadUpdate()
  }, [])

  const hasFold = actions.some((a) => a.kind === 'fold')

  const patch = useCallback((id: string, p: Partial<ImageAction> & Partial<FoldActionItem>) => {
    setActions((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...p } as ActionItem) : a)))
    setResults(null)
  }, [])

  const remove = useCallback((id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id))
    setResults(null)
  }, [])

  const addImage = useCallback(() => {
    setActions((prev) => [...prev, imageAction('')])
  }, [])

  const addFold = useCallback(() => {
    setActions((prev) => (prev.some((a) => a.kind === 'fold') ? prev : [...prev, foldAction()]))
  }, [])

  const calcular = useCallback(async () => {
    if (!(await window.api.hasApiKey())) {
      setSettingsOpen(true)
      return
    }
    const imgs = actions.filter(
      (a): a is ImageAction => a.kind === 'image' && !!a.dataUrl && a.name.trim() !== ''
    )
    if (!imgs.length) {
      setError('Adicione pelo menos uma frequencia com nome e imagem colada.')
      return
    }
    const names = imgs.map((a) => a.name.trim())
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
      setError('Use nomes diferentes para cada frequencia.')
      return
    }

    setComputing(true)
    setError(null)
    setResults(null)
    setFoldPct(null)

    const resp = await window.api.identify(
      imgs.map((a) => ({ action: a.name.trim(), dataUrl: a.dataUrl as string }))
    )
    if (!resp.ok) {
      setComputing(false)
      setError(resp.error)
      return
    }

    let all = resp.results
    let foldFraction: number | null = null
    const fold = actions.find((a): a is FoldActionItem => a.kind === 'fold')
    if (fold) {
      const raw = parseFloat(fold.percentText.replace(',', '.'))
      const target = !isNaN(raw) && raw > 0 ? (raw > 1 ? raw / 100 : raw) : null
      const fr = computeFoldResult(all, target)
      foldFraction = fr.foldFraction
      all = [...all, fr]
    }

    setFoldPct(foldFraction)
    setResults(all)
    setComputing(false)
  }, [actions])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">♠</span>
          <span className="brand-name">Range Combos</span>
        </div>
        <div className="topbar-right">
          {hasKey === false && <span className="badge badge-warn">Sem chave de API</span>}
          <button className="btn btn-ghost" onClick={() => window.api.checkUpdates()}>
            Verificar atualizacoes
          </button>
          <button className="btn btn-ghost" onClick={() => setSettingsOpen(true)}>
            Configuracoes
          </button>
        </div>
      </header>

      {update && bannerText(update) && (
        <div className="update-banner">
          <span>{bannerText(update)}</span>
          <div className="update-actions">
            {update.state === 'available' && (
              <button className="btn btn-primary btn-sm" onClick={onDownloadUpdate}>
                Baixar
              </button>
            )}
            {update.state === 'downloaded' && (
              <button className="btn btn-primary btn-sm" onClick={() => window.api.installUpdate()}>
                Reiniciar e atualizar
              </button>
            )}
            <button className="banner-close" onClick={() => setUpdate(null)} title="Dispensar">
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="content">
        <div className="intro">
          <h1>Identificar range</h1>
          <p>
            Cada frequencia e uma acao do range (Raise, Call, 3bet all in...). Dê um nome e cole o
            print com <kbd>Ctrl</kbd>+<kbd>V</kbd>. Para o fold, basta informar a % — o sistema
            infere as maos. Depois clique em <strong>Calcular</strong>.
          </p>
        </div>

        {actions.map((a) =>
          a.kind === 'image' ? (
            <ImageActionCard
              key={a.id}
              name={a.name}
              dataUrl={a.dataUrl}
              onName={(name) => patch(a.id, { name })}
              onImage={(dataUrl) => patch(a.id, { dataUrl })}
              onRemove={actions.length > 1 ? () => remove(a.id) : undefined}
            />
          ) : (
            <FoldActionCard
              key={a.id}
              percentText={a.percentText}
              onPercent={(percentText) => patch(a.id, { percentText })}
              onRemove={() => remove(a.id)}
            />
          )
        )}

        <div className="add-row">
          <button className="btn btn-add" onClick={addImage}>
            + Adicionar frequencia
          </button>
          <button className="btn btn-add" onClick={addFold} disabled={hasFold}>
            + Adicionar fold
          </button>
        </div>

        <div className="calc-bar">
          <button className="btn btn-primary btn-calc" onClick={calcular} disabled={computing}>
            {computing ? 'Calculando...' : 'Calcular'}
          </button>
          {error && <span className="freq-error">{error}</span>}
        </div>

        {results && results.length > 0 && (
          <section className="results">
            {foldPct != null && (
              <div className="results-note">
                Fold inferido: <strong>{(foldPct * 100).toFixed(1)}%</strong>
              </div>
            )}
            <MergedGridPreview results={results} />
            <div className="freq-results">
              {results.map((res) => (
                <RangeGridPreview
                  key={res.action}
                  result={res}
                  hrc={hrcString(results, res.action)}
                />
              ))}
            </div>
          </section>
        )}
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
