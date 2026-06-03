import sys
import os
import json
import re
import zipfile
import io
import xml.etree.ElementTree as ET


def fill_template(template_path, data, output_path):
    with zipfile.ZipFile(template_path, 'r') as zin:
        doc_xml = zin.read('word/document.xml').decode('utf-8')

    basic = data.get('basicInfo', {})
    edus = data.get('education', [])
    exps = data.get('experience', [])
    projs = data.get('projects', [])
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
    paragraphs = list(root.iter(f'{{{NS}}}p'))
    para_texts = []

    for pi, p in enumerate(paragraphs):
        for t in p.iter(f'{{{NS}}}t'):
            txt = (t.text or '').strip()
            if txt:
                para_texts.append((pi, t, txt))

    # Label matching: check if text contains a label as prefix (colon-separated)
    LABEL_PREFIXES = {
        '姓名': 'name', '名字': 'name',
        '手机': 'phone', '电话': 'phone',
        '邮箱': 'email', 'Email': 'email', 'E-mail': 'email',
        '微信': 'wechat', 'WeChat': 'wechat',
        '地址': 'address',
        '求职意向': 'title', '目标职位': 'title', '应聘职位': 'title',
        '个人总结': 'summary', '自我评价': 'summary', '个人简介': 'summary',
    }

    USER_FIELDS = {
        'name': name, 'phone': phone, 'email': email,
        'wechat': wechat, 'title': title, 'summary': summary, 'address': address,
    }

    def set_node_text(node, val):
        node.text = val

    # --- Pass 1: Label+value in same text node (colon-separated) ---
    for pi, t_node, txt in para_texts:
        for prefix, field in LABEL_PREFIXES.items():
            val = USER_FIELDS.get(field)
            if not val:
                continue
            if txt.startswith(prefix) and ('：' in txt or ':' in txt):
                # Extract the value part after colon
                parts = re.split(r'[：:]', txt, maxsplit=1)
                if len(parts) >= 2:
                    # Replace the entire text with new label+value
                    separator = txt[len(prefix)] if len(txt) > len(prefix) else '：'
                    # Try to preserve format
                    new_txt = f'{prefix}{separator}{val}'
                    set_node_text(t_node, new_txt)
                    break

    # --- Pass 2: Label+value in adjacent text nodes ---
    for i, (pi, t_node, txt) in enumerate(para_texts):
        for label_text, field in LABEL_PREFIXES.items():
            val = USER_FIELDS.get(field)
            if not val:
                continue
            if txt == label_text:
                # Look forward in same paragraph for the value
                for j in range(i + 1, len(para_texts)):
                    nj, next_node, next_txt = para_texts[j]
                    if nj != pi:
                        break
                    # Check this isn't another label
                    is_other_label = any(
                        next_txt.startswith(lp) for lp in LABEL_PREFIXES
                    )
                    if is_other_label:
                        continue
                    if next_txt and len(next_txt) < 80:
                        set_node_text(next_node, val)
                        break

    # --- Pass 3: Known placeholder names ---
    if name:
        KNOWN_NAMES = [
            '宋艾嘉', '肖颖馨', '韩志弘', '李自强', '张三', '李四', '王五',
            '赵六', '关睢尔', '陈小明', '刘小红', '周洁', '吴芳',
        ]
        for pi, t_node, txt in para_texts:
            if txt in KNOWN_NAMES:
                set_node_text(t_node, name)

    # --- Pass 4: Known placeholder titles ---
    if title:
        KNOWN_TITLES = [
            '平面设计', '网页设计师', '市场拓展/策划专员', 'UI设计师',
            '产品经理', '软件工程师', '前端工程师', '后端工程师',
            '销售员岗位', '市场专员', '销售专员',
        ]
        for pi, t_node, txt in para_texts:
            if txt in KNOWN_TITLES:
                set_node_text(t_node, title)

    # --- Pass 5: Standalone phone numbers ---
    if phone:
        clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
        for pi, t_node, txt in para_texts:
            # Check: text is purely digits with optional separators, 7-16 chars
            txt_clean = re.sub(r'[\s\-\(\)]', '', txt)
            if re.match(r'^\d{7,16}$', txt_clean) and txt_clean != clean_phone:
                # Make sure it's not already replaced (part of a label+value pair)
                is_already_replaced = False
                for j in range(max(0, i - 2), i):
                    if j < len(para_texts):
                        pj, _, pj_txt = para_texts[j]
                        if pj == pi and any(
                            pj_txt.startswith(lp) for lp in LABEL_PREFIXES
                        ):
                            is_already_replaced = True
                            break
                if not is_already_replaced:
                    set_node_text(t_node, clean_phone)

    # --- Pass 6: Standalone emails ---
    if email:
        email_pat = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
        for pi, t_node, txt in para_texts:
            if email_pat.match(txt) and txt != email:
                set_node_text(t_node, email)

    # --- Pass 7: Summary/description blocks ---
    if summary:
        SUMMARY_PLACEHOLDERS = [
            '有扎实的美术基础和审美眼光', '负责辖区智能家居产品',
            '项目进行期', '工作描述', '负责项目的推广',
            '良好的公共关系意识', '介绍大学学习阶段',
            '良好的心态和责任感',
        ]
        for pi, t_node, txt in para_texts:
            if len(txt) > 15:
                for ph in SUMMARY_PLACEHOLDERS:
                    if ph in txt:
                        set_node_text(t_node, summary)
                        break

    # --- Pass 8: Section fill (education/experience) ---
    _fill_section_nodes(para_texts, edus, {
        'school': ['学校', '大学', '学院', 'School'],
        'major': ['专业', 'Major'],
        'degree': ['本科', '硕士', '博士', '学士', '专科', '学历', 'Degree'],
    })
    _fill_section_nodes(para_texts, exps, {
        'company': ['公司', '科技', '企业', '集团', '网络', '有限', '工作室', 'Company'],
    })

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
    return True


def _fill_section_nodes(para_texts, data_array, field_keywords):
    """Fill section data by finding labels and replacing adjacent/same-node values."""
    for item in data_array:
        for field, keywords in field_keywords.items():
            val = item.get(field, '')
            if not val:
                continue
            for i, (pi, t_node, txt) in enumerate(para_texts):
                for kw in keywords:
                    # Check same-node: "学校：XXX" pattern
                    if txt.startswith(kw) and ('：' in txt or ':' in txt):
                        parts = re.split(r'[：:]', txt, maxsplit=1)
                        if len(parts) == 2:
                            separator = txt[len(kw)]
                            t_node.text = f'{kw}{separator}{val}'
                            break
                    # Check adjacent: "学校"→"XXX"
                    if txt == kw:
                        for j in range(i + 1, len(para_texts)):
                            nj, next_node, next_txt = para_texts[j]
                            if nj != pi:
                                break
                            if next_txt and len(next_txt) < 80:
                                next_node.text = val
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
