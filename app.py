import sys
import os
import json
import re
import urllib.request
import threading
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QTextBrowser, QLabel, QLineEdit, QTextEdit, QPushButton, 
    QComboBox, QSlider, QScrollArea, QFileDialog, QMessageBox, 
    QGroupBox, QFormLayout, QTableWidget, QTableWidgetItem, QHeaderView,
    QTabWidget, QCheckBox, QInputDialog
)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QFont, QTextDocument, QColor, QPalette, QDesktopServices
from PyQt6.QtCore import QUrl
from utils.aiParser import parseWithLocalRules, DEFAULT_RESUME_DATA
from utils.docx_filler import fill_docx_template

CURRENT_VERSION = "v1.0.0"

class NativeResumeApp(QMainWindow):
    def __init__(self):
        super().__init__()
        # 1. 核心状态：结构化简历数据
        self.resume_data = copy_data(DEFAULT_RESUME_DATA)
        self.theme_color = "#1e3a8a" # 默认黛蓝
        self.selected_template = "minimalist"
        
        # GitHub 自适应更新配置路径 (持久化本地 json)
        self.config_path = os.path.expanduser("~/.gemini_resume_config.json")
        self.github_user = "zhouyufeng"  # 默认GitHub用户名，可自适应修改
        self.github_repo = "resume-generator" # 默认仓库名
        self.load_github_config()
        
        # 扫描本地“1 单页简历”目录下的103套Word模板
        self.word_templates_dir = "/Users/zhouyufeng/Downloads/1 单页简历"
        self.docx_files = self.scan_local_docx_templates()
        
        # 初始化UI
        self.init_ui()
        self.update_preview()
        
        # 启动时后台静默检查更新，提供极为 premium 的体验
        threading.Thread(target=self.silent_check_update, daemon=True).start()

    def scan_local_docx_templates(self):
        """
        自动扫描用户本地的“1 单页简历”目录，读取所有的 100 多套真实 .docx 模板
        """
        if not os.path.exists(self.word_templates_dir):
            return ["极简单页01.docx", "稳重单页01.docx", "简约单页02.docx", "活泼单页01.docx", "文艺单页03.docx"]
        try:
            files = [f for f in os.listdir(self.word_templates_dir) if f.endswith('.docx') and not f.startswith('~$')]
            files.sort()
            return files
        except Exception:
            return ["极简单页01.docx", "稳重单页01.docx", "简约单页02.docx", "活泼单页01.docx", "文艺单页03.docx"]

    def load_github_config(self):
        """
        加载本地的持久化配置，若不存在则创建默认值
        """
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
                    self.github_user = cfg.get("github_user", self.github_user)
                    self.github_repo = cfg.get("github_repo", self.github_repo)
            except Exception:
                pass
        else:
            self.save_github_config()

    def save_github_config(self):
        """
        持久化保存用户的 GitHub 仓库配置
        """
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "github_user": self.github_user,
                    "github_repo": self.github_repo
                }, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def init_ui(self):
        self.setWindowTitle("智能简历生成器 | macOS 原生纯软件客户端")
        self.resize(1300, 860)
        self.setMinimumSize(1024, 700)
        
        # 设置 macOS 高级暗色调 QSS 样式表 (WOW Aesthetics)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #0b0f19;
            }
            QWidget {
                color: #f3f4f6;
                font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
            }
            QGroupBox {
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 8px;
                margin-top: 10px;
                padding-top: 15px;
                background-color: rgba(17, 25, 40, 0.4);
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 3px 0 3px;
                font-weight: bold;
                color: #3b82f6;
            }
            QLineEdit, QTextEdit {
                background-color: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 6px;
                padding: 6px;
                color: #ffffff;
            }
            QLineEdit:focus, QTextEdit:focus {
                border: 1px solid #3b82f6;
            }
            QPushButton {
                background-color: #2563eb;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-weight: bold;
                color: #ffffff;
            }
            QPushButton:hover {
                background-color: #1d4ed8;
            }
            QPushButton:pressed {
                background-color: #1e40af;
            }
            QSlider::groove:horizontal {
                border: 1px solid #262626;
                height: 4px;
                background: rgba(255, 255, 255, 0.08);
                margin: 2px 0;
            }
            QSlider::handle:horizontal {
                background: #3b82f6;
                border: 1px solid #3b82f6;
                width: 12px;
                height: 12px;
                margin: -4px 0;
                border-radius: 6px;
            }
        """)

        # 主窗口中央 Widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(15, 15, 15, 15)
        main_layout.setSpacing(15)

        # ==========================================================================
        # 👈 左半部分：原生表单与控制区 (占 45%)
        # ==========================================================================
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        left_layout.setContentsMargins(0, 0, 0, 0)
        
        # 选项卡控件 (AI 智能录入 vs 经历表单编辑)
        self.tab_widget = QTabWidget()
        left_layout.addWidget(self.tab_widget)
        
        # Tab 1: AI 智能录入
        ai_tab = QWidget()
        ai_layout = QVBoxLayout(ai_tab)
        ai_label = QLabel("直接粘贴 AI 聊天的简历原稿，点击一键提取，本地算法将瞬间抽取并填入表单：")
        ai_label.setWordWrap(True)
        ai_layout.addWidget(ai_label)
        
        self.ai_input = QTextEdit()
        self.ai_input.setPlaceholderText("例如：我叫李明，硕士毕业于复旦大学计算机系... 2025年在阿里做过一个高并发大屏项目...")
        ai_layout.addWidget(self.ai_input)
        
        self.btn_ai_extract = QPushButton("✨ 一键本地智能提取文稿")
        self.btn_ai_extract.clicked.connect(self.handle_ai_extract)
        ai_layout.addWidget(self.btn_ai_extract)
        self.tab_widget.addTab(ai_tab, "AI 录入")
        
        # Tab 2: 可视化经历表单
        form_tab = QWidget()
        form_scroll = QScrollArea()
        form_scroll.setWidgetResizable(True)
        form_scroll.setFrameShape(QScrollArea.FrameShape.NoFrame)
        form_scroll_widget = QWidget()
        form_layout = QVBoxLayout(form_scroll_widget)
        
        # 1. 个人基本信息
        basic_group = QGroupBox("👨 个人基本信息")
        basic_form = QFormLayout(basic_group)
        self.input_name = QLineEdit()
        self.input_name.textChanged.connect(lambda v: self.update_basic('name', v))
        basic_form.addRow("姓名:", self.input_name)
        
        self.input_title = QLineEdit()
        self.input_title.textChanged.connect(lambda v: self.update_basic('title', v))
        basic_form.addRow("意向岗位:", self.input_title)
        
        self.input_phone = QLineEdit()
        self.input_phone.textChanged.connect(lambda v: self.update_basic('phone', v))
        basic_form.addRow("电话:", self.input_phone)
        
        self.input_email = QLineEdit()
        self.input_email.textChanged.connect(lambda v: self.update_basic('email', v))
        basic_form.addRow("邮箱:", self.input_email)
        
        self.input_wechat = QLineEdit()
        self.input_wechat.textChanged.connect(lambda v: self.update_basic('wechat', v))
        basic_form.addRow("微信:", self.input_wechat)
        
        self.input_summary = QTextEdit()
        self.input_summary.setFixedHeight(60)
        self.input_summary.textChanged.connect(lambda: self.update_basic('summary', self.input_summary.toPlainText()))
        basic_form.addRow("自我总结:", self.input_summary)
        form_layout.addWidget(basic_group)

        # 2. 经历表格管理器 (教育、工作、项目)
        self.create_experience_table(form_layout, "💼 历任履历", "experience")
        self.create_experience_table(form_layout, "🚀 专研项目", "projects")
        self.create_experience_table(form_layout, "🎓 修业背景", "education")
        
        form_scroll.setWidget(form_scroll_widget)
        form_layout_tab = QVBoxLayout(form_tab)
        form_layout_tab.addWidget(form_scroll)
        self.tab_widget.addTab(form_tab, "经历编辑")

        # 填充初始默认值
        self.load_resume_to_inputs()

        # ==========================================================================
        # 👉 右半部分：1:1 A4 富文本高真悬浮画布与单页调节滑块 (占 55%)
        # ==========================================================================
        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)
        right_layout.setContentsMargins(0, 0, 0, 0)
        
        # 顶部操作与模板选择栏
        top_ctrl = QHBoxLayout()
        top_ctrl.addWidget(QLabel("Word 模板 (103套均可选用):"))
        
        self.tmpl_combo = QComboBox()
        self.tmpl_combo.addItems(self.docx_files)
        self.tmpl_combo.currentTextChanged.connect(self.handle_template_change)
        top_ctrl.addWidget(self.tmpl_combo)
        
        self.btn_export_word = QPushButton("💾 导出 Word (.docx)")
        self.btn_export_word.setStyleSheet("background-color: #2563eb;")
        self.btn_export_word.clicked.connect(self.handle_export_word)
        top_ctrl.addWidget(self.btn_export_word)
        
        self.btn_export_pdf = QPushButton("📄 导出 PDF 简历")
        self.btn_export_pdf.setStyleSheet("background-color: #10b981;")
        self.btn_export_pdf.clicked.connect(self.handle_export_pdf)
        top_ctrl.addWidget(self.btn_export_pdf)
        
        # 🔄 新增：自动检查更新按钮与GitHub仓库配置按钮
        self.btn_check_update = QPushButton(f"🔄 检查更新 ({CURRENT_VERSION})")
        self.btn_check_update.setStyleSheet("background-color: rgba(255,255,255,0.06); color: #f3f4f6; padding: 5px;")
        self.btn_check_update.clicked.connect(self.handle_manual_check_update)
        top_ctrl.addWidget(self.btn_check_update)

        self.btn_config_git = QPushButton("⚙️")
        self.btn_config_git.setToolTip("配置您的 GitHub 仓库源")
        self.btn_config_git.setStyleSheet("background-color: rgba(255,255,255,0.04); font-size: 14px; padding: 5px;")
        self.btn_config_git.clicked.connect(self.handle_config_github)
        top_ctrl.addWidget(self.btn_config_git)
        
        right_layout.addLayout(top_ctrl)

        # A4 高真画布预览器
        self.preview_canvas = QTextBrowser()
        self.preview_canvas.setStyleSheet("background-color: #ffffff; color: #1f2937; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);")
        right_layout.addWidget(self.preview_canvas)

        # 智能单页微调控制台
        fit_group = QGroupBox("⚙️ 智能单页自适应微调 (自动调节 + 处女座像素级手动)")
        fit_layout = QHBoxLayout(fit_group)
        
        # 字号微调
        self.check_auto_fit = QCheckBox("强制保持在一页内")
        self.check_auto_fit.setChecked(True)
        self.check_auto_fit.stateChanged.connect(self.update_preview)
        fit_layout.addWidget(self.check_auto_fit)
        
        self.slide_font = QSlider(Qt.Orientation.Horizontal)
        self.slide_font.setRange(11, 16)
        self.slide_font.setValue(14)
        self.slide_font.valueChanged.connect(self.update_preview)
        fit_layout.addWidget(QLabel("字号:"))
        fit_layout.addWidget(self.slide_font)
        
        self.slide_line = QSlider(Qt.Orientation.Horizontal)
        self.slide_line.setRange(12, 18)
        self.slide_line.setValue(15)
        self.slide_line.valueChanged.connect(self.update_preview)
        fit_layout.addWidget(QLabel("行距:"))
        fit_layout.addWidget(self.slide_line)
        
        right_layout.addWidget(fit_group)

        # 装载左右两端布局
        main_layout.addWidget(left_widget, 45)
        main_layout.addWidget(right_widget, 55)

    def create_experience_table(self, parent_layout, title, type_name):
        group = QGroupBox(title)
        vbox = QVBoxLayout(group)
        
        table = QTableWidget(0, 4)
        table.setHorizontalHeaderLabels(["名称/机构", "角色/专业", "起止时间", "描述详情"])
        table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        table.setFixedHeight(120)
        table.setStyleSheet("QTableWidget { background-color: rgba(0,0,0,0.2); }")
        vbox.addWidget(table)
        
        ctrls = QHBoxLayout()
        btn_add = QPushButton("➕ 添加")
        btn_add.clicked.connect(lambda: self.add_table_row(table, type_name))
        ctrls.addWidget(btn_add)
        
        btn_del = QPushButton("➖ 删除")
        btn_del.clicked.connect(lambda: self.del_table_row(table, type_name))
        ctrls.addWidget(btn_del)
        
        btn_up = QPushButton("▲ 上移")
        btn_up.clicked.connect(lambda: self.move_table_row(table, type_name, -1))
        ctrls.addWidget(btn_up)
        
        btn_down = QPushButton("▼ 下移")
        btn_down.clicked.connect(lambda: self.move_table_row(table, type_name, 1))
        ctrls.addWidget(btn_down)
        
        vbox.addLayout(ctrls)
        parent_layout.addWidget(group)
        
        setattr(self, f"table_{type_name}", table)

    # ==========================================================================
    # 数据与表单同步核心方法
    # ==========================================================================
    def load_resume_to_inputs(self):
        basic = self.resume_data['basicInfo']
        self.input_name.setText(basic.get('name', ''))
        self.input_title.setText(basic.get('title', ''))
        self.input_phone.setText(basic.get('phone', ''))
        self.input_email.setText(basic.get('email', ''))
        self.input_wechat.setText(basic.get('wechat', ''))
        self.input_summary.setPlainText(basic.get('summary', ''))
        
        self.fill_table_from_data("experience", self.resume_data['experience'])
        self.fill_table_from_data("projects", self.resume_data['projects'])
        self.fill_table_from_data("education", self.resume_data['education'])

    def fill_table_from_data(self, type_name, arr):
        table = getattr(self, f"table_{type_name}")
        table.setRowCount(0)
        table.blockSignals(True)
        for idx, item in enumerate(arr):
            table.insertRow(idx)
            if type_name == "education":
                table.setItem(idx, 0, QTableWidgetItem(item.get('school', '')))
                table.setItem(idx, 1, QTableWidgetItem(item.get('major', '') + " (" + item.get('degree', '') + ")"))
            elif type_name == "experience":
                table.setItem(idx, 0, QTableWidgetItem(item.get('company', '')))
                table.setItem(idx, 1, QTableWidgetItem(item.get('role', '')))
            else:
                table.setItem(idx, 0, QTableWidgetItem(item.get('name', '')))
                table.setItem(idx, 1, QTableWidgetItem(item.get('role', '')))
                
            table.setItem(idx, 2, QTableWidgetItem(item.get('date', '')))
            table.setItem(idx, 3, QTableWidgetItem(item.get('description', '')))
            
        table.blockSignals(False)
        table.itemChanged.connect(lambda: self.sync_table_to_data(type_name))

    def sync_table_to_data(self, type_name):
        table = getattr(self, f"table_{type_name}")
        new_list = []
        for r in range(table.rowCount()):
            c0 = table.item(r, 0).text() if table.item(r, 0) else ""
            c1 = table.item(r, 1).text() if table.item(r, 1) else ""
            c2 = table.item(r, 2).text() if table.item(r, 2) else ""
            c3 = table.item(r, 3).text() if table.item(r, 3) else ""
            
            if type_name == "education":
                degree = "本科"
                major = c1
                if " (" in c1:
                    parts = c1.split(" (")
                    major = parts[0]
                    degree = parts[1].replace(")", "")
                new_list.append({"school": c0, "major": major, "degree": degree, "date": c2, "description": c3})
            elif type_name == "experience":
                new_list.append({"company": c0, "role": c1, "date": c2, "description": c3})
            else:
                new_list.append({"name": c0, "role": c1, "date": c2, "description": c3})
                
        self.resume_data[type_name] = new_list
        self.update_preview()

    def add_table_row(self, table, type_name):
        row = table.rowCount()
        table.insertRow(row)
        table.setItem(row, 0, QTableWidgetItem("新栏目大项"))
        table.setItem(row, 1, QTableWidgetItem("职责职位"))
        table.setItem(row, 2, QTableWidgetItem("2024.01 - 至今"))
        table.setItem(row, 3, QTableWidgetItem("主要业绩要点..."))
        self.sync_table_to_data(type_name)

    def del_table_row(self, table, type_name):
        curr = table.currentRow()
        if curr >= 0:
            table.removeRow(curr)
            self.sync_table_to_data(type_name)

    def move_table_row(self, table, type_name, direction):
        curr = table.currentRow()
        if curr < 0: return
        target = curr + direction
        if target < 0 or target >= table.rowCount(): return
        
        for c in range(table.columnCount()):
            item1 = table.takeItem(curr, c)
            item2 = table.takeItem(target, c)
            table.setItem(curr, c, item2)
            table.setItem(target, c, item1)
            
        table.setCurrentCell(target, 0)
        self.sync_table_to_data(type_name)

    def update_basic(self, field, val):
        self.resume_data['basicInfo'][field] = val
        self.update_preview()

    # ==========================================================================
    # AI 智能提取与模板变化
    # ==========================================================================
    def handle_ai_extract(self):
        text = self.ai_input.toPlainText().strip()
        if not text: return
        
        parsed = parseWithLocalRules(text)
        self.resume_data = parsed
        
        self.load_resume_to_inputs()
        QMessageBox.information(self, "AI 大捷", "AI 简历原稿本地智能抽取大成功！已自动为您填入表格。")
        self.tab_widget.setCurrentIndex(1)

    def handle_template_change(self, docx_name):
        if "稳重" in docx_name or "知页" in docx_name:
            self.selected_template = "classic"
            self.theme_color = "#1e3a8a"
        elif "简约" in docx_name:
            self.selected_template = "modern"
            self.theme_color = "#0f766e"
        elif "活泼" in docx_name:
            self.selected_template = "vibrant"
            self.theme_color = "#991b1b"
        elif "文艺" in docx_name:
            self.selected_template = "elegant"
            self.theme_color = "#5c3ea3"
        else:
            self.selected_template = "minimalist"
            self.theme_color = "#374151"
            
        self.update_preview()

    # ==========================================================================
    # 🎨 核心：1:1 A4 富文本高拟真预览渲染 (纯原生，0% 网页痕迹)
    # ==========================================================================
    def update_preview(self):
        font_size = self.slide_font.value()
        line_height = self.slide_line.value() / 10.0
        html_content = self.generate_preview_html(font_size, line_height)
        self.preview_canvas.setHtml(html_content)

    def generate_preview_html(self, fs, lh):
        basic = self.resume_data['basicInfo']
        edus = self.resume_data['education']
        exps = self.resume_data['experience']
        projs = self.resume_data['projects']
        skills = self.resume_data['skills']

        total_len = len(json.dumps(self.resume_data))
        if self.check_auto_fit.isChecked() and total_len > 1200:
            fs = max(11, fs - 2)
            lh = max(1.2, lh - 0.25)

        css_theme = f"""
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
                    padding: 10px;
                    color: #1f2937;
                    font-size: {fs}px;
                    line-height: {lh};
                }}
                h1 {{ font-size: {fs * 2.0}px; font-weight: 800; color: #111827; margin: 0 0 5px 0; }}
                h2.section-title {{ 
                    font-size: {fs * 1.1}px; 
                    font-weight: 700; 
                    color: {self.theme_color}; 
                    border-bottom: 2px solid {self.theme_color};
                    padding-bottom: 2px;
                    margin-top: 15px;
                    margin-bottom: 8px;
                }}
                .row {{ display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 2px; }}
                .subrow {{ display: flex; justify-content: space-between; color: #4b5563; font-size: 90%; font-weight: 600; margin-bottom: 3px; }}
                .desc {{ color: #4b5563; font-size: 88%; text-align: justify; margin-bottom: 8px; white-space: pre-line; }}
            </style>
        """

        body_html = ""
        
        if self.selected_template == "minimalist":
            body_html = f"""
            <div style="border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td valign="bottom">
                            <h1>{basic.get('name', '姓名')}</h1>
                            <div style="color: {self.theme_color}; font-weight: bold; font-size: 110%;">{basic.get('title', '求职岗')}</div>
                        </td>
                        <td align="right" valign="bottom" style="color: #4b5563; font-size: 90%; line-height: 1.4;">
                            {f"📱 {basic['phone']}<br/>" if basic.get('phone') else ""}
                            {f"✉️ {basic['email']}<br/>" if basic.get('email') else ""}
                            {f"💬 微信: {basic['wechat']}" if basic.get('wechat') else ""}
                        </td>
                    </tr>
                </table>
            </div>
            """
        elif self.selected_template == "classic":
            body_html = f"""
            <div style="background-color: {self.theme_color}; color: #ffffff; padding: 18px; margin: -10px -10px 15px -10px; border-radius: 4px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td>
                            <div style="font-size: 24px; font-weight: 800;">{basic.get('name', '姓名')}</div>
                            <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">🎯 {basic.get('title', '求职意向')}</div>
                        </td>
                        <td align="right" style="font-size: 12px; opacity: 0.95; line-height: 1.5;">
                            {f"电话: {basic['phone']}<br/>" if basic.get('phone') else ""}
                            {f"邮箱: {basic['email']}<br/>" if basic.get('email') else ""}
                            {f"微信: {basic['wechat']}" if basic.get('wechat') else ""}
                        </td>
                    </tr>
                </table>
            </div>
            """
        elif self.selected_template == "elegant":
            css_theme = css_theme.replace("sans-serif", "Georgia, 'Noto Serif SC', serif")
            body_html = f"""
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 26px; font-weight: bold; letter-spacing: 4px;">{basic.get('name', '姓名')}</div>
                <div style="font-size: 13px; color: {self.theme_color}; font-weight: bold; letter-spacing: 2px; margin-top: 4px;">♦ {basic.get('title', '意向')} ♦</div>
                <div style="font-size: 12px; color: #4b5563; margin-top: 6px; letter-spacing: 0.5px;">
                    {f"联络: {basic['phone']}  |  " if basic.get('phone') else ""}
                    {f"邮存: {basic['email']}  |  " if basic.get('email') else ""}
                    {f"微信: {basic['wechat']}" if basic.get('wechat') else ""}
                </div>
            </div>
            """
        else:
            body_html = f"""
            <div style="border-bottom: 3.5px solid {self.theme_color}; padding-bottom: 8px; margin-bottom: 12px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td>
                            <div style="font-size: 22px; font-weight: 800; color: #111827;">{basic.get('name', '姓名')}</div>
                            <div style="background-color: {self.theme_color}; color: #ffffff; display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; margin-top: 4px;">🎯 {basic.get('title', '求职岗')}</div>
                        </td>
                        <td align="right" style="color: #374151; font-size: 12px; line-height: 1.5;">
                            {f"📱 电话: {basic['phone']}<br/>" if basic.get('phone') else ""}
                            {f"✉️ 邮箱: {basic['email']}<br/>" if basic.get('email') else ""}
                            {f"💬 微信: {basic['wechat']}" if basic.get('wechat') else ""}
                        </td>
                    </tr>
                </table>
            </div>
            """

        if basic.get('summary'):
            body_html += f"""
            <div>
                <h2 class="section-title">🌟 自我总结</h2>
                <div class="desc">{basic['summary']}</div>
            </div>
            """

        if exps:
            body_html += '<div><h2 class="section-title">💼 工作经历</h2>'
            for exp in exps:
                desc_formatted = exp.get('description', '').replace('\n', '<br/>▪ ')
                body_html += f"""
                <div style="margin-bottom: 6px;">
                    <div class="row"><span>{exp.get('company', '')}</span><span>{exp.get('date', '')}</span></div>
                    <div class="subrow"><span>{exp.get('role', '')}</span></div>
                    <div class="desc">▪ {desc_formatted}</div>
                </div>
                """
            body_html += '</div>'

        if projs:
            body_html += '<div><h2 class="section-title">🚀 项目经验</h2>'
            for proj in projs:
                desc_formatted = proj.get('description', '').replace('\n', '<br/>▪ ')
                body_html += f"""
                <div style="margin-bottom: 6px;">
                    <div class="row"><span>{proj.get('name', '')}</span><span>{proj.get('date', '')}</span></div>
                    <div class="subrow"><span>{proj.get('role', '')}</span></div>
                    <div class="desc">▪ {desc_formatted}</div>
                </div>
                """
            body_html += '</div>'

        if edus:
            body_html += '<div><h2 class="section-title">🎓 教育经历</h2>'
            for edu in edus:
                body_html += f"""
                <div style="margin-bottom: 5px;">
                    <div class="row"><span>{edu.get('school', '')}</span><span>{edu.get('date', '')}</span></div>
                    <div class="subrow"><span>{edu.get('major', '')} ({edu.get('degree', '')})</span></div>
                </div>
                """
            body_html += '</div>'

        if skills:
            body_html += '<div><h2 class="section-title">🛠️ 专业技能</h2>'
            if self.selected_template == "vibrant":
                skills_span = "".join([f'<span style="display:inline-block; background-color:rgba(59,130,246,0.06); padding:2px 8px; border-radius:10px; margin:2px; font-size:90%; color:{self.theme_color}; font-weight:bold;">⚡ {s}</span>' for s in skills])
                body_html += f'<div style="margin-top: 5px;">{skills_span}</div>'
            else:
                skills_p = "<br/>".join([f"▪ {s}" for s in skills])
                body_html += f'<div class="desc" style="margin-top: 4px;">{skills_p}</div>'
            body_html += '</div>'

        return f"<html>{css_theme}<body>{body_html}</body></html>"

    # ==========================================================================
    # 💾 核心：调用 Python 大脑进行一键万能 Word 填充与经历克隆导出
    # ==========================================================================
    def handle_export_word(self):
        default_name = f"{self.resume_data['basicInfo'].get('name', '我的')}_求职简历.docx"
        file_path, _ = QFileDialog.getSaveFileName(
            self, "一键语义套用并导出 Word 简历", 
            os.path.expanduser(f"~/Downloads/{default_name}"), 
            "Word 文档 (*.docx)"
        )
        if not file_path: return
        
        temp_json = "/tmp/temp_resume_data.json"
        try:
            with open(temp_json, 'w', encoding='utf-8') as f:
                json.dump(self.resume_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            QMessageBox.critical(self, "错误", f"导出临时数据失败: {str(e)}")
            return
            
        selected_tmpl_name = self.tmpl_combo.currentText()
        template_abs_path = os.path.join(self.word_templates_dir, selected_tmpl_name)
        
        try:
            success = fill_docx_template(temp_json, template_abs_path, file_path)
            if success:
                QMessageBox.information(
                    self, "一键套用大捷", 
                    f"🎉 成功套用【{selected_tmpl_name}】真实 Word 模板并克隆经历！\n已完美生成可二次修改的 DOCX 文件输出至：\n{os.path.basename(file_path)}\n\n您可以放心用 Word 随意手动修改了！"
                )
        except Exception as err:
            QMessageBox.critical(self, "万能Word克隆失败", f"填充错误：{str(err)}")
        finally:
            if os.path.exists(temp_json): os.remove(temp_json)

    def handle_export_pdf(self):
        default_name = f"{self.resume_data['basicInfo'].get('name', '我的')}_求职简历.pdf"
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出高保真 PDF 简历", 
            os.path.expanduser(f"~/Downloads/{default_name}"), 
            "PDF 文档 (*.pdf)"
        )
        if not file_path: return
        
        try:
            doc = self.preview_canvas.document()
            doc.setPageSize(QSize(794, 1123))
            doc.printToPdf(file_path)
            QMessageBox.information(self, "导出成功", f"🎉 高清 A4 单页 PDF 简历已成功写入：\n{os.path.basename(file_path)}")
        except Exception as err:
            QMessageBox.critical(self, "PDF 导出失败", f"导出 PDF 发生未知错误：{str(err)}")

    # ==========================================================================
    # 🔄 智能亮点：GitHub 自动检测更新系统 (Urllib 异步获取)
    # ==========================================================================
    def handle_config_github(self):
        """
        弹出对话框，允许用户配置他们推送到 GitHub 上的自定义“用户名”和“仓库名”
        """
        user, ok1 = QInputDialog.getText(self, "配置 GitHub 仓库源", "请输入您的 GitHub 用户名:", QLineEdit.EchoMode.Normal, self.github_user)
        if not ok1 or not user.strip(): return
        
        repo, ok2 = QInputDialog.getText(self, "配置 GitHub 仓库源", "请输入您的 GitHub 仓库名称:", QLineEdit.EchoMode.Normal, self.github_repo)
        if not ok2 or not repo.strip(): return
        
        self.github_user = user.strip()
        self.github_repo = repo.strip()
        self.save_github_config()
        QMessageBox.information(self, "配置成功", f"已成功绑定更新源为：\nhttps://github.com/{self.github_user}/{self.github_repo}")
        
    def handle_manual_check_update(self):
        """
        手动点击“检查更新”按钮
        """
        QMessageBox.information(self, "正在检测", "正在与 GitHub Release 库通信，请稍候...")
        threading.Thread(target=self.run_update_check, args=(True,), daemon=True).start()

    def silent_check_update(self):
        """
        启动时静默检查更新
        """
        self.run_update_check(manual=False)

    def run_update_check(self, manual=False):
        """
        核心检查更新逻辑：获取 github 上的 latest release tag_name 并作语义对比
        """
        api_url = f"https://api.github.com/repos/{self.github_user}/{self.github_repo}/releases/latest"
        req = urllib.request.Request(
            api_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
        )
        
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    res_body = response.read().decode('utf-8')
                    latest_release = json.loads(res_body)
                    
                    latest_tag = latest_release.get("tag_name", "").strip()
                    html_url = latest_release.get("html_url", f"https://github.com/{self.github_user}/{self.github_repo}/releases")
                    body = latest_release.get("body", "无更新日志")
                    
                    if not latest_tag:
                        if manual: self.show_msg_box("提示", "未在当前 GitHub 仓库找到任何已发布版本。")
                        return

                    # 版本号语义比对 (v1.0.0 vs v1.1.0)
                    v_local = parse_version(CURRENT_VERSION)
                    v_remote = parse_version(latest_tag)
                    
                    if v_remote > v_local:
                        # 发现新版本！在主线程中弹出漂亮的对话框
                        msg = f"🎉 发现全新版本：{latest_tag} ！\n\n【更新日志】：\n{body}\n\n是否立即前往 GitHub 仓库下载最新 DMG 原生安装包？"
                        self.show_update_dialog("提示：有新版本可用", msg, html_url)
                    else:
                        if manual:
                            self.show_msg_box("检测结果", f"✅ 恭喜！您当前运行的版本 ({CURRENT_VERSION}) 已经是最新版，无需更新！")
                else:
                    if manual: self.show_msg_box("网络错误", "请求更新源失败，请确认 GitHub 仓库已设置为公开(Public)且推送到位！")
        except Exception as err:
            print("检查更新出错:", err)
            if manual: self.show_msg_box("连接失败", "无法连接至 GitHub，请检查您的网络连接或代理设置！")

    def show_msg_box(self, title, msg):
        # 线程安全弹出
        from PyQt6.QtCore import QMetaObject, Q_ARG
        QMetaObject.invokeMethod(self, "display_info", Qt.ConnectionType.QueuedConnection, Q_ARG(str, title), Q_ARG(str, msg))

    def show_update_dialog(self, title, msg, url):
        from PyQt6.QtCore import QMetaObject, Q_ARG
        QMetaObject.invokeMethod(self, "display_update", Qt.ConnectionType.QueuedConnection, Q_ARG(str, title), Q_ARG(str, msg), Q_ARG(str, url))

    # PyQt 线程安全槽函数
    from PyQt6.QtCore import pyqtSlot
    @pyqtSlot(str, str)
    def display_info(self, title, msg):
        QMessageBox.information(self, title, msg)

    @pyqtSlot(str, str, str)
    def display_update(self, title, msg, url):
        reply = QMessageBox.question(self, title, msg, QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if reply == QMessageBox.StandardButton.Yes:
            # 原生拉起 macOS 默认浏览器前往 GitHub 最新发布下载页面！
            QDesktopServices.openUrl(QUrl(url))

def parse_version(v_str):
    """
    语义化版本解析器，将 v1.0.0 规范为数字三元组 (1, 0, 0)
    """
    clean = re.sub(r'^[vV]', '', v_str.strip())
    parts = clean.split('.')
    try:
        return tuple(int(x) for x in parts)
    except Exception:
        return (0, 0, 0)

def copy_data(d):
    return json.loads(json.dumps(d))

if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    app.setStyle('Fusion')
    palette = QPalette()
    palette.setColor(QPalette.ColorRole.Window, QColor('#0b0f19'))
    palette.setColor(QPalette.ColorRole.WindowText, QColor('#f3f4f6'))
    app.setPalette(palette)
    
    mainWin = NativeResumeApp()
    mainWin.show()
    sys.exit(app.exec())
