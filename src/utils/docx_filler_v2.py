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

    def collect_text_nodes(r):
        return [t for t in r.iter(f'{{{NS}}}t')]

    def node_text(n):
        return n.text or ''

    def set_node_text(n, val):
        n.text = val

    def find_and_replace(root_node, pattern, replacement, limit=0):
        count = 0
        for t in collect_text_nodes(root_node):
            if limit > 0 and count >= limit:
                break
            txt = node_text(t)
            if txt and txt.strip() and re.search(pattern, txt):
                new_text = re.sub(pattern, replacement, txt)
                set_node_text(t, new_text)
                count += 1

    def find_and_replace_exact(root_node, old_text, new_text):
        for t in collect_text_nodes(root_node):
            if node_text(t).strip() == old_text:
                set_node_text(t, new_text)

    name = basic.get('name', '')
    phone = basic.get('phone', '')
    email = basic.get('email', '')
    wechat = basic.get('wechat', '')
    title = basic.get('title', '')
    github = basic.get('github', '')
    summary = basic.get('summary', '')

    # Name replacement
    if name and len(name) >= 2:
        placeholder_names = ['宋艾嘉', '肖颖馨', '韩志弘', '李自强', '姓名', '张三', '李四', '王五']
        for t in collect_text_nodes(root):
            if node_text(t).strip() in placeholder_names:
                set_node_text(t, name)

    # Phone replacement - 11-digit mobile starting with 1
    if phone:
        clean_phone = re.sub(r'[\s\-]', '', phone)
        find_and_replace(root, r'1[3-9]\d{9}', clean_phone, limit=3)
        find_and_replace(root, r'(?:电话|手机|Phone|TEL|tel|Tel)[:：]?\s*[\d\s\-]{7,15}', f'电话: {clean_phone}', limit=3)
        find_and_replace(root, r'(?:电话号码|手机号码)[:：]?\s*[\d\s\-]{7,15}', f'手机号码: {clean_phone}', limit=3)

    # Email replacement
    if email:
        find_and_replace(root, r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', email, limit=3)
        find_and_replace(root, r'(?:邮箱|Email|邮箱地址|E-mail)[:：]?\s*[^\s,，;；\n]+', f'邮箱: {email}', limit=3)

    # WeChat replacement
    if wechat:
        find_and_replace(root, r'(微信|WeChat)[:：]?\s*\S+', f'微信: {wechat}', limit=2)

    # Title replacement
    if title:
        for old in ['平面设计', '网页设计师', '市场拓展/策划专员']:
            find_and_replace_exact(root, old, title)

    # Summary - replace long placeholder descriptions
    if summary:
        long_placeholders = [
            '有扎实的美术基础和审美眼光', '负责辖区智能家居产品',
            '项目进行期', '工作描述', '负责项目的推广'
        ]
        for t in collect_text_nodes(root):
            txt = node_text(t).strip()
            if txt and len(txt) > 10:
                for ph in long_placeholders:
                    if ph in txt:
                        set_node_text(t, summary)
                        break

    # Education section
    def fill_section(section_keywords, data_array, field_keywords):
        if not data_array:
            return
        text_nodes = collect_text_nodes(root)
        section_starts = []
        for i, t in enumerate(text_nodes):
            txt = node_text(t).strip()
            for kw in section_keywords:
                if txt == kw or txt.startswith(kw):
                    section_starts.append(i)
                    break

        if not section_starts:
            return

        next_section_kws = ['教育背景', '工作经历', '项目经验', '专业技能', '自我评价', '联系方式', '个人信息']

        for data_idx, item in enumerate(data_array):
            if data_idx >= len(section_starts):
                break
            start = section_starts[data_idx]
            end = len(text_nodes)
            for i in range(start + 1, len(text_nodes)):
                txt = node_text(text_nodes[i]).strip()
                if txt in next_section_kws and i not in section_starts:
                    end = i
                    break

            for field, keywords in field_keywords:
                val = item.get(field, '')
                if not val:
                    continue
                for i in range(start + 1, end):
                    txt = node_text(text_nodes[i]).strip()
                    if any(kw in txt for kw in keywords) and len(txt) > 3:
                        set_node_text(text_nodes[i], val)
                        break

    fill_section(
        ['教育背景', '教育', '修业背景'],
        edus,
        [('school', ['大学', '学院', '本科', '硕士', '博士', '学士'])]
    )

    fill_section(
        ['工作经历', '工作', '生平履历', '历任履历'],
        exps,
        [('company', ['公司', '科技', '企业', '集团', '网络', '有限'])]
    )

    fill_section(
        ['项目经验', '项目', '专研项目'],
        projs,
        [('name', ['项目', '系统', '平台'])]
    )

    # Serialize and write
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
