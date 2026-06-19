import { useState } from 'react'
import type { ActionResult } from '../../shared/types'
import { hrcString } from '../merge'
import { actionRgb, rgbCss } from '../colors'

interface Props {
  results: ActionResult[]
}

export function HrcCopyBar({ results }: Props): JSX.Element {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (action: string): Promise<void> => {
    const hrc = hrcString(results, action)
    if (!hrc) return
    await window.api.clipboardWrite(hrc)
    setCopied(action)
    setTimeout(() => setCopied((c) => (c === action ? null : c)), 1500)
  }

  return (
    <div className="copy-bar">
      <span className="copy-bar-label">Copiar HRC:</span>
      {results.map((res, i) => (
        <button
          key={res.action}
          className="btn btn-copy"
          onClick={() => copy(res.action)}
          style={{ borderColor: rgbCss(actionRgb(res.action, i), 0.7) }}
        >
          <span className="copy-swatch" style={{ background: rgbCss(actionRgb(res.action, i)) }} />
          {copied === res.action ? 'Copiado!' : res.action}
        </button>
      ))}
    </div>
  )
}
