// Tipos compartilhados entre main, preload e renderer.

export interface RangeCell {
  hand: string // formato canonico: AA, AKs, AKo, ...
  value: number // valor lido como exibido (sufixo k/m expandido)
}

export interface ActionResult {
  action: string // "Raise" | "Call" | ...
  cells: RangeCell[]
  total: number // soma dos values (calculada no main)
}

export interface IdentifyImageInput {
  action: string
  dataUrl: string // data:image/png;base64,...
}

export type IdentifyResponse =
  | { ok: true; results: ActionResult[] }
  | { ok: false; error: string }

export type TestKeyResponse = { ok: true } | { ok: false; error: string }

export interface UpdateStatus {
  state: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  message?: string
  version?: string
  percent?: number
}
