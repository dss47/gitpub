import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { cwd } from 'node:process'
import { stat } from 'node:fs/promises'
import {PublishOptions} from '../shared/types'

const execAsync = promisify(exec)

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // git operations
  ipcMain.handle('git:version', async () => {
    const { stdout } = await execAsync('git --version')
    return stdout.trim()
  })

  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('git:is-repo', async (_event, folderPath: string) => {
    try {
      const gitPath = join(folderPath, '.git')
      const s = await stat(gitPath)
      return s.isDirectory()
    } catch {
      return false
    }
  })

  ipcMain.handle('git:publish', async (_event, options: PublishOptions) => {
    try {
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.token}`,
          'User-Agent': 'Gitpub-App',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: options.repoName, private: options.isPrivate })
      })
      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.message || 'Failed to create repository on Github !' }
      }
      await execAsync('git init', { cwd: options.folderPath })
      await execAsync('git branch -M main', { cwd: options.folderPath })
      await execAsync('git add .', { cwd: options.folderPath })
      try {
        await execAsync("git commit -m 'Initial Commit from Gitpub'", { cwd: options.folderPath })
      } catch {
        //error handling (Git exits with code 1)
      }
      const remoteUrl = `https://${options.token}@github.com/${options.username}/${options.repoName}.git`
      try {
        await execAsync('git remote remove origin', { cwd: options.folderPath })
      } catch {
        //no origin exists
      }
      await execAsync(`git remote add origin ${remoteUrl}`, { cwd: options.folderPath })
      await execAsync('git push -u origin main', { cwd: options.folderPath })
      return { success: true, url: `https://github.com/${options.username}/${options.repoName}` }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to publish repository on Github !' }
    }
  })

  //login Github
  ipcMain.handle('github:login', async (_event, token: string) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Gitpub-App'
        }
      })
      if (!response.ok) {
        throw new Error('Invalid Token');
      }
      const userData = await response.json()
      return { success: true, user: userData }
    } catch {
      return { success: false, error: 'Failed to authenticate to Github' }
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
