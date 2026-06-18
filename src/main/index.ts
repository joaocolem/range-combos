import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import pkg from 'electron-updater'
import { registerIpc } from './ipc'
import type { UpdateStatus } from '../shared/types'

const { autoUpdater } = pkg

let mainWindow: BrowserWindow | null = null

function sendUpdateStatus(status: UpdateStatus): void {
  mainWindow?.webContents.send('update-status', status)
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
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
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

  autoUpdater.checkForUpdatesAndNotify().catch(() => {
    /* sem release publicado / offline: ignorar */
  })
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
  createWindow()
  setupAutoUpdate()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
