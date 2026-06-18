import { useEffect, useState } from 'react'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props): JSX.Element {
  const [key, setKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    window.api.hasApiKey().then(setHasKey)
  }, [])

  const test = async (): Promise<void> => {
    setTesting(true)
    setStatus(null)
    const r = await window.api.testApiKey(key.trim())
    setTesting(false)
    setStatus(r.ok ? { ok: true, msg: 'Chave valida.' } : { ok: false, msg: r.error })
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    await window.api.setApiKey(key.trim())
    setSaving(false)
    setHasKey(true)
    setStatus({ ok: true, msg: 'Chave salva neste computador.' })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Configuracoes</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Fechar
          </button>
        </div>

        <label className="field-label" htmlFor="apikey">
          Chave da API da Anthropic
        </label>
        <input
          id="apikey"
          className="field-input"
          type="password"
          autoComplete="off"
          placeholder={hasKey ? 'Uma chave ja esta salva — digite para substituir' : 'sk-ant-...'}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />

        <p className="field-hint">
          A chave fica salva apenas neste computador e e usada para ler os prints via API de
          visao. Cada identificacao consome tokens da sua conta. Crie uma chave em{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
          .
        </p>

        {status && (
          <div className={`field-status ${status.ok ? 'is-ok' : 'is-err'}`}>{status.msg}</div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={test} disabled={!key.trim() || testing}>
            {testing ? 'Testando...' : 'Testar'}
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!key.trim() || saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
