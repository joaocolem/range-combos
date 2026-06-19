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
          Sem print. Maos fortes nao foldam (AA/KK, AKs, AKo) e as fracas absorvem o fold. A % e
          opcional: em branco usa as ancoras; preenchida ajusta a escala.
        </p>
      </div>
    </section>
  )
}
