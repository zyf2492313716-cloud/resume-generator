const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const { autoUpdater } = require('electron-updater');
const mammoth = require('mammoth');

const TEMPLATES_DIR = '/Users/zhouyufeng/Downloads/1 单页简历';
const FILLER_SCRIPT = path.join(__dirname, 'src/utils/docx_filler_v2.py');

let mainWindow = null;

function scanTemplates() {
  try {
    if (!fs.existsSync(TEMPLATES_DIR)) return [];
    const files = fs.readdirSync(TEMPLATES_DIR)
      .filter(f => f.endsWith('.docx') && !f.startsWith('.'))
      .sort();
    return files.map(name => ({
      name,
      displayName: name.replace('.docx', ''),
      path: path.join(TEMPLATES_DIR, name)
    }));
  } catch (e) {
    console.error('Scan templates error:', e);
    return [];
  }
}

function fillDocx(templatePath, resumeData, outputPath) {
  const tempJson = path.join(app.getPath('temp'), `resume_${Date.now()}.json`);
  fs.writeFileSync(tempJson, JSON.stringify(resumeData, null, 2), 'utf-8');
  try {
    execSync(
      `python3 "${FILLER_SCRIPT}" "${tempJson}" "${templatePath}" "${outputPath}"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return true;
  } catch (err) {
    console.error('Fill docx error:', err.message);
    return false;
  } finally {
    try { fs.unlinkSync(tempJson); } catch (e) {}
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: "智能简历生成器 | 真实 Word 模板套用系统",
    icon: path.join(__dirname, 'public/favicon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  mainWindow.setMenuBarVisibility(false);

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-available', { version: info.version });
});
autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-not-available');
});
autoUpdater.on('error', (err) => {
  if (mainWindow) mainWindow.webContents.send('update-error', err.message);
});
autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) mainWindow.webContents.send('download-progress', progress.percent);
});
autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-downloaded', { version: info.version });
});
ipcMain.on('restart-and-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-template-list', async () => {
  return scanTemplates();
});

ipcMain.handle('render-preview', async (event, { templateName, resumeData }) => {
  const template = scanTemplates().find(t => t.name === templateName);
  if (!template) return { success: false, error: '模板未找到' };

  const tempDir = app.getPath('temp');
  const tempDocx = path.join(tempDir, `preview_${Date.now()}.docx`);

  const filled = fillDocx(template.path, resumeData, tempDocx);
  if (!filled) return { success: false, error: '模板填充失败' };

  try {
    const result = await mammoth.convertToHtml({ path: tempDocx });
    try { fs.unlinkSync(tempDocx); } catch (e) {}
    return { success: true, html: result.value };
  } catch (err) {
    try { fs.unlinkSync(tempDocx); } catch (e) {}
    return { success: false, error: 'HTML 转换失败: ' + err.message };
  }
});

ipcMain.on('export-to-word', async (event, { templateName, resumeData }) => {
  if (!mainWindow) return;

  const template = scanTemplates().find(t => t.name === templateName);
  if (!template) {
    event.reply('word-failed', '模板未找到');
    return;
  }

  const defaultName = `${resumeData.basicInfo.name || '我的'}_求职简历.docx`;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '导出 Word 简历',
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters: [{ name: 'Word 文档 (*.docx)', extensions: ['docx'] }]
  });

  if (canceled || !filePath) {
    event.reply('word-failed', '导出已取消');
    return;
  }

  const tempJson = path.join(app.getPath('temp'), `export_${Date.now()}.json`);
  fs.writeFileSync(tempJson, JSON.stringify(resumeData, null, 2), 'utf-8');

  exec(`python3 "${FILLER_SCRIPT}" "${tempJson}" "${template.path}" "${filePath}"`, { encoding: 'utf-8', timeout: 30000 }, (error, stdout, stderr) => {
    try { fs.unlinkSync(tempJson); } catch (e) {}
    if (error) {
      console.error('Export error:', stderr);
      event.reply('word-failed', 'Word 导出失败');
      return;
    }
    console.log('Export:', stdout);
    event.reply('word-saved', `已导出: ${path.basename(filePath)}`);
  });
});

ipcMain.on('print-to-pdf', async (event, defaultFileName) => {
  if (!mainWindow) return;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '导出 PDF',
    defaultPath: path.join(app.getPath('downloads'), defaultFileName || '我的求职简历.pdf'),
    filters: [{ name: 'PDF 文档 (*.pdf)', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) {
    event.reply('pdf-failed', '导出已取消');
    return;
  }
  try {
    const pdfData = await mainWindow.webContents.printToPDF({
      marginsType: 1, pageSize: 'A4', printBackground: true, landscape: false, displayHeaderFooter: false
    });
    fs.writeFile(filePath, pdfData, (err) => {
      if (err) { event.reply('pdf-failed', 'PDF 写入失败'); return; }
      event.reply('pdf-saved', `PDF 已导出: ${path.basename(filePath)}`);
    });
  } catch (e) {
    event.reply('pdf-failed', 'PDF 生成失败');
  }
});
