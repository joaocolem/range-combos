import { app, shell, BrowserWindow, session, ipcMain } from 'electron'
import { join } from 'path'
import pkg from 'electron-updater'
import { registerIpc } from './ipc'
import { GITHUB_OWNER, GITHUB_REPO, releasesUrl } from '../shared/config'
import type { UpdateStatus } from '../shared/types'

const { autoUpdater } = pkg
const isMac = process.platform === 'darwin'

let mainWindow: BrowserWindow | null = null

function sendUpdateStatus(status: UpdateStatus): void {
  mainWindow?.webContents.send('update-status', status)
}

/** Compara versoes "x.y.z"; true se remote > local. */
function isNewer(remote: string, local: string): boolean {
  const r = remote.split('.').map((n) => parseInt(n, 10) || 0)
  const l = local.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const a = r[i] ?? 0
    const b = l[i] ?? 0
    if (a !== b) return a > b
  }
  return false
}

/** Verificacao de update no macOS via API do GitHub (funciona sem assinatura). */
async function macCheck(): Promise<void> {
  sendUpdateStatus({ state: 'checking' })
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'range-combos' } }
    )
    if (!res.ok) {
      sendUpdateStatus({ state: 'not-available' })
      return
    }
    const data = (await res.json()) as { tag_name?: string }
    const version = String(data.tag_name ?? '').replace(/^v/, '')
    if (version && isNewer(version, app.getVersion())) {
      sendUpdateStatus({ state: 'available', version })
    } else {
      sendUpdateStatus({ state: 'not-available' })
    }
  } catch (e) {
    sendUpdateStatus({ state: 'error', message: String((e as Error)?.message ?? e) })
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f1115',
    title: 'Range Combos',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  // Abrir links externos no navegador padrao.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupAutoUpdate(): void {
  if (isMac) {
    // macOS (sem assinatura): apenas verificar e avisar.
    if (app.isPackaged) macCheck()
    return
  }

  // Windows: avisa e pergunta antes de baixar (autoDownload desligado).
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => sendUpdateStatus({ state: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    sendUpdateStatus({ state: 'available', version: info?.version })
  )
  autoUpdater.on('update-not-available', () => sendUpdateStatus({ state: 'not-available' }))
  autoUpdater.on('download-progress', (p) =>
    sendUpdateStatus({ state: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) =>
    sendUpdateStatus({ state: 'downloaded', version: info?.version })
  )
  autoUpdater.on('error', (err) =>
    sendUpdateStatus({ state: 'error', message: err == null ? 'erro' : String(err.message) })
  )

  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(() => {
      /* sem release publicado / offline: ignorar */
    })
  }
}

function registerUpdateIpc(): void {
  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) {
      sendUpdateStatus({ state: 'not-available', message: 'Disponivel apenas no app instalado.' })
      return
    }
    if (isMac) {
      await macCheck()
      return
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (e) {
      sendUpdateStatus({ state: 'error', message: String((e as Error)?.message ?? e) })
    }
  })

  // Windows: usuario confirmou que quer baixar.
  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
    } catch (e) {
      sendUpdateStatus({ state: 'error', message: String((e as Error)?.message ?? e) })
    }
  })

  // Windows: instalar o que ja foi baixado.
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall())

  // macOS: abrir a pagina de download (releases).
  ipcMain.handle('update:open-download', () => shell.openExternal(releasesUrl()))
}

app.whenReady().then(() => {
  // CSP estrita apenas em producao (em dev o Vite precisa de ws/inline para o HMR).
  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"
          ]
        }
      })
    })
  }

  registerIpc()
  registerUpdateIpc()
  createWindow()
  setupAutoUpdate()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
