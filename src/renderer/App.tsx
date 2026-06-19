import { useCallback, useEffect, useState } from 'react'
import type { ActionResult, UpdateStatus } from '../shared/types'
import { normalizeHand } from './hands'
import { hrcString } from './merge'
import { computeFoldResult } from './fold'
import { parseRange } from './parseRange'
import { RangeActionCard } from './components/RangeActionCard'
import { FoldActionCard } from './components/FoldActionCard'
import { RangeGridPreview } from './components/RangeGridPreview'
import { MergedGridPreview } from './components/MergedGridPreview'
import { HrcCopyBar } from './components/HrcCopyBar'

interface RangeAction {
  id: string
  kind: 'range'
  name: string
  text: string
  result: ActionResult | null
}

interface FoldActionItem {
  id: string
  kind: 'fold'
  percentText: string
}

type ActionItem = RangeAction | FoldActionItem

let counter = 0
function rangeAction(name = ''): RangeAction {
  counter += 1
  return { id: `a${counter}-${Date.now()}`, kind: 'range', name, text: '', result: null }
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
    rangeAction('Raise'),
    rangeAction('Call'),
    foldAction()
  ])
  const [results, setResults] = useState<ActionResult[] | null>(null)
  const [foldPct, setFoldPct] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [update, setUpdate] = useState<UpdateStatus | null>(null)
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.api.getVersion().then(setVersion)
    const off = window.api.onUpdateStatus((s) => setUpdate(s))
    return off
  }, [])

  const onDownloadUpdate = useCallback(() => {
    if (window.api.platform === 'darwin') window.api.openDownloadPage()
    else window.api.downloadUpdate()
  }, [])

  const rangeCount = actions.filter((a) => a.kind === 'range').length

  // Qualquer mudanca nas frequencias invalida os resultados calculados.
  const invalidate = useCallback(() => {
    setResults(null)
    setFoldPct(null)
    setError(null)
  }, [])

  const setName = useCallback(
    (id: string, name: string) => {
      setActions((prev) =>
        prev.map((a) => (a.id === id && a.kind === 'range' ? { ...a, name } : a))
      )
      invalidate()
    },
    [invalidate]
  )

  // Colar/digitar o range: parseia na hora e a matriz aparece automaticamente.
  const setText = useCallback(
    (id: string, text: string) => {
      setActions((prev) =>
        prev.map((a) => {
          if (a.id !== id || a.kind !== 'range') return a
          const result = text.trim() ? parseRange(text, a.name.trim() || 'Frequencia') : null
          return { ...a, text, result }
        })
      )
      invalidate()
    },
    [invalidate]
  )

  const setPercent = useCallback(
    (id: string, percentText: string) => {
      setActions((prev) =>
        prev.map((a) => (a.id === id && a.kind === 'fold' ? { ...a, percentText } : a))
      )
      invalidate()
    },
    [invalidate]
  )

  // Edicao manual de uma celula da matriz ja extraida.
  const setCellValue = useCallback(
    (id: string, hand: string, value: number) => {
      setActions((prev) =>
        prev.map((a) => {
          if (a.id !== id || a.kind !== 'range' || !a.result) return a
          const m = new Map(a.result.cells.map((c) => [normalizeHand(c.hand), c.value]))
          if (value > 0) m.set(normalizeHand(hand), value)
          else m.delete(normalizeHand(hand))
          const cells = [...m.entries()].map(([h, v]) => ({ hand: h, value: v }))
          const total = cells.reduce((s, c) => s + c.value, 0)
          return { ...a, result: { ...a.result, cells, total } }
        })
      )
      invalidate()
    },
    [invalidate]
  )

  const remove = useCallback(
    (id: string) => {
      setActions((prev) => prev.filter((a) => a.id !== id))
      invalidate()
    },
    [invalidate]
  )

  const addRange = useCallback(() => {
    setActions((prev) => {
      const next = [...prev]
      const foldIdx = next.findIndex((a) => a.kind === 'fold')
      const item = rangeAction('')
      if (foldIdx === -1) next.push(item)
      else next.splice(foldIdx, 0, item) // mantem o Fold por ultimo
      return next
    })
    invalidate()
  }, [invalidate])

  // Mescla as matrizes + infere o fold + gera as strings HRC.
  const calcular = useCallback(() => {
    const ranges = actions.filter(
      (a): a is RangeAction => a.kind === 'range' && !!a.result && a.result.cells.length > 0
    )
    if (!ranges.length) {
      setError('Cole pelo menos um range com combos validos.')
      return
    }
    const named = ranges.map((a) => ({ ...a, name: a.name.trim() }))
    if (named.some((a) => !a.name)) {
      setError('De um nome para cada frequencia.')
      return
    }
    if (new Set(named.map((a) => a.name.toLowerCase())).size !== named.length) {
      setError('Use nomes diferentes para cada frequencia.')
      return
    }

    setError(null)
    let all: ActionResult[] = named.map((a) => ({ ...(a.result as ActionResult), action: a.name }))

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
  }, [actions])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">♠</span>
          <span className="brand-name">Range Combos</span>
          {version && <span className="brand-version">v{version}</span>}
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost" onClick={() => window.api.checkUpdates()}>
            Verificar atualizacoes
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
        {!results ? (
          <>
            <div className="intro">
              <h1>Identificar range</h1>
              <p>
                Cada frequencia e uma acao do range (Raise, Call, 3bet all in...). Dê um nome e cole
                o JSON exportado do Hand2Note. A matriz aparece automaticamente mostrando a
                quantidade de combos de cada mao (<code>HandCount</code>). No Fold informe so a %
                (opcional). Depois clique em <strong>Calcular</strong>.
              </p>
            </div>

            <div className="actions-grid">
              {actions.map((a) =>
                a.kind === 'range' ? (
                  <RangeActionCard
                    key={a.id}
                    name={a.name}
                    text={a.text}
                    result={a.result}
                    onName={(name) => setName(a.id, name)}
                    onText={(text) => setText(a.id, text)}
                    onCell={(hand, value) => setCellValue(a.id, hand, value)}
                    onRemove={rangeCount > 1 ? () => remove(a.id) : undefined}
                  />
                ) : (
                  <FoldActionCard
                    key={a.id}
                    percentText={a.percentText}
                    onPercent={(percentText) => setPercent(a.id, percentText)}
                  />
                )
              )}
            </div>

            <div className="add-row">
              <button className="btn btn-add" onClick={addRange}>
                + Adicionar frequencia
              </button>
            </div>

            <div className="calc-bar">
              <button className="btn btn-primary btn-calc" onClick={calcular}>
                Calcular
              </button>
              {error && <span className="freq-error">{error}</span>}
            </div>
          </>
        ) : (
          results.length > 0 && (
            <section className="results">
              <div className="results-toolbar">
                <button className="btn btn-primary" onClick={() => setResults(null)}>
                  ← Voltar e editar
                </button>
                {foldPct != null && (
                  <span className="results-note">
                    Fold inferido: <strong>{(foldPct * 100).toFixed(1)}%</strong>
                  </span>
                )}
              </div>

              <HrcCopyBar results={results} />

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
          )
        )}
      </main>
    </div>
  )
}
