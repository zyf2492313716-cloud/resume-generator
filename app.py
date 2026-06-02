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
        self.resume_data = copy_data(DEFAULT_RESUME_DATA)
        self.theme_color = "#1e3a8a"
        self.selected_template = "minimalist"

        self.config_path = os.path.expanduser("~/.gemini_resume_config.json")
        self.github_user = "zhouyufeng"
        self.github_repo = "resume-generator"
        self.load_github_config()

        self.word_templates_dir = "/Users/zhouyufeng/Downloads/1 单页简历"
        self.docx_files = self.scan_local_docx_templates()

        self.init_ui()
        self.update_preview()

        threading.Thread(target=self.silent_check_update, daemon=True).start()

    def scan_local_docx_templates(self):
        templates = []
        if not os.path.isdir(self.word_templates_dir):
            return templates
        for f in sorted(os.listdir(self.word_templates_dir)):
            if f.endswith('.docx') and not f.startswith('.'):
                templates.append(f)
        return templates

    def load_github_config(self):
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
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "github_user": self.github_user,
                    "github_repo": self.github_repo
                }, f, indent=2)
        except Exception:
            pass

    def init_ui(self):
        self.setWindowTitle("智能简历生成器 | 一键套模板与智能单页自适应系统")
        self.setMinimumSize(1200, 800)
        self.resize(1500, 960)

        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        self.setStyleSheet("""
            QMainWindow { background-color: #0b0f19; }
            QWidget { color: #f3f4f6; }
        """)

        top_bar = QWidget()
        top_bar.setStyleSheet("background-color: #111827; border-bottom: 1px solid #1f2937;")
        top_layout = QHBoxLayout(top_bar)
        top_layout.setContentsMargins(15, 8, 15, 8)

        title_label = QLabel("智能简历生成器")
        title_label.setStyleSheet("font-size: 16px; font-weight: 700; color: #f3f4f6;")
        top_layout.addWidget(title_label)
        top_layout.addStretch()

        self.btn_check_update = QPushButton(f"检查更新 ({CURRENT_VERSION})")
        self.btn_check_update.setStyleSheet("background-color: rgba(255,255,255,0.06); color: #f3f4f6; padding: 5px;")
        self.btn_check_update.clicked.connect(self.handle_manual_check_update)
        top_layout.addWidget(self.btn_check_update)

        self.btn_config_git = QPushButton("配置仓库源")
        self.btn_config_git.setStyleSheet("background-color: rgba(255,255,255,0.06); color: #f3f4f6; padding: 5px;")
        self.btn_config_git.clicked.connect(self.handle_config_github)
        top_layout.addWidget(self.btn_config_git)

        main_layout.addWidget(top_bar)

        body = QWidget()
        body_layout = QHBoxLayout(body)
        body_layout.setContentsMargins(10, 10, 10, 10)
        body_layout.setSpacing(10)

        left_panel = QWidget()
        left_panel.setStyleSheet("background-color: #111827; border-radius: 8px;")
        left_layout = QVBoxLayout(left_panel)
        left_layout.setContentsMargins(0, 0, 0, 0)

        self.tabs = QTabWidget()
        self.tabs.setStyleSheet("""
            QTabWidget::pane { background: #111827; border: none; }
            QTabBar::tab { background: #1f2937; color: #9ca3af; padding: 10px 20px; margin: 2px; border-radius: 4px; }
            QTabBar::tab:selected { background: #2563eb; color: white; }
        """)

        form_tab = QWidget()
        form_layout = QVBoxLayout(form_tab)
        form_layout.setContentsMargins(10, 10, 10, 10)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; } QScrollBar:vertical { width: 6px; }")
        form_container = QWidget()
        form_scroll_layout = QVBoxLayout(form_container)
        form_scroll_layout.setContentsMargins(0, 0, 0, 0)

        self.check_auto_fit = QCheckBox("智能单页自适应约束 (自动保持一页)")
        self.check_auto_fit.setChecked(True)
        self.check_auto_fit.stateChanged.connect(self.update_preview)
        form_scroll_layout.addWidget(self.check_auto_fit)

        fit_group = QGroupBox("自适应排版微调")
        fit_layout = QFormLayout(fit_group)
        self.slide_font = QSlider(Qt.Orientation.Horizontal)
        self.slide_font.setRange(11, 16)
        self.slide_font.setValue(14)
        self.slide_font.valueChanged.connect(self.update_preview)
        fit_layout.addRow("字号:", self.slide_font)
        self.slide_line = QSlider(Qt.Orientation.Horizontal)
        self.slide_line.setRange(120, 180)
        self.slide_line.setValue(160)
        self.slide_line.valueChanged.connect(self.update_preview)
        fit_layout.addRow("行高:", self.slide_line)
        form_scroll_layout.addWidget(fit_group)

        form_group = QGroupBox("基本信息")
        form_group_layout = QFormLayout(form_group)
        self.input_name = QLineEdit()
        self.input_name.textChanged.connect(lambda v: self.update_basic('name', v))
        form_group_layout.addRow("姓名:", self.input_name)
        self.input_title = QLineEdit()
        self.input_title.textChanged.connect(lambda v: self.update_basic('title', v))
        form_group_layout.addRow("意向:", self.input_title)
        self.input_phone = QLineEdit()
        self.input_phone.textChanged.connect(lambda v: self.update_basic('phone', v))
        form_group_layout.addRow("电话:", self.input_phone)
        self.input_email = QLineEdit()
        self.input_email.textChanged.connect(lambda v: self.update_basic('email', v))
        form_group_layout.addRow("邮箱:", self.input_email)
        self.input_wechat = QLineEdit()
        self.input_wechat.textChanged.connect(lambda v: self.update_basic('wechat', v))
        form_group_layout.addRow("微信:", self.input_wechat)
        self.input_github = QLineEdit()
        self.input_github.textChanged.connect(lambda v: self.update_basic('github', v))
        form_group_layout.addRow("GitHub:", self.input_github)
        self.input_summary = QTextEdit()
        self.input_summary.setMaximumHeight(80)
        self.input_summary.textChanged.connect(lambda: self.update_basic('summary', self.input_summary.toPlainText()))
        form_group_layout.addRow("评价:", self.input_summary)
        form_scroll_layout.addWidget(form_group)

        self.form_edu_group = self.build_section("教育背景", "education", "school", ["school", "major", "degree", "date", "description"], ["学校", "专业", "学历", "时间", "描述"])
        form_scroll_layout.addWidget(self.form_edu_group)
        self.form_exp_group = self.build_section("工作经历", "experience", "company", ["company", "role", "date", "description"], ["公司", "职位", "时间", "描述"])
        form_scroll_layout.addWidget(self.form_exp_group)
        self.form_proj_group = self.build_section("项目经验", "projects", "name", ["name", "role", "date", "description"], ["项目", "角色", "时间", "描述"])
        form_scroll_layout.addWidget(self.form_proj_group)

        skill_group = QGroupBox("技能特长")
        skill_layout = QVBoxLayout(skill_group)
        self.skill_input = QTextEdit()
        self.skill_input.setMaximumHeight(100)
        self.skill_input.textChanged.connect(self.handle_skills_text_changed)
        skill_layout.addWidget(self.skill_input)
        form_scroll_layout.addWidget(skill_group)

        form_scroll_layout.addStretch()
        scroll.setWidget(form_container)
        form_layout.addWidget(scroll)
        self.tabs.addTab(form_tab, "表单编辑")

        ai_tab = QWidget()
        ai_layout = QVBoxLayout(ai_tab)
        self.ai_input = QTextEdit()
        self.ai_input.setPlaceholderText("粘贴AI生成的简历文稿到这里...")
        ai_layout.addWidget(self.ai_input)
        self.btn_ai_parse = QPushButton("智能提取简历数据")
        self.btn_ai_parse.clicked.connect(self.handle_ai_extract)
        ai_layout.addWidget(self.btn_ai_parse)
        self.tabs.addTab(ai_tab, "AI录入")

        left_layout.addWidget(self.tabs)
        body_layout.addWidget(left_panel, 45)

        right_panel = QWidget()
        right_panel.setStyleSheet("background-color: #111827; border-radius: 8px;")
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(10, 10, 10, 10)

        preview_ctrl = QHBoxLayout()
        self.btn_refresh = QPushButton("刷新预览")
        self.btn_refresh.clicked.connect(self.update_preview)
        preview_ctrl.addWidget(self.btn_refresh)
        self.btn_export_pdf = QPushButton("导出 PDF")
        self.btn_export_pdf.clicked.connect(self.handle_export_pdf)
        preview_ctrl.addWidget(self.btn_export_pdf)
        self.btn_export_word = QPushButton("套模板导出 Word")
        self.btn_export_word.clicked.connect(self.handle_export_word)
        preview_ctrl.addWidget(self.btn_export_word)
        right_layout.addLayout(preview_ctrl)

        self.preview = QTextBrowser()
        self.preview.setStyleSheet("""
            QTextBrowser {
                background-color: white;
                color: #1f2937;
                border: 1px solid #e5e7eb;
                border-radius: 4px;
                padding: 20px;
            }
        """)
        right_layout.addWidget(self.preview)

        self.status_label = QLabel("就绪")
        self.status_label.setStyleSheet("color: #9ca3af; font-size: 12px;")
        right_layout.addWidget(self.status_label)

        body_layout.addWidget(right_panel, 55)
        main_layout.addWidget(body)

    def build_section(self, title, key, first_field, fields, labels):
        group = QGroupBox(title)
        layout = QVBoxLayout(group)

        add_btn = QPushButton(f"添加{title}")
        add_btn.clicked.connect(lambda: self.add_section_item(key, first_field))
        layout.addWidget(add_btn)

        table = QTableWidget()
        table.setColumnCount(len(fields))
        table.setHorizontalHeaderLabels(labels)
        table.horizontalHeader().setStretchLastSection(True)
        table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        setattr(self, f"table_{key}", table)
        layout.addWidget(table)

        del_btn = QPushButton("删除选中行")
        del_btn.clicked.connect(lambda: self.delete_section_row(key))
        layout.addWidget(del_btn)

        return group

    def add_section_item(self, key, first_field):
        default_map = {
            "education": {"school": "", "major": "", "degree": "", "date": "", "description": ""},
            "experience": {"company": "", "role": "", "date": "", "description": ""},
            "projects": {"name": "", "role": "", "date": "", "description": ""}
        }
        self.resume_data[key].append(default_map.get(key, {}))
        self.update_preview()

    def delete_section_row(self, key):
        table = getattr(self, f"table_{key}")
        row = table.currentRow()
        if row >= 0 and row < len(self.resume_data[key]):
            del self.resume_data[key][row]
            self.update_preview()

    def update_basic(self, field, val):
        self.resume_data['basicInfo'][field] = val
        self.update_preview()

    def handle_skills_text_changed(self):
        text = self.skill_input.toPlainText()
        self.resume_data['skills'] = [s.strip() for s in text.split('\n') if s.strip()]
        self.update_preview()

    def handle_ai_extract(self):
        text = self.ai_input.toPlainText()
        if not text.strip():
            QMessageBox.warning(self, "提示", "请先输入AI简历文稿")
            return
        config = {"apiUrl": "", "apiKey": "", "modelName": ""}
        parsed = parseWithLocalRules(text)
        self.resume_data = parsed
        self.sync_form_from_data()
        self.update_preview()
        QMessageBox.information(self, "成功", "已从文稿中提取简历数据")

    def sync_form_from_data(self):
        basic = self.resume_data['basicInfo']
        self.input_name.setText(basic.get('name', ''))
        self.input_title.setText(basic.get('title', ''))
        self.input_phone.setText(basic.get('phone', ''))
        self.input_email.setText(basic.get('email', ''))
        self.input_wechat.setText(basic.get('wechat', ''))
        self.input_github.setText(basic.get('github', ''))
        self.input_summary.setText(basic.get('summary', ''))
        skills_text = '\n'.join(self.resume_data.get('skills', []))
        self.skill_input.setText(skills_text)
        self.populate_table('education', ['school', 'major', 'degree', 'date', 'description'])
        self.populate_table('experience', ['company', 'role', 'date', 'description'])
        self.populate_table('projects', ['name', 'role', 'date', 'description'])

    def populate_table(self, key, fields):
        table = getattr(self, f"table_{key}")
        items = self.resume_data.get(key, [])
        table.setRowCount(len(items))
        for r, item in enumerate(items):
            for c, field in enumerate(fields):
                table.setItem(r, c, QTableWidgetItem(item.get(field, '')))

    def update_preview(self):
        html = self.render_resume_html()
        self.preview.setHtml(html)
        if self.resume_data.get('basicInfo', {}).get('name'):
            self.status_label.setText(f"当前: {self.resume_data['basicInfo']['name']} 的简历")

    def render_resume_html(self):
        d = self.resume_data
        basic = d.get('basicInfo', {})
        name = basic.get('name', '姓名')
        title = basic.get('title', '意向职位')
        phone = basic.get('phone', '')
        email = basic.get('email', '')
        wechat = basic.get('wechat', '')
        github = basic.get('github', '')
        summary = basic.get('summary', '')

        font_size = self.slide_font.value()
        line_height = self.slide_line.value() / 100
        auto_fit = self.check_auto_fit.isChecked()
        tc = self.theme_color

        sections_html = ""

        def render_section(section_title, items, fields, fmt):
            nonlocal sections_html
            if not items:
                return
            html = f'<div class="resume-section"><h2 style="font-size:{font_size+2}px;font-weight:700;color:{tc};border-bottom:2px solid {tc};padding-bottom:4px;margin:0 0 8px 0;">{section_title}</h2>'
            for item in items:
                html += '<div style="margin-bottom:10px;">'
                html += fmt(item)
                html += '</div>'
            html += '</div>'
            sections_html += html

        contact_parts = []
        if phone: contact_parts.append(f"电话: {phone}")
        if email: contact_parts.append(f"邮箱: {email}")
        if wechat: contact_parts.append(f"微信: {wechat}")
        if github: contact_parts.append(f"GitHub: {github}")
        contact_str = " | ".join(contact_parts)

        summary_html = f'<p style="font-size:{font_size}px;line-height:{line_height};color:#4b5563;text-align:justify;">{summary}</p>' if summary else ''

        render_section("教育背景", d.get('education', []),
            ['school', 'major', 'degree', 'date'],
            lambda e: f'<div style="font-weight:700;font-size:{font_size}px;">{e.get("school","")} | {e.get("major","")} ({e.get("degree","")}) <span style="font-weight:400;color:#6b7280;">{e.get("date","")}</span></div>' +
                      (f'<p style="font-size:{font_size-1}px;color:#4b5563;margin:4px 0 0 0;">{e.get("description","")}</p>' if e.get('description') else ''))

        render_section("工作经历", d.get('experience', []),
            ['company', 'role', 'date'],
            lambda e: f'<div style="font-weight:700;font-size:{font_size}px;">{e.get("company","")} | {e.get("role","")} <span style="font-weight:400;color:#6b7280;">{e.get("date","")}</span></div>' +
                      (f'<p style="font-size:{font_size-1}px;color:#4b5563;margin:4px 0 0 0;">{e.get("description","")}</p>' if e.get('description') else ''))

        render_section("项目经验", d.get('projects', []),
            ['name', 'role', 'date'],
            lambda e: f'<div style="font-weight:700;font-size:{font_size}px;">{e.get("name","")} | {e.get("role","")} <span style="font-weight:400;color:#6b7280;">{e.get("date","")}</span></div>' +
                      (f'<p style="font-size:{font_size-1}px;color:#4b5563;margin:4px 0 0 0;">{e.get("description","")}</p>' if e.get('description') else ''))

        skills = d.get('skills', [])
        skills_html = ''
        if skills:
            skills_items = ''.join([f'<span style="display:inline-block;background:rgba(59,130,246,0.08);padding:2px 8px;border-radius:4px;margin:2px;font-size:{font_size-1}px;color:{tc};">{s}</span>' for s in skills])
            skills_html = f'<div class="resume-section"><h2 style="font-size:{font_size+2}px;font-weight:700;color:{tc};border-bottom:2px solid {tc};padding-bottom:4px;margin:0 0 8px 0;">技能特长</h2><div>{skills_items}</div></div>'

        page_style = "height:1123px;overflow:hidden;" if auto_fit else ""

        return f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans SC',sans-serif;">
<div id="resume-page" style="width:794px;{page_style}padding:40px 50px;box-sizing:border-box;background:#fff;">
<div style="text-align:center;margin-bottom:20px;">
<h1 style="font-size:{font_size+8}px;font-weight:800;color:#111827;margin:0;letter-spacing:-0.5px;">{name}</h1>
<p style="font-size:{font_size+2}px;font-weight:600;color:{tc};margin:4px 0;">{title}</p>
<p style="font-size:{font_size-1}px;color:#6b7280;margin:2px 0;">{contact_str}</p>
</div>
{summary_html}
{sections_html}
{skills_html}
</div>
</body></html>'''

    def handle_export_pdf(self):
        html = self.render_resume_html()
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出 PDF", f"{self.resume_data.get('basicInfo', {}).get('name', '我的')}_求职简历.pdf",
            "PDF 文件 (*.pdf)"
        )
        if not file_path:
            return
        try:
            doc = QTextDocument()
            doc.setHtml(html)
            printer = QPrinterInfo.defaultPrinter()
            if printer:
                pass
            doc.printToPdf(file_path, QPageLayout(
                QPageSize(QPageSize.PageSizeID.A4),
                QPageLayout.Orientation.Portrait,
                QMarginsF(15, 15, 15, 15)
            ))
            QMessageBox.information(self, "导出成功", f"PDF 已保存至: {file_path}")
        except Exception as err:
            QMessageBox.critical(self, "PDF 导出失败", str(err))

    def handle_export_word(self):
        docs = self.docx_files
        if not docs:
            QMessageBox.warning(self, "提示", "未在下载目录找到 Word 模板文件")
            return
        template_name, ok = QInputDialog.getItem(
            self, "选择模板", "请选择要套用的模板:", docs, 0, False
        )
        if not ok or not template_name:
            return

        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出 Word", f"{self.resume_data.get('basicInfo', {}).get('name', '我的')}_求职简历.docx",
            "Word 文件 (*.docx)"
        )
        if not file_path:
            return

        temp_json = os.path.join(os.path.expanduser("~"), ".temp_resume_data.json")
        try:
            with open(temp_json, 'w', encoding='utf-8') as f:
                json.dump(self.resume_data, f, ensure_ascii=False, indent=2)
            template_path = os.path.join(self.word_templates_dir, template_name)
            success = fill_docx_template(temp_json, template_path, file_path)
            if success:
                QMessageBox.information(self, "导出成功", f"Word 已保存至: {file_path}")
            else:
                QMessageBox.critical(self, "导出失败", "Word 填充引擎执行出错")
        except Exception as err:
            QMessageBox.critical(self, "导出失败", str(err))
        finally:
            if os.path.exists(temp_json):
                try:
                    os.remove(temp_json)
                except Exception:
                    pass

    def handle_config_github(self):
        user, ok1 = QInputDialog.getText(self, "配置 GitHub 仓库源", "请输入 GitHub 用户名:", QLineEdit.EchoMode.Normal, self.github_user)
        if not ok1 or not user.strip(): return

        repo, ok2 = QInputDialog.getText(self, "配置 GitHub 仓库源", "请输入仓库名称:", QLineEdit.EchoMode.Normal, self.github_repo)
        if not ok2 or not repo.strip(): return

        self.github_user = user.strip()
        self.github_repo = repo.strip()
        self.save_github_config()
        QMessageBox.information(self, "配置成功", f"已绑定更新源: https://github.com/{self.github_user}/{self.github_repo}")

    def handle_manual_check_update(self):
        QMessageBox.information(self, "正在检测", "正在与 GitHub Release 通信...")
        threading.Thread(target=self.run_update_check, args=(True,), daemon=True).start()

    def silent_check_update(self):
        self.run_update_check(manual=False)

    def run_update_check(self, manual=False):
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
                        if manual: self.show_msg_box("提示", "未找到任何已发布版本")
                        return

                    v_local = parse_version(CURRENT_VERSION)
                    v_remote = parse_version(latest_tag)

                    if v_remote > v_local:
                        msg = f"发现新版本: {latest_tag}\n\n更新日志:\n{body}\n\n是否前往 GitHub 下载最新版？"
                        self.show_update_dialog("新版本可用", msg, html_url)
                    else:
                        if manual:
                            self.show_msg_box("检测结果", f"当前版本 ({CURRENT_VERSION}) 已是最新版")
                else:
                    if manual: self.show_msg_box("网络错误", "请求更新源失败，请确认仓库已公开")
        except Exception as err:
            print("检查更新出错:", err)
            if manual: self.show_msg_box("连接失败", "无法连接至 GitHub，请检查网络")

    def show_msg_box(self, title, msg):
        from PyQt6.QtCore import QMetaObject, Q_ARG
        QMetaObject.invokeMethod(self, "display_info", Qt.ConnectionType.QueuedConnection, Q_ARG(str, title), Q_ARG(str, msg))

    def show_update_dialog(self, title, msg, url):
        from PyQt6.QtCore import QMetaObject, Q_ARG
        QMetaObject.invokeMethod(self, "display_update", Qt.ConnectionType.QueuedConnection, Q_ARG(str, title), Q_ARG(str, msg), Q_ARG(str, url))

    from PyQt6.QtCore import pyqtSlot
    @pyqtSlot(str, str)
    def display_info(self, title, msg):
        QMessageBox.information(self, title, msg)

    @pyqtSlot(str, str, str)
    def display_update(self, title, msg, url):
        reply = QMessageBox.question(self, title, msg, QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if reply == QMessageBox.StandardButton.Yes:
            QDesktopServices.openUrl(QUrl(url))

def parse_version(v_str):
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
