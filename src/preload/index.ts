import { contextBridge, ipcRenderer } from 'electron'
import type {
  IdentifyImageInput,
  IdentifyResponse,
  TestKeyResponse,
  UpdateStatus
} from '../shared/types'

const api = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  hasApiKey: (): Promise<boolean> => ipcRenderer.invoke('has-api-key'),
  setApiKey: (key: string): Promise<{ ok: true }> => ipcRenderer.invoke('set-api-key', key),
  testApiKey: (key: string): Promise<TestKeyResponse> => ipcRenderer.invoke('test-api-key', key),
  identify: (images: IdentifyImageInput[]): Promise<IdentifyResponse> =>
    ipcRenderer.invoke('identify-range', images),
  clipboardWrite: (text: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('clipboard-write', text),
  onUpdateStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_e: unknown, status: UpdateStatus): void => cb(status)
    ipcRenderer.on('update-status', listener)
    return () => ipcRenderer.removeListener('update-status', listener)
  },
  platform: process.platform,
  checkUpdates: (): Promise<void> => ipcRenderer.invoke('update:check'),
  downloadUpdate: (): Promise<void> => ipcRenderer.invoke('update:download'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('update:install'),
  openDownloadPage: (): Promise<void> => ipcRenderer.invoke('update:open-download')
}

export type RangeCombosApi = typeof api

contextBridge.exposeInMainWorld('api', api)
