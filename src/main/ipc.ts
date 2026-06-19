import { ipcMain, clipboard, app } from 'electron'

export function registerIpc(): void {
  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('clipboard-write', (_e, text: string) => {
    clipboard.writeText(String(text))
    return { ok: true }
  })
}
