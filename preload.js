const { contextBridge, ipcRenderer } = require('electron');

// 遵循 UTF-8 与简体中文编码标准
// 暴露安全隔离的 Electron 原生 API 通信通道给网页端，打通桌面级万能 Word 导出及 PDF 导出能力
contextBridge.exposeInMainWorld('electronAPI', {
  // 1. 发送导出 PDF 简历请求给主进程
  printToPdf: (fileName) => ipcRenderer.send('print-to-pdf', fileName),
  
  // 2. 接收 PDF 导出成功的通知回调
  onPdfSaved: (callback) => ipcRenderer.on('pdf-saved', (event, ...args) => callback(...args)),
  
  // 3. 接收 PDF 导出失败的通知回调
  onPdfFailed: (callback) => ipcRenderer.on('pdf-failed', (event, ...args) => callback(...args)),

  // 4. 发送“一键语义套用并导出 Word (.docx)”请求给主进程
  // 传入要套用的模板文件名 (如 "稳重单页01.docx") 以及简历数据 JSON
  exportToWord: (templateName, resumeData) => ipcRenderer.send('export-to-word', { templateName, resumeData }),

  // 5. 接收 Word 导出成功的通知回调
  onWordSaved: (callback) => ipcRenderer.on('word-saved', (event, ...args) => callback(...args)),

  // 6. 接收 Word 导出失败的通知回调
  onWordFailed: (callback) => ipcRenderer.on('word-failed', (event, ...args) => callback(...args))
});
