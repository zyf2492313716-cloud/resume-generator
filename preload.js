const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getTemplateList: () => ipcRenderer.invoke('get-template-list'),
  renderPreview: (templateName, resumeData) => ipcRenderer.invoke('render-preview', { templateName, resumeData }),

  printToPdf: (fileName) => ipcRenderer.send('print-to-pdf', fileName),
  onPdfSaved: (callback) => ipcRenderer.on('pdf-saved', (event, ...args) => callback(...args)),
  onPdfFailed: (callback) => ipcRenderer.on('pdf-failed', (event, ...args) => callback(...args)),

  exportToWord: (templateName, resumeData) => ipcRenderer.send('export-to-word', { templateName, resumeData }),
  onWordSaved: (callback) => ipcRenderer.on('word-saved', (event, ...args) => callback(...args)),
  onWordFailed: (callback) => ipcRenderer.on('word-failed', (event, ...args) => callback(...args)),

  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', () => callback()),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, msg) => callback(msg)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, percent) => callback(percent)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  restartAndUpdate: () => ipcRenderer.send('restart-and-update')
});
