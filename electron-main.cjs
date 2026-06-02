const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    title: "智能简历生成器 | 一键套模板与智能单页自适应系统",
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
  if (mainWindow) {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available');
  }
});

autoUpdater.on('error', (err) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progress.percent);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version,
      releaseDate: info.releaseDate
    });
  }
});

ipcMain.on('restart-and-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('print-to-pdf', async (event, defaultFileName) => {
  if (!mainWindow) return;

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '导出 PDF 简历',
    defaultPath: path.join(app.getPath('downloads'), defaultFileName || '我的求职简历.pdf'),
    filters: [
      { name: 'PDF 文档 (*.pdf)', extensions: ['pdf'] }
    ]
  });

  if (canceled || !filePath) {
    event.reply('pdf-failed', '导出已取消');
    return;
  }

  try {
    const pdfOptions = {
      marginsType: 1,
      pageSize: 'A4',
      printBackground: true,
      landscape: false,
      displayHeaderFooter: false
    };

    const pdfData = await mainWindow.webContents.printToPDF(pdfOptions);

    fs.writeFile(filePath, pdfData, (err) => {
      if (err) {
        event.reply('pdf-failed', 'PDF 写入失败，请检查权限');
        return;
      }
      event.reply('pdf-saved', `简历已导出至: ${path.basename(filePath)}`);
    });

  } catch (pdfErr) {
    event.reply('pdf-failed', '生成 PDF 失败');
  }
});

ipcMain.on('export-to-word', async (event, { templateName, resumeData }) => {
  if (!mainWindow) return;

  const defaultName = `${resumeData.basicInfo.name || '我的'}_求职简历.docx`;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '套用模板导出 Word 简历',
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters: [
      { name: 'Word 文档 (*.docx)', extensions: ['docx'] }
    ]
  });

  if (canceled || !filePath) {
    event.reply('word-failed', '导出已取消');
    return;
  }

  const tempJsonPath = path.join(app.getPath('temp'), `temp_resume_${Date.now()}.json`);

  try {
    fs.writeFileSync(tempJsonPath, JSON.stringify(resumeData, null, 2), 'utf-8');
  } catch (writeErr) {
    console.error('临时文件写入失败:', writeErr);
    event.reply('word-failed', '写入临时数据失败');
    return;
  }

  const templatePath = path.join('/Users/zhouyufeng/Downloads/1 单页简历', templateName);
  const fillerScriptPath = path.join(__dirname, 'src/utils/docx_filler.py');
  const execCmd = `python3 "${fillerScriptPath}" "${tempJsonPath}" "${templatePath}" "${filePath}"`;

  exec(execCmd, { encoding: 'utf-8' }, (error, stdout, stderr) => {
    try {
      if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
    } catch (e) {}

    if (error) {
      console.error('Python 填充引擎报错:', error);
      console.error('Stderr:', stderr);
      event.reply('word-failed', 'Word 填充引擎执行出错');
      return;
    }

    console.log('Python 输出:', stdout);
    event.reply('word-saved', `已生成 Word 简历: ${path.basename(filePath)}`);
  });
});
