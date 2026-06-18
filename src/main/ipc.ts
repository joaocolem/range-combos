import { ipcMain } from 'electron'
import { getApiKey, hasApiKey, setApiKey } from './store'
import { identifyImage, testKey } from './anthropic'
import type {
  IdentifyImageInput,
  IdentifyResponse,
  TestKeyResponse,
  ActionResult
} from '../shared/types'

function errMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as Error).message)
  return String(e)
}

export function registerIpc(): void {
  ipcMain.handle('has-api-key', () => hasApiKey())

  ipcMain.handle('set-api-key', (_e, key: string) => {
    setApiKey(key)
    return { ok: true }
  })

  ipcMain.handle('test-api-key', async (_e, key: string): Promise<TestKeyResponse> => {
    try {
      await testKey(key)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errMessage(e) }
    }
  })

  ipcMain.handle(
    'identify-range',
    async (_e, images: IdentifyImageInput[]): Promise<IdentifyResponse> => {
      const apiKey = getApiKey()
      if (!apiKey) return { ok: false, error: 'Nenhuma chave de API configurada.' }
      if (!images?.length) return { ok: false, error: 'Nenhuma imagem para identificar.' }

      try {
        const results: ActionResult[] = []
        for (const img of images) {
          results.push(await identifyImage(apiKey, img.dataUrl, img.action))
        }
        return { ok: true, results }
      } catch (e) {
        return { ok: false, error: errMessage(e) }
      }
    }
  )
}
