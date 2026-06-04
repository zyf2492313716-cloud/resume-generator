const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const { autoUpdater } = require('electron-updater');
const mammoth = require('mammoth');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const BUNDLED_TEMPLATES = app.isPackaged
  ? path.join(process.resourcesPath, 'templates')
  : path.join(__dirname, 'templates');
const FILLER_SCRIPT = app.isPackaged
  ? path.join(process.resourcesPath, 'utils', 'docx_filler_v2.py')
  : path.join(__dirname, 'src/utils/docx_filler_v2.py');
const ENGINE_SCRIPT = app.isPackaged
  ? path.join(process.resourcesPath, 'utils', 'template_engine.py')
  : path.join(__dirname, 'src/utils/template_engine.py');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); } catch (e) { return {}; }
}
function saveConfig(cfg) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8'); } catch (e) {}
}

function getTemplatesDir() {
  const cfg = loadConfig();
  if (cfg.templatesDir && fs.existsSync(cfg.templatesDir)) return cfg.templatesDir;
  const candidates = [
    BUNDLED_TEMPLATES,
    path.join(app.getPath('home'), 'Downloads', '1 单页简历'),
    path.join(app.getPath('home'), 'Downloads', '单页简历'),
    path.join(app.getPath('desktop'), '1 单页简历'),
    path.join(__dirname, 'templates'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      const hasDocx = fs.readdirSync(dir).some(f => f.endsWith('.docx'));
      if (hasDocx) { saveConfig({ ...cfg, templatesDir: dir }); return dir; }
    }
  }
  return null;
}

let mainWindow = null;

function scanTemplates() {
  try {
    const dir = getTemplatesDir();
    if (!dir || !fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.docx') && !f.startsWith('.') && !f.includes('.docxtpl.') && !f.includes('.marked.'))
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

function fillDocx(templatePath, resumeData, outputPath, layoutAdjustments) {
  const tempJson = path.join(app.getPath('temp'), `resume_${Date.now()}.json`);
  fs.writeFileSync(tempJson, JSON.stringify(resumeData, null, 2), 'utf-8');
  
  let tempLayoutJson = null;
  let layoutArg = '';
  if (layoutAdjustments && Object.keys(layoutAdjustments).length > 0) {
    tempLayoutJson = path.join(app.getPath('temp'), `layout_${Date.now()}.json`);
    fs.writeFileSync(tempLayoutJson, JSON.stringify(layoutAdjustments, null, 2), 'utf-8');
    layoutArg = ` "${tempLayoutJson}"`;
  }

  try {
    // Use template_engine.py with fill_with_fallback (YAML → engine, else → v2)
    execSync(
      `python3 "${ENGINE_SCRIPT}" "${tempJson}" "${templatePath}" "${outputPath}"${layoutArg}`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    if (!fs.existsSync(outputPath)) {
      console.error('Fill docx: output file not created');
      return false;
    }
    return true;
  } catch (err) {
    console.error('Fill docx error:', err.message);
    // Fallback to v2 if engine fails
    try {
      execSync(
        `python3 "${FILLER_SCRIPT}" "${tempJson}" "${templatePath}" "${outputPath}"`,
        { encoding: 'utf-8', timeout: 30000 }
      );
      return fs.existsSync(outputPath);
    } catch (err2) {
      console.error('V2 fallback error:', err2.message);
      return false;
    }
  } finally {
    try { fs.unlinkSync(tempJson); } catch (e) {}
    if (tempLayoutJson) {
      try { fs.unlinkSync(tempLayoutJson); } catch (e) {}
    }
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

ipcMain.handle('parse-template-layout', async (event, { templatePath }) => {
  try {
    const SPATIAL_SCRIPT = app.isPackaged
      ? path.join(process.resourcesPath, 'utils', 'spatial_engine.py')
      : path.join(__dirname, 'src/utils/spatial_engine.py');
    const result = execSync(
      `python3 "${SPATIAL_SCRIPT}" --export-layout "${templatePath}"`,
      { encoding: 'utf-8', timeout: 15000 }
    );
    return JSON.parse(result);
  } catch (err) {
    console.error('Parse template layout error:', err.message);
    return { error: err.message };
  }
});

const SPATIAL_WHITELIST = new Set([
  "文艺单页04", "文艺单页07", "文艺单页09", "文艺单页16",
  "活泼单页12", "知页简历02", "知页简历03", "稳重单页01", "稳重单页21",
  "简约单页18", "简约单页19", "简约单页30",
  "文艺单页10", "文艺单页12", "稳重单页06", "稳重单页12", "稳重单页20", "简约单页25"
]);

ipcMain.handle('check-template-config', async (event, { templatePath }) => {
  let docxtplPath = templatePath.replace('.docx', '.docxtpl.docx');
  let hasDocxtpl = fs.existsSync(docxtplPath);
  
  let configPath = templatePath.replace('.docx', '.yaml');
  let hasYaml = fs.existsSync(configPath);
  
  // Fall back to bundled templates dir for config files
  if (!hasDocxtpl || !hasYaml) {
    const baseName = path.basename(templatePath);
    if (!hasDocxtpl) {
      const altDocxtpl = path.join(BUNDLED_TEMPLATES, baseName.replace('.docx', '.docxtpl.docx'));
      if (fs.existsSync(altDocxtpl)) {
        docxtplPath = altDocxtpl;
        hasDocxtpl = true;
      }
    }
    if (!hasYaml) {
      const altYaml = path.join(BUNDLED_TEMPLATES, baseName.replace('.docx', '.yaml'));
      if (fs.existsSync(altYaml)) {
        configPath = altYaml;
        hasYaml = true;
      }
    }
  }
  
  const baseName = path.basename(templatePath, '.docx');
  let engineType = 'spatial';
  let fallback = false;
  
  if (hasDocxtpl) {
    engineType = 'docxtpl';
  } else if (SPATIAL_WHITELIST.has(baseName)) {
    engineType = 'spatial';
  } else if (hasYaml) {
    engineType = 'yaml';
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      fallback = content.includes('fallback: true');
    } catch (e) {}
  }
  
  return { hasConfig: hasYaml || hasDocxtpl, fallback, engineType };
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

ipcMain.handle('get-api-config', async () => {
  const cfg = loadConfig();
  return {
    provider: cfg.aiProvider || 'custom',
    apiUrl: cfg.apiUrl || '',
    apiKey: cfg.apiKey || '',
    modelName: cfg.modelName || 'deepseek-chat'
  };
});

ipcMain.handle('save-api-config', async (event, apiCfg) => {
  const cfg = loadConfig();
  cfg.aiProvider = apiCfg.provider;
  cfg.apiUrl = apiCfg.apiUrl;
  cfg.apiKey = apiCfg.apiKey;
  cfg.modelName = apiCfg.modelName;
  saveConfig(cfg);
  return { success: true };
});

ipcMain.handle('render-preview', async (event, { templateName, resumeData, layoutAdjustments }) => {
  const template = scanTemplates().find(t => t.name === templateName);
  if (!template) return { success: false, error: '模板未找到' };

  const tempDir = app.getPath('temp');
  const tempDocx = path.join(tempDir, `preview_${Date.now()}.docx`);

  const filled = fillDocx(template.path, resumeData, tempDocx, layoutAdjustments);
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

ipcMain.on('export-to-word', async (event, { templateName, resumeData, layoutAdjustments }) => {
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

  let tempLayoutJson = null;
  let layoutArg = '';
  if (layoutAdjustments && Object.keys(layoutAdjustments).length > 0) {
    tempLayoutJson = path.join(app.getPath('temp'), `export_layout_${Date.now()}.json`);
    fs.writeFileSync(tempLayoutJson, JSON.stringify(layoutAdjustments, null, 2), 'utf-8');
    layoutArg = ` "${tempLayoutJson}"`;
  }

  exec(`python3 "${ENGINE_SCRIPT}" "${tempJson}" "${template.path}" "${filePath}"${layoutArg}`, { encoding: 'utf-8', timeout: 30000 }, (error, stdout, stderr) => {
    try { fs.unlinkSync(tempJson); } catch (e) {}
    if (tempLayoutJson) {
      try { fs.unlinkSync(tempLayoutJson); } catch (e) {}
    }
    if (error) {
      // Fallback to v2
      const tempJson2 = path.join(app.getPath('temp'), `export2_${Date.now()}.json`);
      fs.writeFileSync(tempJson2, JSON.stringify(resumeData, null, 2), 'utf-8');
      exec(`python3 "${FILLER_SCRIPT}" "${tempJson2}" "${template.path}" "${filePath}"`, { encoding: 'utf-8', timeout: 30000 }, (err2) => {
        try { fs.unlinkSync(tempJson2); } catch (e) {}
        if (err2) {
          console.error('Export error:', err2.message);
          event.reply('word-failed', 'Word 导出失败');
          return;
        }
        event.reply('word-saved', `已导出: ${path.basename(filePath)}`);
      });
      return;
    }
    console.log('Export:', stdout);
    event.reply('word-saved', `已导出: ${path.basename(filePath)}`);
  });
});

ipcMain.on('print-to-pdf', async (event, { defaultFileName, templateName, resumeData, layoutAdjustments }) => {
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
    // Find template and fill it
    let html = '';
    if (templateName && resumeData) {
      const template = scanTemplates().find(t => t.name === templateName);
      if (template) {
        const tempDir = app.getPath('temp');
        const tempDocx = path.join(tempDir, `pdf_${Date.now()}.docx`);
        const filled = fillDocx(template.path, resumeData, tempDocx, layoutAdjustments);
        if (filled) {
          const result = await mammoth.convertToHtml({ path: tempDocx });
          html = result.value;
          try { fs.unlinkSync(tempDocx); } catch (e) {}
        }
      }
    }
    if (!html) {
      // Fallback: capture main window content
      html = '<p>简历内容</p>';
    }

    // Create HTML document with proper print styling
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 0; size: A4; }
        body { margin: 0; padding: 40px; font-family: SimSun, serif; }
        table { border-collapse: collapse; width: 100%; }
        img { max-width: 100%; }
      </style></head><body>${html}</body></html>`;

    const tempHtml = path.join(app.getPath('temp'), `pdf_${Date.now()}.html`);
    fs.writeFileSync(tempHtml, fullHtml, 'utf-8');

    // Create hidden window and print to PDF
    const pdfWindow = new BrowserWindow({
      width: 794, height: 1123, show: false, webPreferences: { contextIsolation: false }
    });
    await pdfWindow.loadFile(tempHtml);
    const pdfData = await pdfWindow.webContents.printToPDF({
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      pageSize: 'A4', printBackground: true, landscape: false, displayHeaderFooter: false
    });
    pdfWindow.close();

    try { fs.unlinkSync(tempHtml); } catch (e) {}

    fs.writeFile(filePath, pdfData, (err) => {
      if (err) { event.reply('pdf-failed', 'PDF 写入失败'); return; }
      event.reply('pdf-saved', `PDF 已导出: ${path.basename(filePath)}`);
    });
  } catch (e) {
    console.error('PDF error:', e);
    event.reply('pdf-failed', 'PDF 生成失败: ' + e.message);
  }
});
