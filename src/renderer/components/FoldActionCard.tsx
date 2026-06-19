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
          Frequencia de fold (%)
        </label>
        <input
          id="foldpct"
          className="field-input fold-input"
          type="number"
          min={0}
          max={100}
          step={0.1}
          placeholder="ex.: 31"
          value={percentText}
          onChange={(e) => onPercent(e.target.value)}
        />
        <p className="field-hint">
          Sem print: informe so a % de fold. O sistema infere quais maos foldam — as mais fortes
          praticamente nao foldam e as mais fracas absorvem o fold, com base nos combos reais de
          cada mao (par 6, suited 4, offsuit 12), ate atingir essa porcentagem.
        </p>
      </div>
    </section>
  )
}
