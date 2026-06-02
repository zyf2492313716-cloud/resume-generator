import sys
import os
import json
import re
import zipfile
import shutil
import tempfile

def fill_template(template_path, data, output_path):
    with zipfile.ZipFile(template_path, 'r') as zin:
        doc_xml = zin.read('word/document.xml').decode('utf-8')

    basic = data.get('basicInfo', {})
    edus = data.get('education', [])
    exps = data.get('experience', [])
    projs = data.get('projects', [])
    skills = data.get('skills', [])

    import lxml.etree as ET
    root = ET.fromstring(doc_xml.encode('utf-8'))
    NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    nsmap = {'w': NS}

    all_t_elements = root.findall(f'.//{{{NS}}}_t') or root.findall(f'.//{{{NS}}}t')

    text_nodes = []
    for t_elem in root.iter(f'{{{NS}}}t'):
        text_nodes.append(t_elem)

    def node_text(n):
        return n.text or ''

    def set_node_text(n, val):
        n.text = val

    def should_skip_style_prefix(t):
        p = t.getparent() if hasattr(t, 'getparent') else None
        if p is not None:
            rpr = p.find(f'{{{NS}}}rPr')
            if rpr is not None:
                rfonts = rpr.find(f'{{{NS}}}rFonts')
                if rfonts is not None:
                    ascii_attr = rfonts.get(f'{{{NS}}}ascii', '')
                    if ascii_attr and ascii_attr != '' and '宋体' in ascii_attr:
                        pass
        return False

    text_entries = []
    for t in text_nodes:
        txt = node_text(t)
        if txt and txt.strip():
            text_entries.append((t, txt))

    def find_and_replace_nodes(pattern, replacement, limit=0):
        count = 0
        for t, txt in text_entries:
            if limit > 0 and count >= limit:
                break
            if re.search(pattern, txt):
                new_text = re.sub(pattern, replacement, txt)
                set_node_text(t, new_text)
                count += 1

    def find_and_replace_exact(old_text, new_text):
        count = 0
        for t, txt in text_entries:
            if txt == old_text:
                set_node_text(t, new_text)
                count += 1

    def find_all_text_content():
        segments = []
        for t, txt in text_entries:
            if txt.strip():
                segments.append(txt.strip())
        return segments

    all_texts = find_all_text_content()

    name = basic.get('name', '')
    phone = basic.get('phone', '')
    email = basic.get('email', '')
    wechat = basic.get('wechat', '')
    title = basic.get('title', '')
    github = basic.get('github', '')
    summary = basic.get('summary', '')

    if name and len(name) >= 2:
        for t, txt in text_entries:
            if txt.strip() in ['宋艾嘉', '肖颖馨', '韩志弘', '李自强', '姓名', '张三', '李四', '王五']:
                set_node_text(t, name)
            elif re.match(r'^[\u4e00-\u9fa5]{2,4}$', txt.strip()):
                pass

    if phone:
        phone_patterns = [
            (r'1[3-9]\d{9}', phone),
            (r'\d{3,4}\s*\d{3,4}\s*\d{4}', phone),
            (r'(?:电话|手机|Phone|TEL|tel|Tel)[:：]?\s*[\d\s\-]{7,15}', f'电话: {phone}'),
            (r'(?:电话号码|手机号码)[:：]?\s*[\d\s\-]{7,15}', f'手机号码: {phone}'),
        ]
        for pattern, replacement in phone_patterns:
            find_and_replace_nodes(pattern, replacement, limit=6)

    if email:
        email_patterns = [
            (r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', email),
            (r'(?:邮箱|Email|邮箱地址|E-mail)[:：]?\s*[^\s,，;；\n]+', f'邮箱: {email}'),
        ]
        for pattern, replacement in email_patterns:
            find_and_replace_nodes(pattern, replacement, limit=4)

    if wechat:
        wechat_patterns = [
            (r'(微信|WeChat)[:：]?\s*\S+', f'微信: {wechat}'),
        ]
        for pattern, replacement in wechat_patterns:
            find_and_replace_nodes(pattern, replacement, limit=2)

    if title:
        find_and_replace_exact('平面设计', title)
        find_and_replace_exact('网页设计师', title)
        find_and_replace_exact('市场拓展/策划专员', title)
        for t, txt in text_entries:
            if '意向' in txt or '求职' in txt:
                pass

    for t, txt in text_entries:
        clean = txt.strip()
        if clean in ['宋艾嘉', '肖颖馨', '韩志弘', '李自强'] and name:
            set_node_text(t, name)
        if clean == '宋' and txt.strip() == '宋' and name and len(name) > 0:
            set_node_text(t, name[0] if len(name) > 0 else '宋')
        if clean == '艾 嘉' and name and ' ' in name:
            parts = name.split(' ', 1)
            if len(parts) > 1:
                set_node_text(t, parts[1])

    if summary:
        for t, txt in text_entries:
            clean = txt.strip()
            long_texts = ['有扎实的美术基础和审美眼光', '负责辖区智能家居产品', '项目进行期', '工作描述', '负责项目的推广']
            is_placeholder_desc = any(long in clean for long in long_texts) and len(clean) > 10
            if is_placeholder_desc:
                set_node_text(t, summary)

    if skills:
        skill_items = '；'.join(skills) if isinstance(skills, list) else skills
        for t, txt in text_entries:
            clean = txt.strip()
            for s in ['Word', 'Excel', 'PPT', 'Photoshop', 'Illustrator']:
                if clean == s:
                    pass
            if clean in ['软件', '专业技能', '掌握技能']:
                pass

    def fill_section_from_array(section_keywords, data_array, field_formatters):
        section_starts = []
        for i, (t, txt) in enumerate(text_entries):
            clean = txt.strip()
            for kw in section_keywords:
                if clean == kw or clean.startswith(kw):
                    section_starts.append(i)
                    break

        if not section_starts or not data_array:
            return

        entry_blocks = []
        current_block = []
        in_section = False
        section_end_i = len(text_entries)

        for i, (t, txt) in enumerate(text_entries):
            if i in section_starts:
                if current_block:
                    entry_blocks.append(current_block)
                    current_block = []
                in_section = True
                continue
            if in_section:
                clean = txt.strip()
                is_new_section = False
                for kw in ['教育背景', '工作经历', '项目经验', '专业技能', '自我评价', '联系方式', '个人信息']:
                    if clean == kw and i not in section_starts:
                        is_new_section = True
                        break
                if is_new_section:
                    if current_block:
                        entry_blocks.append(current_block)
                    current_block = []
                    in_section = False
                else:
                    current_block.append(i)

        if current_block:
            entry_blocks.append(current_block)

        if not entry_blocks:
            return

        for data_idx, item in enumerate(data_array):
            if data_idx >= len(entry_blocks):
                break
            block = entry_blocks[data_idx]
            for field, formatter in field_formatters:
                val = item.get(field, '')
                if val:
                    for idx_in_block in block:
                        t_node, txt = text_entries[idx_in_block]
                        clean_txt = txt.strip()
                        if formatter(clean_txt, val):
                            set_node_text(t_node, val)
                            break

    def edu_formatter(clean, val):
        edu_keywords = ['大学', '学院', '本科', '硕士', '博士', '学士']
        return any(kw in clean for kw in edu_keywords) and len(clean) > 3

    def exp_formatter(clean, val):
        exp_keywords = ['公司', '科技', '企业', '集团', '网络', '有限']
        return any(kw in clean for kw in exp_keywords) and len(clean) > 3

    fill_section_from_array(
        ['教育背景', '教育', '修业背景'],
        edus,
        [('school', edu_formatter)]
    )

    fill_section_from_array(
        ['工作经历', '工作', '生平履历', '历任履历'],
        exps,
        [('company', exp_formatter)]
    )

    fill_section_from_array(
        ['项目经验', '项目', '专研项目'],
        projs,
        [('name', lambda c, v: len(c) > 3 and ('项目' in c or '系统' in c or '平台' in c))]
    )

    modified_xml = ET.tostring(root, encoding='unicode')

    temp_dir = tempfile.mkdtemp()
    temp_output = os.path.join(temp_dir, 'filled.docx')
    try:
        shutil.copy2(template_path, temp_output)

        import zipfile as zf_out
        import io
        buffer = io.BytesIO()
        with zf_out.ZipFile(template_path, 'r') as zin:
            with zf_out.ZipFile(buffer, 'w', zf_out.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    data_in = zin.read(item.filename)
                    if item.filename == 'word/document.xml':
                        data_in = modified_xml.encode('utf-8')
                    zout.writestr(item, data_in)

        with open(output_path, 'wb') as f:
            f.write(buffer.getvalue())
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    print(f"已填充模板: {output_path}")
    return True

if __name__ == '__main__':
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
