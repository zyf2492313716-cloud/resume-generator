import sys
import json
import re
import zipfile
import io
import xml.etree.ElementTree as ET


# All possible label patterns across all template groups
LABEL_PREFIXES = {
    '姓名': 'name', '名字': 'name', 'Name': 'name',
    '手机': 'phone', '电话': 'phone', '电话号码': 'phone', 'Phone': 'phone',
    '邮箱': 'email', 'Email': 'email', 'E-mail': 'email', '邮箱地址': 'email',
    '微信': 'wechat', 'WeChat': 'wechat', 'QQ': 'wechat',
    '地址': 'address', '地址：': 'address', 'Address': 'address',
    '求职意向': 'title', '目标职位': 'title', '应聘职位': 'title', 'Job Target': 'title',
    '个人总结': 'summary', '自我评价': 'summary', '个人简介': 'summary',
    '院校': 'school', '院校：': 'school', '学校': 'school', '毕业院校': 'school',
    '专业': 'major', 'Major': 'major',
    '学历': 'degree', 'Degree': 'degree',
    '出生': None, '年龄': None, '籍贯': None, '政治': None, '民族': None,
    '性别': None, '身高': None, '现居': None, '生日': None, '居住地': None,
    '工作地点': None, '个人特性': None, '推荐人': None, '任职参考': None,
}

# Section types → possible header texts in templates
SECTION_PATTERNS = {
    'education': ['教育背景', '教育经历'],
    'experience': ['工作经历', '工作经验', '工作经历：'],
    'projects': ['项目经验', '项目经历'],
    'research': ['科研经历', '科研项目'],
    'studentWork': ['校内实践', '学生活动', '社团经历', '在校经历', '实践经验'],
    'honors': ['荣誉证书', '证书奖励', '个人荣誉', '荣誉奖项', '获奖证书', '证书', '资格证书'],
    'skills': ['专业技能', '技能水平', '掌握技能', '职业技能', '技能特长'],
    'summary': ['自我评价', '个人介绍', '个人总结', '关于我', '个人简介'],
    'interests': ['兴趣爱好'],
    'basic': ['基本信息', '个人信息', '联系方式', '个人资料', '基本资料'],
}

# Field keywords for section data replacement
FIELD_KEYWORDS = {
    'school': ['学校', '院校', '大学', '学院', '毕业院校', 'School'],
    'major': ['专业', 'Major'],
    'degree': ['本科', '硕士', '博士', '学士', '专科', '学历', 'Degree'],
    'company': ['公司', '科技', '企业', '集团', '网络', '有限', '工作室', 'Company'],
    'role': ['负责人', '角色', '职务', '职位', 'Role'],
    'name': ['项目', '名称', '课题', '研究', '科研', 'Name'],
    'organization': ['组织', '社团', '学生', '部门', '中心', 'Organization'],
}

# Known placeholder names across all templates
ALL_KNOWN_NAMES = [
    '宋艾嘉', '肖颖馨', '韩志弘', '李自强', '张三', '李四', '王五',
    '赵六', '关睢尔', '陈小明', '刘小红', '周洁', '吴芳',
    '白晓云', '王若琳', '沈慧美', '林晓歌', '林月明', '柳云萧',
    '苏语凝', '钟小艾', '冯青', '张小泉', '云海', '陈知页',
    '孟子君', '孟晓思', '关月兰', '刘璇凯', '张全峰',
    '张悦然', '张晓龙', '张璐瑶', '张筱婕', '张语敏', '张韵艺',
    '文如菁', '林丹阳', '林博文', '林宇凡',
    '李元茹', '李小冉', '柳元青', '梁静',
    '王宇凡', '王晓峰', '王灵筠', '王菲', '王雅丹',
    '田筱雨', '艾明远', '高凌云', '黄怡佳',
    '郭洁', '陈洁', '顾元昊', '刘诗芸',
    '刘明', '周芳', '陆然', '杨阳',
    '张宇帆', '张莜婕', '朗云', '赵晓',
]

# Summary placeholder fragments
SUMMARY_PLACEHOLDERS = [
    # 简约/稳重/文艺 templates
    '有扎实的美术基础和审美眼光，善于创新，色彩感觉敏锐',
    '有扎实的美术基础和审美眼光，对平面设计有独特的思维能力',
    '娴熟操作Photoshop、Illustrator、Indesin等平面软件',
    '坚持不懈的创作激情，能独立完成各项设计任务',
    '严格要求自己，待人热情，能吃苦耐劳，沟通，协调能力强',
    '良好的公共关系意识，善于沟通，有较好的组织能力',
    '介绍大学学习阶段所学专业基础知识及实践经历',
    '良好的心态和责任感，能吃苦耐劳，擅于管理时间',
    '勇于面对变化和挑战，习惯制定切实可行的学习计划',
    '吃苦耐劳，擅于管理时间，勇于面对变化和挑战',
    # 知页简历 - FULL text only (exact match)
    '2年销售经验，电子商务和应用心理学双学位。座右铭：销售就社团经历是做人。',
    '绩效考核练血两年超过指标30%，善于取得客户信任，拥有勤劳刻苦的执着劲',
    # 活泼单页
    '有丰富的营销知识体系做基础；对于市场营销方面的前沿和动向有一定的了解，善于分析和吸取经验。熟悉网络推广。尤其是社会化，媒体方面。有独到的见解和经验。个性开朗，容易相处，团队荣誉感强。',
    '本人是市场营销专业毕业生，有丰富的营销知识体系做基础，对市场营销方面的前沿有了解，善于分析和吸取经验，个性开朗，容易相处，团队荣誉感强。',
    # 稳重单页
    '自我学习能力还是比较强的，想做的事很认真。专业知识扎实，有积极的工作态度，能够独立工作，又有团队精神。具有良好的文化素质，在未来的工作中，我将以充沛的精力，努力工作，稳定地进步自己的工作能力。我正在寻找一个更好的发展平台，希望能够充分发挥自己的优势，共同努力成就一番事业。',
    # 极简单页 (text is duplicated in template)
    '介绍大学学习阶段的经历和就学经验，在哪所学校就读，以及在就读期间获得相关荣誉说明。介绍大学学习阶段的经历和就学经验，在哪所学校就读，以及在就读期间获得相关荣誉说明。',
    '介绍高中学习阶段的经历和就学经验，在哪所学校就读，以及在就读期间获得相关荣誉说明。介绍高中学习阶段的经历和就学经验，在哪所学校就读，以及在就读期间获得相关荣誉说明。',
    # 文艺 - other long texts that might be summary
    '给我一个机会，还你一个精彩 / A chance，a surprise',
]

# Section headers and labels that should NOT be replaced as names
NAME_EXCLUSIONS = set()
for patterns in SECTION_PATTERNS.values():
    NAME_EXCLUSIONS.update(patterns)
NAME_EXCLUSIONS.update([
    '基本信息', '个人信息', '联系方式', '个人资料', '基本资料', '关于我',
    '个人特性', '推荐人', '任职参考', '个人介绍', '主修课程',
    '院校', '专业', '学历', '年龄', '籍贯', '电话', '邮箱', '姓名',
    '出生日期', '毕业院校', '工作描述',
    '大学本科', '硕士研究生', '博士研究生', '本科', '硕士', '博士',
    '出生', '民族', '已婚', '未婚', '中共党员', '预备党员', '群众',
    '居住地', '现居', '生日', '身高', '体重', '政治面貌', '性别',
    '工作地点', '作品链接',
    '工作经验', '实习经历', '校园活动',
    '技能证书', '证书', '个人能力',
    '个人技能', '团队协作', '团队能力', '组织能力', '沟通能力', '学习能力',
    '适应能力', '创新能力', '领导能力', '语言能力',
    '兴趣爱好',
])

# Known title strings from templates
KNOWN_TITLES = [
    '平面设计', '网页设计师', '市场拓展/策划专员', 'UI设计师',
    '产品经理', '软件工程师', '前端工程师', '后端工程师',
    '销售员岗位', '市场专员', '销售专员', '插画师',
    '美术主编', '实习护士', '护理实习', '销售经理',
]


def fill_template(template_path, data, output_path):
    with zipfile.ZipFile(template_path, 'r') as zin:
        doc_xml = zin.read('word/document.xml').decode('utf-8')

    basic = data.get('basicInfo', {})
    edus = data.get('education', [])
    exps = data.get('experience', [])
    projs = data.get('projects', [])
    research_list = data.get('research', [])
    sw_list = data.get('studentWork', [])
    honors_list = data.get('honors', [])
    skills = data.get('skills', [])

    root = ET.fromstring(doc_xml.encode('utf-8'))
    NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

    name = basic.get('name', '')
    phone = basic.get('phone', '')
    email = basic.get('email', '')
    wechat = basic.get('wechat', '')
    title = basic.get('title', '')
    summary = basic.get('summary', '')
    address = basic.get('address', '')
    github = basic.get('github', '')

    # Collect all text nodes with paragraph context
    # Templates have "giant paragraphs" (direct body children) that contain ALL content
    # via nested sub-paragraphs in text boxes. We collect from ALL paragraphs including
    # nested ones, but track which are "giant" to avoid duplicate processing.
    paragraphs = list(root.iter(f'{{{NS}}}p'))
    para_texts = []

    # Detect giant paragraphs: body direct children with many descendant runs
    giant_para_indices = set()
    body = root.find(f'{{{NS}}}body')
    if body is not None:
        direct_children = [c for c in body if c.tag == f'{{{NS}}}p']
        for dc in direct_children:
            run_count = len(list(dc.iter(f'{{{NS}}}r')))
            if run_count > 10:
                dc_idx = paragraphs.index(dc)
                giant_para_indices.add(dc_idx)

    for pi, p in enumerate(paragraphs):
        for r in p.iter(f'{{{NS}}}r'):
            t = r.find(f'{{{NS}}}t')
            if t is not None:
                txt = (t.text or '').strip()
                if txt:
                    para_texts.append((pi, t, txt))

    # Scan template to find which section headers it contains (skip giant paragraphs)
    template_sections = set()
    for pi, _, txt in para_texts:
        if pi in giant_para_indices:
            continue
        for stype, headers in SECTION_PATTERNS.items():
            if txt in headers:
                template_sections.add(stype)

    # Build per-paragraph joined text (handles <w:tab/> inside <w:r>)
    # Must be done BEFORE any text modifications
    ALL_SCHOOL_KEYWORDS = ['大学', '学院', '学校']
    ALL_COMPANY_KEYWORDS = ['有限公司', '有限责任公司', '科技', '公司', '企业', '集团', '网络', '有限', '办公室', '中心', '系', '工作室', '事务所', '出版社', '画院', '研究院', '研究所', '医院', '银行', '工厂', '制造']

    def set_node_text(node, val):
        node.text = val

    USER_FIELDS = {
        'name': name, 'phone': phone, 'email': email,
        'wechat': wechat, 'title': title, 'summary': summary, 'address': address,
    }

    # --- Pass 1: Label+value in same text node (colon-separated, skip giant paragraphs) ---
    for pi, t_node, txt in para_texts:
        if pi in giant_para_indices:
            continue
        for prefix, field in LABEL_PREFIXES.items():
            val = USER_FIELDS.get(field)
            if not val:
                continue
            if txt.startswith(prefix) and ('：' in txt or ':' in txt):
                parts = re.split(r'[：:]', txt, maxsplit=1)
                if len(parts) >= 2:
                    separator = txt[len(prefix)] if len(txt) > len(prefix) else '：'
                    set_node_text(t_node, f'{prefix}{separator}{val}')
                    break

    # --- Pass 2: Label+value in adjacent text nodes (skip giant paragraphs) ---
    for i, (pi, t_node, txt) in enumerate(para_texts):
        if pi in giant_para_indices:
            continue
        for label_text, field in LABEL_PREFIXES.items():
            val = USER_FIELDS.get(field)
            if not val:
                continue
            if txt == label_text:
                for j in range(i + 1, len(para_texts)):
                    nj, next_node, next_txt = para_texts[j]
                    if nj != pi:
                        break
                    is_other_label = any(
                        next_txt.startswith(lp) for lp in LABEL_PREFIXES
                    )
                    if is_other_label:
                        continue
                    if next_txt and len(next_txt) < 80:
                        set_node_text(next_node, val)
                        break

    # --- Pass 3: Known placeholder names (skip giant paragraphs to avoid duplicates) ---
    if name:
        # Direct match on single text nodes
        for pi, t_node, txt in para_texts:
            if pi in giant_para_indices:
                continue
            if txt in ALL_KNOWN_NAMES:
                set_node_text(t_node, name)
        # Also check if any two ADJACENT text nodes in same paragraph form a known name
        import collections
        para_nodes = collections.defaultdict(list)
        for pi, t_node, txt in para_texts:
            if pi in giant_para_indices:
                continue
            para_nodes[pi].append((t_node, txt))
        for pi, nodes in para_nodes.items():
            for i in range(len(nodes) - 1):
                combined = nodes[i][1] + nodes[i+1][1]
                if combined in ALL_KNOWN_NAMES:
                    set_node_text(nodes[i][0], name)
                    set_node_text(nodes[i+1][0], '')
                    break

    # --- Pass 4: Known placeholder titles ---
    if title:
        for pi, t_node, txt in para_texts:
            if txt in KNOWN_TITLES:
                set_node_text(t_node, title)

    # --- Pass 5: Standalone phone numbers (skip giant paragraphs) ---
    if phone:
        clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
        for pi, t_node, txt in para_texts:
            if pi in giant_para_indices:
                continue
            txt_clean = re.sub(r'[\s\-\(\)]', '', txt)
            if re.match(r'^\d{7,16}$', txt_clean) and txt_clean != clean_phone:
                # Skip if looks like a year range or date
                if re.search(r'(?:19|20)\d{2}\s*[-–]\s*(?:19|20)?\d{2}', txt):
                    continue
                if re.search(r'\d{4}年', txt):
                    continue
                if re.search(r'\d{4}\.\d{1,2}', txt):
                    continue
                is_replaced = False
                for j in range(max(0, i - 2), i):
                    if j < len(para_texts):
                        pj, _, pj_txt = para_texts[j]
                        if pj == pi and any(pj_txt.startswith(lp) for lp in LABEL_PREFIXES):
                            is_replaced = True
                            break
                if not is_replaced:
                    set_node_text(t_node, clean_phone)

    # --- Pass 6: Standalone emails (skip giant paragraphs) ---
    if email:
        email_pat = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
        for pi, t_node, txt in para_texts:
            if pi in giant_para_indices:
                continue
            if email_pat.match(txt) and txt != email:
                set_node_text(t_node, email)

    # --- Pass 7: Summary/description blocks (skip giant paragraphs) ---
    if summary:
        summary_filled = False
        for pi, t_node, txt in para_texts:
            if summary_filled:
                break
            if pi in giant_para_indices:
                continue
            for ph in SUMMARY_PLACEHOLDERS:
                if txt == ph or (len(ph) > 8 and ph in txt):
                    set_node_text(t_node, summary)
                    summary_filled = True
                    break
            for ph in SUMMARY_PLACEHOLDERS:
                if txt == ph:
                    set_node_text(t_node, summary)
                    summary_filled = True
                    break

    # --- Pass 8: Dynamic section header detection and data fill ---
    # For each data section we have, find the template section and replace content
    section_data_map = [
        (edus, 'education', ['school', 'major', 'degree']),
        (exps, 'experience', ['company', 'role']),
        (projs, 'projects', ['name', 'role']),
        (research_list, 'research', ['name', 'role']),
        (sw_list, 'studentWork', ['organization', 'role']),
    ]

    # Collect all section header positions and their types (skip giant paragraphs)
    section_positions = []
    for pi, t_node, txt in para_texts:
        if pi in giant_para_indices:
            continue
        for stype, headers in SECTION_PATTERNS.items():
            if txt in headers:
                section_positions.append((pi, stype, txt))
                break

    section_positions.sort(key=lambda x: x[0])

    def find_section_text(pi_start, pi_end, keyword_list, consumed, field_type=None):
        """Find text nodes in paragraph range that match any keyword."""
        for pi, t_node, txt in para_texts:
            if pi < pi_start or pi > pi_end:
                continue
            if (pi, txt) in consumed:
                continue
            # Skip nodes whose text was already modified by earlier passes
            current_text = (t_node.text or '').strip()
            if current_text != txt:
                continue
            for kw in keyword_list:
                if txt.startswith(kw) and (':' in txt or '：' in txt):
                    parts = re.split(r'[：:]', txt, maxsplit=1)
                    if len(parts) == 2:
                        consumed.add((pi, txt))
                        return t_node, pi, kw, True
                if txt == kw:
                    consumed.add((pi, txt))
                    return t_node, pi, kw, False
                # For company/org/role fields, also match keywords embedded in text
                if field_type in ('company', 'organization', 'role') and kw in txt and len(kw) >= 2:
                    consumed.add((pi, txt))
                    return t_node, pi, kw, False
        return None, -1, '', False

    # For each section type that exists in BOTH data and template, fill it
    for section_data, stype, fields in section_data_map:
        if not section_data or stype not in template_sections:
            continue

        # Find section header position
        header_pi = None
        for hp, hs, _ in section_positions:
            if hs == stype:
                header_pi = hp
                break
        if header_pi is None:
            continue

        # Determine end of section (next section header or end)
        end_pi = len(paragraphs)
        for hp, hs, _ in section_positions:
            if hp > header_pi:
                end_pi = hp
                break

        consumed = set()
        for item in section_data:
            for field in fields:
                val = item.get(field, '')
                if not val:
                    continue
                key_list = FIELD_KEYWORDS.get(field, [field])
                t_node, pi, kw, is_colon = find_section_text(header_pi, end_pi, key_list, consumed, field)
                if t_node:
                    if is_colon:
                        prefix = kw
                        separator = t_node.text[len(kw)] if len(t_node.text) > len(kw) else '：'
                        t_node.text = f'{prefix}{separator}{val}'
                    else:
                        # Find the adjacent value text node
                        found = False
                        for j, (nj, next_node, next_txt) in enumerate(para_texts):
                            if nj == pi and next_txt == kw:
                                for k in range(j + 1, len(para_texts)):
                                    nk, nn, nt = para_texts[k]
                                    if nk != nj:
                                        break
                                    if nt and len(nt) < 80:
                                        next_node.text = val
                                        found = True
                                        break
                        if found:
                            break

    # --- Pass 9: Direct keyword scan for company/school text nodes ---
    # Simple approach: scan ALL text nodes for company/school keywords and replace in order
    exp_assigned = 0
    edu_assigned = 0
    for pi, t_node, txt in para_texts:
        if exp_assigned >= len(exps) and edu_assigned >= len(edus):
            break
        txt_clean = txt.strip()
        if not txt_clean or len(txt_clean) < 4:
            continue
        # Skip nodes whose text was already modified by earlier passes
        current_text = (t_node.text or '').strip()
        if current_text != txt:
            continue
        is_school = any(kw in txt_clean for kw in ALL_SCHOOL_KEYWORDS)
        is_company = any(kw in txt_clean for kw in ALL_COMPANY_KEYWORDS)
        if is_school:
            if edu_assigned < len(edus):
                val = edus[edu_assigned].get('school', '')
                if val and txt_clean != val:
                    for kw in ALL_SCHOOL_KEYWORDS:
                        idx = txt_clean.find(kw)
                        if idx >= 0:
                            start = max(0, txt_clean.rfind(' ', 0, idx) + 1) if ' ' in txt_clean[:idx] else 0
                            end = idx + len(kw)
                            candidate = txt_clean[start:end]
                            if candidate in txt_clean and candidate != val:
                                t_node.text = txt.replace(candidate, val, 1)
                                edu_assigned += 1
                                break
        elif is_company and exp_assigned < len(exps):
            val = exps[exp_assigned].get('company', '')
            if val and txt_clean != val:
                for kw in ALL_COMPANY_KEYWORDS:
                    idx = txt_clean.find(kw)
                    if idx >= 0:
                        # Find word boundaries around the keyword
                        start = idx
                        while start > 0 and txt_clean[start-1] not in ' \t\n':
                            start -= 1
                        end = idx + len(kw)
                        while end < len(txt_clean) and txt_clean[end] not in ' \t\n':
                            end += 1
                        candidate = txt_clean[start:end]
                        if candidate in txt_clean and candidate != val:
                            t_node.text = txt.replace(candidate, val, 1)
                            exp_assigned += 1
                            break

    # --- Pass 9b: Compact education/experience entries ---
    if edus:
        for pi, t_node, txt in para_texts:
            if len(txt) > 8 and len(txt) < 60:
                has_school_kw = any(kw in txt for kw in ['大学', '学院', '学校'])
                has_degree = any(kw in txt for kw in ['本科', '硕士', '博士', '学士', '专科', '（本科）', '（硕士）', '（博士）'])
                if has_school_kw and has_degree:
                    val = edus[0].get('school', '')
                    if val:
                        for kw in ['大学', '学院', '学校']:
                            idx = txt.find(kw)
                            if idx > 0:
                                start = max(0, txt.rfind(' ', 0, idx) + 1)
                                school_in_template = txt[start:idx + len(kw)]
                                if school_in_template in txt:
                                    t_node.text = txt.replace(school_in_template, val, 1)
                                break

    # --- Pass 9c: Adjacent compact entries (school + major/degree in separate nodes) ---
    if edus:
        edu_val = edus[0].get('school', '')
        if edu_val:
            for i, (pi, t_node, txt) in enumerate(para_texts):
                txt_clean = txt.strip()
                if any(kw in txt_clean for kw in ['大学', '学院']) and len(txt_clean) < 20:
                    # Check if next text node in same paragraph has degree keyword
                    for j in range(i + 1, min(i + 3, len(para_texts))):
                        pj, _, nt = para_texts[j]
                        if pj != pi:
                            break
                        if any(kw in nt for kw in ['（本科）', '（硕士）', '（博士）', '本科', '专业']):
                            set_node_text(t_node, edu_val)
                            break

    # --- Pass 10: Honors fill (text-node-level aware) ---
    if honors_list and 'honors' in template_sections:
        HONOR_LABELS = SECTION_PATTERNS['honors']
        honors_text = '\n'.join(
            '• ' + h if not h.startswith('•') and not h.startswith('-') else h
            for h in honors_list
        )
        # Build list of all section header texts for boundary detection
        all_header_texts = set()
        for stype, headers in SECTION_PATTERNS.items():
            all_header_texts.update(headers)

        # Find the honors header index in para_texts (skip giant paragraphs)
        honors_idx = None
        for i, (pi, t_node, txt) in enumerate(para_texts):
            if pi in giant_para_indices:
                continue
            if txt in HONOR_LABELS:
                honors_idx = i
                break
        if honors_idx is not None:
            # Skip past any consecutive duplicate headers
            start_idx = honors_idx + 1
            while start_idx < len(para_texts):
                _, _, st = para_texts[start_idx]
                if st in HONOR_LABELS:
                    start_idx += 1
                else:
                    break
            # Find honor entry nodes after the header
            target_nodes = []

            # Strategy: paragraph-separated honors (entries in separate paragraphs after header)
            hdr_pi = para_texts[honors_idx][0]
            honor_end_pi = len(paragraphs)
            for hp, hs, _ in section_positions:
                if hp > hdr_pi:
                    honor_end_pi = hp
                    break
            for j in range(start_idx, len(para_texts)):
                pj, nj, nt = para_texts[j]
                if pj <= hdr_pi or pj >= honor_end_pi:
                    continue
                if nt in all_header_texts:
                    break
                # Skip basic info labels (name, phone, email etc.)
                if any(nt.startswith(lp) for lp in LABEL_PREFIXES):
                    continue
                # Skip known placeholder names
                if nt in ALL_KNOWN_NAMES:
                    continue
                target_nodes.append((nj, nt))

            # If paragraph-separated found nothing, try inline within same paragraph
            if not target_nodes:
                total_len = 0
                for j in range(start_idx, len(para_texts)):
                    pj, nj, nt = para_texts[j]
                    if pj != hdr_pi:
                        break
                    if nt in all_header_texts and nt not in HONOR_LABELS:
                        break
                    if any(nt.startswith(lp) for lp in LABEL_PREFIXES):
                        break
                    if len(nt) > 40:
                        break
                    total_len += len(nt)
                    if total_len > 120:
                        break
                    target_nodes.append((nj, nt))

            if target_nodes:
                for t_node, _ in target_nodes:
                    t_node.text = ''
                target_nodes[0][0].text = honors_text

    # Serialize
    modified_xml = ET.tostring(root, encoding='unicode')

    buffer = io.BytesIO()
    with zipfile.ZipFile(template_path, 'r') as zin:
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data_in = zin.read(item.filename)
                if item.filename == 'word/document.xml':
                    data_in = modified_xml.encode('utf-8')
                zout.writestr(item, data_in)

    with open(output_path, 'wb') as f:
        f.write(buffer.getvalue())

    print(f"已填充模板: {output_path}")
    print(f"检测到模板板块: {', '.join(sorted(template_sections))}")
    return True


if __name__ == '__main__':
    try:
        if len(sys.argv) < 4:
            print("用法: python3 docx_filler_v2.py <data_json> <template_path> <output_path>")
            sys.exit(1)

        data_path = sys.argv[1]
        template_path = sys.argv[2]
        output_path = sys.argv[3]

        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        success = fill_template(template_path, data, output_path)
        if not success:
            sys.exit(1)
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)
