# Template YAML Schema v1.0

配置驱动填充引擎的 YAML 格式规范。配置生成器必须以本文档为唯一基准。

---

## 一、文件命名与位置

```
templates/<模板名>.yaml  （与 .docx 同目录同名）
```

---

## 二、完整结构

```yaml
version: "1.0"           # 固定值
template_name: "..."     # 不含 .docx 后缀
style_group: "..."       # 极简|稳重|简约|活泼|文艺|知页
fallback: false          # 是否允许回退 v2

basic_info:
  fields:
    <field_name>:
      type: "..."        # 见第三节
      # 以下按 type 有所不同，见各类型定义
      pattern: "..."
      keywords: ["..."]
      value_scope: "..." # keyword_substring | full_node
      section: "..."     # 仅 section_replace

sections:
  <section_key>:         # 如 education, experience, honors, skills, studentWork
    header: "..."        # 精确匹配的板块标题文本
    type: "section_replace"  # section 级 type：仅 section_replace
    # 或者：
    entry_schema:        # 逐条目填充（type 省略时，引擎自动识别 entry_schema 模式）
      <field_name>:
        type: "keyword_scan"  # entry_schema 内仅支持 keyword_scan 和 full_node_replace
        keywords: ["..."]
        value_scope: "keyword_substring"
        format: "..."    # 仅 full_node_replace
    item_separator: "paragraph"

special:                 # 可选
  multi_node_fields: ["name"]
  exclude_labels: ["个人特性", "推荐人"]
```

---

## 三、类型系统（6 种）

### 3.1 位置约束

| 可用位置 | 允许的类型 |
|----------|-----------|
| `basic_info.fields` | label_inline, label_adjacent, keyword_scan, section_replace, label_group |
| `sections.<key>.entry_schema` | keyword_scan, full_node_replace |
| `sections.<key>.type` | section_replace（唯一取值） |

### 3.2 label_inline

**语义**：标签和值在同一文本节点，用冒号分隔。

**必需字段**：`type`, `pattern`
**可选字段**：无

**匹配规则**：
1. 遍历所有 w:t 节点（跳过巨型段落）
2. 条件：`txt.startswith(pattern)` AND 文本含 `：` 或 `:`
3. 替换第一个冒号后的内容为用户值

**适用判断**（生成器用）：
```
条件：存在文本节点匹配 r'^<pattern>.*[：:]' 且 pattern 是已知标签
→ 生成 label_inline
```

**已知 label_inline 标签列表**（生成器检测用）：
姓名, 名字, 手机, 电话, 电话号码, 邮箱, Email, E-mail, 邮箱地址,
微信, WeChat, QQ, 地址, 求职意向, 目标职位, 应聘职位,
院校, 学校, 毕业院校, 专业, 学历


### 3.3 label_adjacent

**语义**：标签在独立文本节点，值在同一段落或相邻段落的后续节点。

**必需字段**：`type`, `pattern`
**可选字段**：无

**匹配规则**：
1. 遍历所有 w:t 节点（跳过巨型段落）
2. 条件：`txt == pattern` 或 `txt.startswith(pattern)`
3. 在同一段落的后续文本节点中找非标签文本节点 → 替换
4. 如果同一段落无值节点，扩展到相邻段落（最多 3 个段落）

**适用判断**（生成器用）：
```
条件：存在文本节点精确匹配已知标签（如 "姓名"、"电话"），且同一段落后续有短文本（<50字符）非标签节点
→ 生成 label_adjacent
```

### 3.4 keyword_scan

**语义**：通过关键词定位文本节点，按 value_scope 替换内容。

**必需字段**：`type`, `keywords`
**可选字段**：`value_scope`（默认 `keyword_substring`）

**value_scope 规则**：
- `keyword_substring`（默认）：从关键词位置反向扩展到空格/标点，向前扩展到空格/标点，只替换扩展区域内的子串。纯中文无空格时自动退化为 full_node
- `full_node`：匹配到关键词后直接替换整个文本节点

**适用判断**（生成器用）：
```
条件：无标准标签（label_inline/label_adjacent 都不匹配），但存在以下之一：
  - 已知占位名（ALL_KNOWN_NAMES 列表）→ full_node
  - 裸电话号码（7-16 位数字）→ full_node
  - 裸邮箱（含 @）→ full_node
  - 含学校关键词的文本节点 → keyword_substring
  - 含公司关键词的文本节点 → keyword_substring
→ 生成 keyword_scan

value_scope 推断规则：
  文本节点字符数 > 关键词字符数 + 10 → keyword_substring
  文本节点字符数 ≤ 关键词字符数 + 10 → full_node
```

**已知占位名列表**（从 docx_filler_v2.py 获取）：
宋艾嘉, 肖颖馨, 韩志弘, 李自强, 关睢尔, 陈小明, 刘小红, 周洁, 吴芳,
白晓云, 王若琳, 沈慧美, 林晓歌, 林月明, 柳云萧, 苏语凝, 钟小艾, 冯青,
张小泉, 云海, 陈知页, 孟子君, 孟晓思, 关月兰, 刘璇凯, 张全峰,
张悦然, 张晓龙, 张璐瑶, 张筱婕, 张语敏, 张韵艺, 文如菁, 林丹阳,
林博文, 林宇凡, 李元茹, 李小冉, 柳元青, 梁静, 王宇凡, 王晓峰,
王灵筠, 王菲, 王雅丹, 田筱雨, 艾明远, 高凌云, 黄怡佳, 郭洁, 陈洁,
顾元昊, 刘诗芸, 刘明, 周芳, 陆然, 杨阳, 张宇帆, 张莜婕, 朗云, 赵晓

### 3.5 section_replace

**语义**：整个板块替换为用户数据。

**在 basic_info 中使用**（如 summary）：
- **必需字段**：`type`, `section`
- **section 值**：板块标题文本（如 "自我评价"、"个人介绍"）

**在 sections 中使用**（如 honors, skills）：
- **必需字段**：`type`
- 板块标题由 `sections.<key>.header` 指定
- 用户数据格式化：`honors` → 每项用 `\n• ` 前缀分隔；`skills` → 每项用 `\n` 分隔

**匹配规则**：
1. 精确匹配 section 文本（或 header）定位板块
2. 先搜索标题之后的段落，再搜索之前的段落
3. 将第一个找到的非空内容段落替换为用户数据

**适用判断**（生成器用）：
```
条件：文本节点精确匹配 SECTION_HEADERS 中的某个标题（如 "自我评价"、"荣誉证书"）
→ 生成 section_replace
```

### 3.6 label_group

**语义**：多个标签集中排列，值在后续对应位置的段落中。

**必需字段**：`type`, `pattern`
**可选字段**：无

**匹配规则**：
1. 收集所有 label_group 字段的标签位置
2. 从最后一个标签之后开始扫描
3. 按位置顺序将值填入对应的非标签段落

**适用判断**（生成器用）：
```
条件：多个 basic_info 标签（如 "手机"、"邮箱"、"微信"）在同一区域内集中排列，
     且它们的值在后续独立段落中按相同顺序排列
→ 对所有这些字段生成 label_group
```

### 3.7 full_node_replace

**语义**：替换整个文本节点，支持格式化模板。

**仅用于 entry_schema**。

**必需字段**：`type`, `keywords`（用于定位）
**可选字段**：`format`（默认 `'{value}'`，可用 `{school}`, `{major}` 等同条目其他字段值）

**注意**：当前 10 个手工模板中未使用此类型，保留供特殊紧凑格式模板使用。

---

## 四、板块标题识别

生成器使用以下标题列表检测模板板块：

```python
ALL_SECTION_HEADERS = [
    # 中文教育
    '教育背景', '教育经历',
    # 中文经历
    '工作经历', '工作经验', '实习经历',
    # 校内/其他
    '校内实践', '实践经历', '在校经历', '校园活动',
    # 荣誉
    '证书奖励', '荣誉证书', '荣誉奖项', '个人荣誉', '获奖经历', '奖项荣誉', '资格证书', '技能证书',
    # 技能
    '专业技能', '职业技能', '掌握技能',
    # 自我评价
    '自我评价', '个人介绍', '个人总结', '关于我', '个人简介',
    # 其他
    '兴趣爱好', '基本信息', '个人信息', '联系方式', '主修课程',
    # 双语
    '教育背景EDUCATION', '实习经历JOB EXPERIENCE', '实践经历PRACTICAL EXPERIENCE',
    '荣誉AWARDS', '技能SKILLS',
]
```

匹配时**忽略大小写**做精确比对，然后回退到原始大小写的精确匹配。

---

## 五、special 字段

```yaml
special:
  multi_node_fields: ["name"]     # 名字跨多个 w:t 节点时启用
  exclude_labels: ["个人特性"]    # 不需要填充的标签（保留原样）
```

**multi_node_fields**：引擎自动将同一段落内相邻的非标签文本节点合并后再匹配。当名字（或其它字段）在模板中被拆成多个 w:t 节点时使用。

**exclude_labels**：在 basic_info 处理时跳过这些标签。

---

## 六、生成器置信度标记规则

| 置信度 | 条件 |
|--------|------|
| `auto` | 能识别所有 basic_info 字段（name/phone/email 至少 3 个）+ 至少 2 个 sections |
| `low` | 能识别部分 basic_info 字段（1-2 个）或 1 个 section |
| `manual` | 几乎无法识别任何模式（0 个字段和 0 个 section，或模板文本结构异常） |

---

## 七、决策树（生成器主流程）

```
输入：.docx 模板

1. 解压 word/document.xml，提取文本节点结构
2. 检测巨型段落（body 直接子段落中嵌套段落数 > 3）
3. 收集所有非巨型段落的文本节点

4. 检测 basic_info 字段：
   FOR EACH 文本节点:
     IF 匹配 label_inline 模式 → 生成 label_inline
     ELIF 匹配 label_adjacent 模式 → 生成 label_adjacent
     ELIF 匹配已知占位名 → 生成 keyword_scan (full_node)
     ELIF 匹配电话号码/邮箱正则 → 生成 keyword_scan (full_node)

5. 检测 label_group：
   如果有 2+ 个相邻的标签节点且无 inline 冒号 → 尝试生成 label_group

6. 检测 sections：
   FOR EACH 文本节点:
     IF 匹配 ALL_SECTION_HEADERS → 记录板块标题和位置

7. 对每个检测到的板块：
   IF 板块标题在 ["自我评价", "个人介绍", "个人总结", "关于我", "个人简介"] → 生成 summary: section_replace
   ELIF 板块标题在荣誉/技能类 → 生成对应的 section_replace
   ELIF 板块标题在教育/经历类 → 生成 entry_schema（使用 keyword_scan + value_scope 推断）

8. 生成 YAML，标记置信度
```
