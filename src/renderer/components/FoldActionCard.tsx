interface Props {
  percentText: string
  onPercent: (value: string) => void
  onRemove: () => void
}

export function FoldActionCard({ percentText, onPercent, onRemove }: Props): JSX.Element {
  return (
    <section className="freq-card fold-card">
      <div className="freq-head">
        <span className="action-name-static">
          <span className="fold-swatch" /> Fold
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onRemove}>
          Remover
        </button>
      </div>
      <div className="fold-body">
        <label className="field-label" htmlFor="foldpct">
          Frequencia de fold (%) — opcional
        </label>
        <input
          id="foldpct"
          className="field-input fold-input"
          type="number"
          min={0}
          max={100}
          step={0.1}
          placeholder="ex.: 31 (ou deixe em branco)"
          value={percentText}
          onChange={(e) => onPercent(e.target.value)}
        />
        <p className="field-hint">
          O peso cheio (100%, sem fold) de cada categoria e ancorado nas maos mais fortes que nao
          foldam — <strong>AA/KK</strong> (pares), <strong>AKs</strong> (suited) e{' '}
          <strong>AKo</strong> (offsuit). Cada mao folda a diferenca ate esse cheio, mantendo o
          play minimo. Em branco, usa as ancoras direto; com a %, ajusta a escala para bater essa
          porcentagem.
        </p>
      </div>
    </section>
  )
}
