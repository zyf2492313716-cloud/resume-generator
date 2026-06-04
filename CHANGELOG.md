# 更新日志

## v2.2.0 - 引擎修复与填充质量提升 (2026-06-04)

### Bug 修复

**template_engine.py**
- 修复 label_adjacent 替换所有匹配段落的 bug（改回 break，只替换第一个匹配）
- 修复 section_replace 循环处理所有 header_paras 的 bug（加 break，只填充第一个出现位置）
- 修复 label_inline 替换后未清空同段落其他文本节点的问题
- 修复 post-processing 误标记已修改段落的问题（使用 _fill_modified 快照）
- 移除全局 keyword fallback（扫描所有段落导致误匹配，如"服从学校和部门的工作安排"被替换）
- keyword_substring 扩展增加最大长度限制（MAX_EXPAND=5, MAX_RESULT=10），避免吞掉整句

**YAML 配置修复**
- 文艺单页01: experience header "工作经历" → "实践经验"，扩展 company/role 关键词
- 文艺单页03: honors header "本科期间获校级三好学生..." → "获奖证书"（修正为实际标题）
- 稳重单页16: 完全重写（修正 name/phone/honors/skills 配置）
- 稳重单页17: 完全重写（修正 name/phone/education/skills 配置）

### 验证结果

- 填充率：96/103 → 98/103 (95%) 达 4/5+
- 平均分：4.5/5 → 4.6/5
- 5/5: 64 → 65 模板
- 零回归：修复前后其他模板无影响

---

## v2.1.0 - 配置驱动模板填充引擎 (2026-06-04)

### 新增功能

**模板引擎 (template_engine.py)**
- 全新配置驱动填充引擎，支持 5 种匹配模式：
  - `label_inline`: 标签+值在同一文本节点（如"手机：138..."）
  - `label_adjacent`: 标签在前一节点，值在后一节点（同段落或跨段落）
  - `keyword_scan`: 关键词扫描，支持子串扩展和整节点替换
  - `section_replace`: 板块级内容替换
  - `pattern_match`: 正则匹配（手机号、邮箱）
- 3 层错误处理：板块跳过 → 字段跳过 → 始终输出文件
- 巨型段落检测：自动识别嵌套文本框结构
- `fill_with_fallback()`: 有 YAML 走引擎，无 YAML 走 v2 兜底
- 支持 `fallback: true` 配置项，引擎失败时自动回退 v2

**配置生成器 (generate_config.py)**
- 自动分析模板 document.xml 结构
- 检测板块标题（含中英双语、竖线分隔等变体）
- 检测占位符姓名、手机号、邮箱
- 自动生成 YAML 配置文件

**103 个模板 YAML 配置**
- 覆盖全部 6 个风格组：文艺(20)、极简(5)、活泼(18)、稳重(26)、简约(30)、知页(4)
- 验证结果：96/103 (93%) 达到 4/5+ 分，其中 64 个满分 5/5
- 平均分 4.5/5

**测试与验证**
- `engine_test.py`: 11 个 unittest 测试用例，全部通过
- `scripts/validate_fill.py`: 全量验证脚本，支持 CSV/JSON 输出，支持 `--template` 单模板验证

**Electron 集成**
- `electron-main.cjs`: `fillDocx()` 优先使用模板引擎，失败回退 v2
- `preload.js`: 新增 `checkTemplateConfig` IPC 桥接
- `TemplatePanel.jsx`: 模板列表显示配置状态图标（✓ 绿色=引擎配置 / ○ 橙色=引擎+兜底 / — 灰色=v2）

**文档**
- `docs/template_schema_v1.md`: YAML 配置 Schema 文档

### 修复

- `docx_filler_v2.py`: 修复巨型段落导致重复替换的问题
- `docx_filler_v2.py`: 修复 summary 过度匹配（短占位符误匹配长文本）
- `docx_filler_v2.py`: 修复 Pass 3 名字回退过于激进（替换所有 2-4 字中文）
- `docx_filler_v2.py`: 新增 `getparent()` 兼容性处理（标准 ElementTree 无此方法）

### 文件统计

| 类别 | 文件 | 行数 |
|------|------|------|
| 引擎核心 | `src/utils/template_engine.py` | 807 |
| 配置生成器 | `src/utils/generate_config.py` | 566 |
| YAML 配置 | `templates/*.yaml` | 103 个文件 |
| 验证脚本 | `scripts/validate_fill.py` | 272 |
| 单元测试 | `src/utils/engine_test.py` | 297 |
| Schema 文档 | `docs/template_schema_v1.md` | 280 |

---

## v2.0.1 - 填充引擎修复 (2026-05)

- 重写 Python 填充引擎适配所有模板
- 修复 PDF 导出空白问题
- 用 docx-preview 替换 mammoth，提升预览保真度
- 修复 13 个 bug

---

## v2.0.0 - 真实 Word 模板渲染架构 (2026-04)

- 全新架构：真实 Word 模板渲染
- 支持全部 104 套模板
- Mac 原生版 DMG 打包
- Electron 自动更新
