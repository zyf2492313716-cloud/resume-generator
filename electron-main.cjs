const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// 遵循 UTF-8 与简体中文编码标准
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==========================================================================
// 1. IPC：一键完美 PDF 原生存盘引擎
// ==========================================================================
ipcMain.on('print-to-pdf', async (event, defaultFileName) => {
  if (!mainWindow) return;

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '一键导出高保真 PDF 简历',
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
        event.reply('pdf-failed', 'PDF 写入本地磁盘失败，请检查文件夹权限！');
        return;
      }
      event.reply('pdf-saved', `简历已成功导出至：${path.basename(filePath)}`);
    });

  } catch (pdfErr) {
    event.reply('pdf-failed', '生成 PDF 过程发生未知内核冲突，请重试！');
  }
});

// ==========================================================================
// 2. 🌟 核心亮点：IPC 一键套用并导出可编辑 Word (.docx) 引擎 (Python 联动)
// ==========================================================================
ipcMain.on('export-to-word', async (event, { templateName, resumeData }) => {
  if (!mainWindow) return;

  // 1. 调起 macOS 原生保存文件对话框，保存后缀为 .docx
  const defaultName = `${resumeData.basicInfo.name || '我的'}_求职简历.docx`;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '套用模板并导出可二次修改的 Word 简历',
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters: [
      { name: 'Word 文档 (*.docx)', extensions: ['docx'] }
    ]
  });

  if (canceled || !filePath) {
    event.reply('word-failed', '导出已取消');
    return;
  }

  // 2. 在临时目录下写入一份 JSON 简历数据缓存
  const tempJsonPath = path.join(app.getPath('temp'), `temp_resume_${Date.now()}.json`);
  
  try {
    fs.writeFileSync(tempJsonPath, JSON.stringify(resumeData, null, 2), 'utf-8');
  } catch (writeErr) {
    console.error('临时 JSON 简历写入失败:', writeErr);
    event.reply('word-failed', '写入临时交换数据失败，请重试！');
    return;
  }

  // 3. 定位模板的绝对路径 (用户的“1 单页简历”目录)
  const templatePath = path.join('/Users/zhouyufeng/Downloads/1 单页简历', templateName);
  
  // 4. 定位 python3 填充脚本 docx_filler.py 的绝对路径
  const fillerScriptPath = path.join(__dirname, 'src/utils/docx_filler.py');

  // 5. 调用 Mac 本地的 Python3 环境，跨系统极速执行经历克隆与字词语义填充
  const execCmd = `python3 "${fillerScriptPath}" "${tempJsonPath}" "${templatePath}" "${filePath}"`;

  exec(execCmd, { encoding: 'utf-8' }, (error, stdout, stderr) => {
    // 销毁临时交换文件，维护磁盘洁净
    try {
      if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
    } catch (e) {}

    if (error) {
      console.error('Python 经历克隆填充引擎执行报错:', error);
      console.error('Stderr:', stderr);
      event.reply('word-failed', 'Word 克隆填充引擎执行出错，请确认模板文件未被占用或损坏！');
      return;
    }

    console.log('Python 脚本输出:', stdout);
    // 6. 发送大捷喜报，React 前端撒彩纸庆祝！
    event.reply('word-saved', `已套用模板生成并导出可二次编辑的 Word 简历：${path.basename(filePath)}`);
  });
});
