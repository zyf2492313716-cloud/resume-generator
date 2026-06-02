import sys
import os
import json
import re
import zipfile
import io
import xml.etree.ElementTree as ET


def fill_template(template_path, data, output_path):
    """Read docx template, replace placeholder text with user data, write output."""
    with zipfile.ZipFile(template_path, 'r') as zin:
        doc_xml = zin.read('word/document.xml').decode('utf-8')

    basic = data.get('basicInfo', {})
    edus = data.get('education', [])
    exps = data.get('experience', [])
    projs = data.get('projects', [])
    skills = data.get('skills', [])

    root = ET.fromstring(doc_xml.encode('utf-8'))
    NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

    def get_all_texts(r):
        return [t for t in r.iter(f'{{{NS}}}t') if t.text]

    # Known placeholder names used across templates
    PLACEHOLDER_NAMES = [
        '宋艾嘉', '肖颖馨', '韩志弘', '李自强', '张三', '李四', '王五',
        '赵六', '孙七', '周八', '吴九', '郑十', '陈小明', '刘小红',
    ]

    # Known placeholder values
    PLACEHOLDER_PHONES = [
        '012301230123', '12345678901', '13800138000', '15912345678',
        '18888888888', '13666666666', '15012345678', '13123456789',
    ]
    PLACEHOLDER_EMAILS = [
        '1906222627@qq.com', 'example@email.com', 'your@email.com',
        'test@example.com', 'resume@email.com', 'name@example.com',
    ]

    name = basic.get('name', '')
    phone = basic.get('phone', '')
    email = basic.get('email', '')
    wechat = basic.get('wechat', '')
    title = basic.get('title', '')
    github = basic.get('github', '')
    summary = basic.get('summary', '')
    address = basic.get('address', '')

    # --- Pass 1: Replace known placeholder names ---
    if name:
        for t in get_all_texts(root):
            txt = t.text.strip()
            if txt in PLACEHOLDER_NAMES:
                t.text = name

    # --- Pass 2: Replace placeholder phone numbers ---
    if phone:
        clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
        for t in get_all_texts(root):
            txt = t.text.strip()
            # Match known placeholder phones
            if txt in PLACEHOLDER_PHONES:
                t.text = clean_phone
            # Match generic phone patterns (7-15 digits, possibly with separators)
            elif re.match(r'^[\d\s\-\(\)]{7,15}$', txt) and len(re.sub(r'\D', '', txt)) >= 7:
                t.text = clean_phone

    # --- Pass 3: Replace placeholder emails ---
    if email:
        for t in get_all_texts(root):
            txt = t.text.strip()
            if txt in PLACEHOLDER_EMAILS:
                t.text = email
            elif re.match(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$', txt):
                t.text = email

    # --- Pass 4: Replace title/position ---
    if title:
        title_placeholders = [
            '平面设计', '网页设计师', '市场拓展/策划专员', 'UI设计师',
            '产品经理', '软件工程师', '前端工程师', '后端工程师',
        ]
        for t in get_all_texts(root):
            txt = t.text.strip()
            if txt in title_placeholders:
                t.text = title

    # --- Pass 5: Replace wechat ---
    if wechat:
        for t in get_all_texts(root):
            txt = t.text.strip()
            if txt.startswith('微信') or txt.startswith('WeChat'):
                t.text = f'微信: {wechat}'

    # --- Pass 6: Replace summary/description blocks ---
    if summary:
        summary_placeholders = [
            '有扎实的美术基础和审美眼光', '负责辖区智能家居产品',
            '项目进行期', '工作描述', '负责项目的推广',
            '在这里输入你的个人简介', '请输入自我评价',
        ]
        for t in get_all_texts(root):
            txt = t.text.strip()
            if len(txt) > 10:
                for ph in summary_placeholders:
                    if ph in txt:
                        t.text = summary
                        break

    # --- Pass 7: Replace address ---
    if address:
        addr_placeholders = ['421 街道名字', '街道名字', '请输入地址']
        for t in get_all_texts(root):
            txt = t.text.strip()
            if txt in addr_placeholders:
                t.text = address

    # --- Pass 8: Fill education section ---
    if edus:
        _fill_section(root, NS, ['教育背景', '教育', '修业背景'], edus,
                      [('school', ['大学', '学院', '学校']),
                       ('major', ['专业', '学科']),
                       ('degree', ['本科', '硕士', '博士', '学士', '专科']),
                       ('time', ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'])])

    # --- Pass 9: Fill experience section ---
    if exps:
        _fill_section(root, NS, ['工作经历', '工作', '实习经历', '生平履历'], exps,
                      [('company', ['公司', '科技', '企业', '集团', '网络', '有限', '工作室']),
                       ('position', ['职位', '岗位', '职务']),
                       ('time', ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'])])

    # --- Pass 10: Fill project section ---
    if projs:
        _fill_section(root, NS, ['项目经验', '项目', '专研项目'], projs,
                      [('name', ['项目', '系统', '平台', 'APP', '网站']),
                       ('role', ['角色', '职责', '负责人']),
                       ('time', ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'])])

    # Serialize and write output
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
    return True


def _fill_section(root, ns, section_keywords, data_array, field_config):
    """Fill a section (education/experience/projects) with data from array."""
    text_nodes = [t for t in root.iter(f'{{{ns}}}t') if t.text]

    # Find section start indices
    section_starts = []
    for i, t in enumerate(text_nodes):
        txt = t.text.strip()
        for kw in section_keywords:
            if txt == kw or (len(txt) <= len(kw) + 4 and kw in txt):
                section_starts.append(i)
                break

    if not section_starts:
        return

    # Find section boundaries (next section header = boundary)
    all_section_kws = ['教育背景', '工作经历', '项目经验', '专业技能', '自我评价',
                       '联系方式', '个人信息', '实习经历', '荣誉奖项', '技能特长']

    for data_idx, item in enumerate(data_array):
        if data_idx >= len(section_starts):
            break

        start = section_starts[data_idx]
        end = len(text_nodes)

        # Find the end of this section
        for i in range(start + 1, len(text_nodes)):
            txt = text_nodes[i].text.strip()
            for kw in all_section_kws:
                if txt == kw and i not in section_starts:
                    end = i
                    break
            if end != len(text_nodes):
                break

        # For each field in the data item, find a matching placeholder in the section
        for field_key, keywords in field_config:
            val = item.get(field_key, '')
            if not val:
                continue
            for i in range(start + 1, end):
                txt = text_nodes[i].text.strip()
                if any(kw in txt for kw in keywords) and len(txt) > 1:
                    text_nodes[i].text = val
                    break


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
