# 智能简历生成器

基于 `~/Downloads/1 单页简历/` 目录下的 Word 模板，将 AI 生成的简历文稿自动套模板、预览效果，并确保内容控制在一页内的 macOS 桌面应用。

## 技术栈

- **Electron 桌面端**: electron-main.cjs + React 19 前端
- **PyQt6 原生版**: app.py，纯 Python 离线桌面应用
- **构建工具**: Vite 5 (前端), electron-builder (DMG), PyInstaller (原生版)
- **Word 模板引擎**: python-docx (OpenXML 节点克隆填充)

## 版本

项目包含两个版本，代码在同一个仓库中：

| 版本 | 入口 | 构建方式 | 产物路径 |
|------|------|----------|----------|
| Electron 版 | electron-main.cjs | `npm run dist` | dist-desktop/*.dmg |
| PyQt6 原生版 | app.py | PyInstaller | dist-desktop/mac-native/*.dmg |

## 快速启动

```bash
# Electron 版开发模式
cd resume-generator
npm install
npm run dev

# PyQt6 原生版
python3 app.py
```

## 打包

```bash
# Electron DMG
cd resume-generator
npm run dist

# PyQt6 原生 DMG
cd resume-generator
pyinstaller --noconfirm --windowed --name="智能简历生成器" --clean app.py
hdiutil create -fs HFS+ -srcfolder "dist/智能简历生成器.app" -volname "智能简历生成器安装盘" "dist-desktop/mac-native/智能简历生成器-原生版.dmg"
```

或双击工作区根目录的 `.command` 文件一键打包。

## 功能

- AI 智能简历解析（支持 LLM API 和本地规则备用解析器）
- 5 套预览模板（极简、稳重、简约、活泼、文艺）
- 4 色调色盘
- 智能单页自适应算法（自动收缩/扩展字号、行高、间距）
- PDF 一键导出
- Word 套模板导出（基于本地 docx 模板的 OpenXML 克隆填充）
- GitHub Releases 自动更新

## 自动更新

Electron 版使用 `electron-updater`，从 GitHub Releases 自动检测并下载更新。
PyQt6 原生版内置 GitHub API 检查更新逻辑。

## 项目结构

```
resume-generator/
├── app.py                    # PyQt6 原生桌面应用
├── electron-main.cjs         # Electron 主进程
├── preload.js                # Electron preload 桥接
├── package.json              # 前端依赖和构建脚本
├── vite.config.js            # Vite 配置
├── index.html                # Vite 入口
├── src/
│   ├── App.jsx               # 主 React 组件
│   ├── main.jsx              # React 入口
│   ├── index.css             # 设计系统样式
│   ├── components/           # React 组件
│   │   ├── EditorPanel.jsx
│   │   ├── PreviewPanel.jsx
│   │   ├── TemplatePanel.jsx
│   │   ├── ResumeTemplates.jsx
│   │   └── UpdateNotification.jsx
│   └── utils/
│       ├── aiParser.js       # AI 简历解析引擎
│       └── docx_filler.py    # Word 模板填充引擎
├── dist/                     # PyInstaller 构建产物
└── dist-desktop/             # electron-builder 构建产物
```
