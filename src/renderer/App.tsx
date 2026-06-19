import { useCallback, useEffect, useState } from 'react'
import type { ActionResult, UpdateStatus } from '../shared/types'
import { normalizeHand } from './hands'
import { hrcString } from './merge'
import { computeFoldResult } from './fold'
import { ImageActionCard } from './components/ImageActionCard'
import { FoldActionCard } from './components/FoldActionCard'
import { EditableRangeGrid } from './components/EditableRangeGrid'
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

function AiIcon(): JSX.Element {
  return (
    <svg className="ai-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.7 4.6L18.5 8l-4.8 1.4L12 14l-1.7-4.6L5.5 8l4.8-1.4L12 2z" />
      <path d="M19 13l.9 2.4 2.6.7-2.6.7-.9 2.4-.9-2.4-2.6-.7 2.6-.7L19 13z" />
    </svg>
  )
}

export function App(): JSX.Element {
  const [actions, setActions] = useState<ActionItem[]>(() => [
    imageAction('Raise'),
    imageAction('Call'),
    foldAction()
  ])
  const [extracted, setExtracted] = useState<ActionResult[] | null>(null)
  const [results, setResults] = useState<ActionResult[] | null>(null)
  const [foldPct, setFoldPct] = useState<number | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [update, setUpdate] = useState<UpdateStatus | null>(null)
  const [version, setVersion] = useState('')

  const refreshKey = useCallback(async () => {
    setHasKey(await window.api.hasApiKey())
  }, [])

  useEffect(() => {
    refreshKey()
    window.api.getVersion().then(setVersion)
    const off = window.api.onUpdateStatus((s) => setUpdate(s))
    return off
  }, [refreshKey])

  const onDownloadUpdate = useCallback(() => {
    if (window.api.platform === 'darwin') window.api.openDownloadPage()
    else window.api.downloadUpdate()
  }, [])

  const imageCount = actions.filter((a) => a.kind === 'image').length

  // Mudar nome/imagem/% invalida a extracao e os resultados.
  const patch = useCallback((id: string, p: Partial<ImageAction> & Partial<FoldActionItem>) => {
    setActions((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...p } as ActionItem) : a)))
    setExtracted(null)
    setResults(null)
    setFoldPct(null)
  }, [])

  const remove = useCallback((id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id))
    setExtracted(null)
    setResults(null)
    setFoldPct(null)
  }, [])

  const addImage = useCallback(() => {
    setActions((prev) => {
      const next = [...prev]
      const foldIdx = next.findIndex((a) => a.kind === 'fold')
      const item = imageAction('')
      if (foldIdx === -1) next.push(item)
      else next.splice(foldIdx, 0, item) // mantem o Fold por ultimo
      return next
    })
    setExtracted(null)
    setResults(null)
  }, [])

  // Passo 1: chamar a API e extrair as matrizes (sem calcular nada ainda).
  const extrair = useCallback(async () => {
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

    setExtracting(true)
    setError(null)
    setExtracted(null)
    setResults(null)
    setFoldPct(null)

    const resp = await window.api.identify(
      imgs.map((a) => ({ action: a.name.trim(), dataUrl: a.dataUrl as string }))
    )
    setExtracting(false)
    if (!resp.ok) {
      setError(resp.error)
      return
    }
    setExtracted(resp.results)
  }, [actions])

  // Edicao de uma celula nas matrizes extraidas.
  const setCellValue = useCallback((actionIdx: number, hand: string, value: number) => {
    setExtracted((prev) => {
      if (!prev) return prev
      return prev.map((res, i) => {
        if (i !== actionIdx) return res
        const m = new Map(res.cells.map((c) => [normalizeHand(c.hand), c.value]))
        if (value > 0) m.set(normalizeHand(hand), value)
        else m.delete(normalizeHand(hand))
        const cells = [...m.entries()].map(([h, v]) => ({ hand: h, value: v }))
        const total = cells.reduce((s, c) => s + c.value, 0)
        return { ...res, cells, total }
      })
    })
    setResults(null)
    setFoldPct(null)
  }, [])

  // Passo 2: calcular mescla + fold + HRC a partir das matrizes (ja editadas).
  const calcular = useCallback(() => {
    if (!extracted) return
    let all = [...extracted]
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
  }, [extracted, actions])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">♠</span>
          <span className="brand-name">Range Combos</span>
          {version && <span className="brand-version">v{version}</span>}
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
            print com <kbd>Ctrl</kbd>+<kbd>V</kbd>. No Fold informe so a % (opcional). Clique em{' '}
            <strong>Extrair matrizes</strong>, confira/edite os valores e entao{' '}
            <strong>Calcular</strong>.
          </p>
        </div>

        <div className="actions-grid">
          {actions.map((a) =>
            a.kind === 'image' ? (
              <ImageActionCard
                key={a.id}
                name={a.name}
                dataUrl={a.dataUrl}
                onName={(name) => patch(a.id, { name })}
                onImage={(dataUrl) => patch(a.id, { dataUrl })}
                onRemove={imageCount > 1 ? () => remove(a.id) : undefined}
              />
            ) : (
              <FoldActionCard
                key={a.id}
                percentText={a.percentText}
                onPercent={(percentText) => patch(a.id, { percentText })}
              />
            )
          )}
        </div>

        <div className="add-row">
          <button className="btn btn-add" onClick={addImage}>
            + Adicionar frequencia
          </button>
        </div>

        {!extracted && (
          <div className="calc-bar">
            <button className="btn btn-primary btn-calc" onClick={extrair} disabled={extracting}>
              <AiIcon /> {extracting ? 'Extraindo...' : 'Extrair matrizes'}
            </button>
            {error && <span className="freq-error">{error}</span>}
          </div>
        )}

        {extracted && !results && (
          <section className="extracted">
            <div className="section-head">
              <h2>Matrizes extraidas</h2>
              <span className="section-hint">
                Confira os valores. Clique 2x numa celula para editar o numero de combos.
              </span>
            </div>
            <div className="freq-results">
              {extracted.map((res, i) => (
                <EditableRangeGrid
                  key={res.action}
                  result={res}
                  onChange={(hand, value) => setCellValue(i, hand, value)}
                />
              ))}
            </div>
            <div className="calc-bar">
              <button className="btn btn-primary btn-calc" onClick={calcular}>
                Calcular
              </button>
              <button className="btn btn-ghost" onClick={() => setExtracted(null)}>
                Refazer extracao
              </button>
            </div>
          </section>
        )}

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
            <div className="calc-bar">
              <button className="btn btn-ghost" onClick={() => setResults(null)}>
                Editar matrizes
              </button>
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
