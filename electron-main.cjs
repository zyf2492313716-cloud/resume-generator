const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const { autoUpdater } = require('electron-updater');
const mammoth = require('mammoth');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const FILLER_SCRIPT = app.isPackaged
  ? path.join(process.resourcesPath, 'utils', 'docx_filler_v2.py')
  : path.join(__dirname, 'src/utils/docx_filler_v2.py');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); } catch (e) { return {}; }
}
function saveConfig(cfg) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8'); } catch (e) {}
}

function getTemplatesDir() {
  const cfg = loadConfig();
  if (cfg.templatesDir && fs.existsSync(cfg.templatesDir)) return cfg.templatesDir;
  // Auto-detect common locations
  const candidates = [
    path.join(app.getPath('home'), 'Downloads', '1 单页简历'),
    path.join(app.getPath('home'), 'Downloads', '单页简历'),
    path.join(app.getPath('desktop'), '1 单页简历'),
    path.join(__dirname, 'templates'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) { saveConfig({ ...cfg, templatesDir: dir }); return dir; }
  }
  return null;
}

let mainWindow = null;

function scanTemplates() {
  try {
    const dir = getTemplatesDir();
    if (!dir || !fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.docx') && !f.startsWith('.'))
      .sort();
    return files.map(name => ({
      name,
      displayName: name.replace('.docx', ''),
      path: path.join(dir, name)
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
    if (!fs.existsSync(outputPath)) {
      console.error('Fill docx: output file not created');
      return false;
    }
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
  setTimeout(() => {
    console.log('[AutoUpdate] Checking for updates...');
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('check-for-updates', () => {
  console.log('[AutoUpdate] Manual check triggered');
  autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdate] Update available:', info.version);
  if (mainWindow) mainWindow.webContents.send('update-available', { version: info.version });
});
autoUpdater.on('update-not-available', () => {
  console.log('[AutoUpdate] No updates available');
  if (mainWindow) mainWindow.webContents.send('update-not-available');
});
autoUpdater.on('error', (err) => {
  console.error('[AutoUpdate] Error:', err.message);
  if (mainWindow) mainWindow.webContents.send('update-error', err.message);
});
autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) mainWindow.webContents.send('download-progress', progress.percent);
});
autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdate] Update downloaded:', info.version);
  if (mainWindow) mainWindow.webContents.send('update-downloaded', { version: info.version });
});
ipcMain.on('restart-and-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-template-list', async () => {
  return scanTemplates();
});

ipcMain.handle('select-template-dir', async () => {
  if (!mainWindow) return { success: false };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '选择简历模板文件夹',
    properties: ['openDirectory'],
    defaultPath: getTemplatesDir() || app.getPath('downloads')
  });
  if (canceled || !filePaths[0]) return { success: false };
  const cfg = loadConfig();
  cfg.templatesDir = filePaths[0];
  saveConfig(cfg);
  return { success: true, count: scanTemplates().length };
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
    return { success: false, error: '预览转换失败: ' + err.message };
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
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      pageSize: 'A4', printBackground: true, landscape: false, displayHeaderFooter: false
    });
    fs.writeFile(filePath, pdfData, (err) => {
      if (err) { event.reply('pdf-failed', 'PDF 写入失败'); return; }
      event.reply('pdf-saved', `PDF 已导出: ${path.basename(filePath)}`);
    });
  } catch (e) {
    event.reply('pdf-failed', 'PDF 生成失败');
  }
});
