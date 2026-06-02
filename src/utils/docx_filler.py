import sys
import os
import json
import re
import copy
from docx import Document
from docx.shared import Pt, Inches
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph

sys.stdout.reconfigure(encoding='utf-8')

def clone_paragraph(paragraph, parent):
    p_element = paragraph._p
    new_p = copy.deepcopy(p_element)

    for r in new_p.findall(qn('w:r')):
        for t in r.findall(qn('w:t')):
            t.text = ""

    parent._element.append(new_p)
    return Paragraph(new_p, parent)

def replace_run_text_keep_style(paragraph, match_regex, replace_text):
    text = paragraph.text
    if not re.search(match_regex, text):
        return False

    if len(paragraph.runs) == 1:
        paragraph.runs[0].text = re.sub(match_regex, replace_text, paragraph.runs[0].text)
        return True

    combined_text = "".join([r.text for r in paragraph.runs])
    new_text = re.sub(match_regex, replace_text, combined_text)

    if paragraph.runs:
        paragraph.runs[0].text = new_text
        for r in paragraph.runs[1:]:
            r.text = ""
    return True

def fill_docx_template(data_path, template_path, output_path):
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    basic = data.get('basicInfo', {})
    edus = data.get('education', [])
    exps = data.get('experience', [])
    projs = data.get('projects', [])
    skills = data.get('skills', [])

    if not os.path.exists(template_path):
        print(f"错误: 未找到模板文件 {template_path}")
        return False

    doc = Document(template_path)

    basic_replacements = []

    if basic.get('phone'):
        basic_replacements.append((r'1[3-9]\d{9}', basic['phone']))
        basic_replacements.append((r'(?:电话|手机|联络)[:：]?\s*[^\s,，|]+', f"电话: {basic['phone']}"))

    if basic.get('email'):
        basic_replacements.append((r'[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,6}', basic['email']))
        basic_replacements.append((r'(?:邮箱|Email|邮件)[:：]?\s*[^\s,，|]+', f"邮箱: {basic['email']}"))

    if basic.get('wechat'):
        basic_replacements.append((r'(?:微信|WeChat|wechat)[:：]?\s*[^\s,，|]+', f"微信: {basic['wechat']}"))

    if basic.get('github'):
        basic_replacements.append((r'(?:GitHub|Github|github.com)[:：]?\s*[^\s,，|]+', f"GitHub: {basic['github']}"))

    if basic.get('title'):
        basic_replacements.append((r'(?:意向|求职意向|期望职位|应聘职位)[:：]?\s*[^\s,，|]+', f"求职意向: {basic['title']}"))

    def apply_basic_info(paragraphs):
        name_replaced = False
        if basic.get('name'):
            for p in paragraphs[:5]:
                if p.text.strip() in ["姓名", "张三", "李四", "王五", "示例姓名", "求职者"]:
                    p.text = basic['name']
                    name_replaced = True
                    break

            if not name_replaced:
                max_size = 0
                name_para = None
                for p in paragraphs[:3]:
                    for r in p.runs:
                        if r.font.size and r.font.size > max_size:
                            max_size = r.font.size
                            name_para = p
                if name_para:
                    name_para.text = basic['name']

        for p in paragraphs:
            for regex, rep in basic_replacements:
                replace_run_text_keep_style(p, regex, rep)

    apply_basic_info(doc.paragraphs)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                apply_basic_info(cell.paragraphs)

    def process_dynamic_section(paragraphs, data_list, keyword_trigger, field_mapping_fn):
        if not data_list:
            return

        blocks = []
        in_block = False
        current_block = []

        for i, p in enumerate(paragraphs):
            text = p.text.strip()
            if keyword_trigger(text) and len(text) < 45:
                if in_block and current_block:
                    blocks.append(current_block)
                    current_block = []
                in_block = True
                current_block.append((i, p))
            elif in_block:
                if text == "" or (len(text) < 10 and any(h in text for h in ["工作", "项目", "教育", "技能", "评价"])):
                    blocks.append(current_block)
                    current_block = []
                    in_block = False
                else:
                    current_block.append((i, p))

        if in_block and current_block:
            blocks.append(current_block)

        if not blocks:
            return

        template_block = blocks[-1]
        parent = paragraphs[0]._parent

        for idx, item in enumerate(data_list):
            if idx < len(blocks):
                target_block = blocks[idx]
                field_mapping_fn(target_block, item)
            else:
                new_block_paras = []
                for _, origin_p in template_block:
                    cloned_p = clone_paragraph(origin_p, parent)
                    new_block_paras.append((None, cloned_p))

                field_mapping_fn(new_block_paras, item)

        if len(data_list) < len(blocks):
            for excess_idx in range(len(data_list), len(blocks)):
                for _, excess_p in blocks[excess_idx]:
                    p_element = excess_p._p
                    p_element.getparent().remove(p_element)

    def fill_edu(block_paras, item):
        header_p = block_paras[0][1]
        header_p.text = ""
        run1 = header_p.add_run(f"{item.get('school', '')}  |  {item.get('major', '')} ({item.get('degree', '')})")
        run1.bold = True
        run1.font.size = Pt(11)

        if item.get('date'):
            header_p.add_run(f"      {item['date']}")

        if len(block_paras) > 1 and item.get('description'):
            desc_p = block_paras[1][1]
            desc_p.text = item['description']

            for _, extra_p in block_paras[2:]:
                extra_p.text = ""

    process_dynamic_section(
        doc.paragraphs,
        edus,
        lambda t: "大学" in t or "学院" in t or "校" in t or "学府" in t,
        fill_edu
    )

    def fill_exp(block_paras, item):
        header_p = block_paras[0][1]
        header_p.text = ""
        run1 = header_p.add_run(f"{item.get('company', '')}  |  {item.get('role', '')}")
        run1.bold = True
        run1.font.size = Pt(11)

        if item.get('date'):
            header_p.add_run(f"      {item['date']}")

        if len(block_paras) > 1 and item.get('description'):
            desc_p = block_paras[1][1]
            desc_p.text = item['description']
            for _, extra_p in block_paras[2:]:
                extra_p.text = ""

    process_dynamic_section(
        doc.paragraphs,
        exps,
        lambda t: "公司" in t or "集团" in t or "中心" in t or "行" in t or "企业" in t,
        fill_exp
    )

    def fill_proj(block_paras, item):
        header_p = block_paras[0][1]
        header_p.text = ""
        run1 = header_p.add_run(f"{item.get('name', '')}  |  {item.get('role', '')}")
        run1.bold = True
        run1.font.size = Pt(11)

        if item.get('date'):
            header_p.add_run(f"      {item['date']}")

        if len(block_paras) > 1 and item.get('description'):
            desc_p = block_paras[1][1]
            desc_p.text = item['description']
            for _, extra_p in block_paras[2:]:
                extra_p.text = ""

    process_dynamic_section(
        doc.paragraphs,
        projs,
        lambda t: "项目" in t or "系统" in t or "平台" in t or "软件" in t or "应用" in t,
        fill_proj
    )

    if skills:
        skill_replaced = False
        for i, p in enumerate(doc.paragraphs):
            if any(k in p.text for k in ["技能", "特长", "证书"]) and len(p.text) < 12:
                if i + 1 < len(doc.paragraphs):
                    desc_para = doc.paragraphs[i + 1]
                    desc_para.text = "；".join(skills)
                    skill_replaced = True
                    break

        if not skill_replaced:
            for p in doc.paragraphs:
                if "精通" in p.text or "熟练" in p.text:
                    p.text = "；".join(skills)
                    break

    total_length = sum(len(p.text) for p in doc.paragraphs)
    if total_length > 800:
        for p in doc.paragraphs:
            p_format = p.paragraph_format
            p_format.line_spacing = 1.22
            p_format.space_before = Pt(2)
            p_format.space_after = Pt(2)
            for r in p.runs:
                if r.font.size and r.font.size > Pt(10.5):
                    r.font.size = Pt(10.5)

    doc.save(output_path)
    print(f"Word 模板套用成功: {output_path}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("用法: python3 docx_filler.py <data_json_path> <template_docx_path> <output_docx_path>")
        sys.exit(1)

    data_json = sys.argv[1]
    template_docx = sys.argv[2]
    output_docx = sys.argv[3]

    success = fill_docx_template(data_json, template_docx, output_docx)
    if not success:
        sys.exit(1)
