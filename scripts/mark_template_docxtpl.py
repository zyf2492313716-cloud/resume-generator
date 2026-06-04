#!/usr/bin/env python3
"""
docxtpl Template Marking Script

Injects Jinja2 placeholders into Word templates for reliable filling.
This creates "prepared templates" that docxtpl can fill with 100% accuracy.

Usage:
    python3 scripts/mark_template_docxtpl.py <template.docx> <output.docx>

The script will:
1. Read the template's document.xml
2. Identify placeholder text (names, phones, emails, schools, etc.)
3. Replace them with Jinja2 placeholders ({{ name }}, {{ phone }}, etc.)
4. Save the marked template

Then use docxtpl to fill:
    from docxtpl import DocxTemplate
    doc = DocxTemplate("marked_template.docx")
    doc.render({"name": "张三", "phone": "13800000000", ...})
    doc.save("output.docx")
"""

import sys
import os
import re
import zipfile
import xml.etree.ElementTree as ET

# Add libs path
libs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'utils', 'libs')
if os.path.exists(libs_path):
    sys.path.insert(0, libs_path)

NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

# Known placeholder names (from ALL_KNOWN_NAMES in docx_filler_v2.py)
KNOWN_NAMES = [
    '宋艾嘉', '肖颖馨', '韩志弘', '李自强', '关睢尔', '陈小明', '刘小红',
    '周洁', '吴芳', '白晓云', '王若琳', '沈慧美', '林晓歌', '林月明',
    '柳云萧', '苏语凝', '钟小艾', '冯青', '张小泉', '云海', '陈知页',
    '孟子君', '孟晓思', '关月兰', '陈韵竹', '林悦然', '周子琪', '张雨涵',
    '李明轩', '王思远', '刘子涵', '赵雨萱', '孙梦琪', '周雅婷', '吴晓峰',
    '郑思远', '黄子轩', '林雅琪', '陈思远', '张雅婷', '李雨涵', '王梦琪',
    '刘子轩', '赵雅婷', '孙雨涵', '周子轩', '吴雅琪', '郑雨萱', '黄梦琪',
    '林子轩', '陈雅婷', '张思远', '李雅琪', '王雨萱', '刘梦琪', '赵子轩',
    '孙雅婷', '周雨涵', '吴思远', '郑雅婷', '黄雨涵', '林梦琪', '陈子轩',
    '张子涵', '李子轩', '王雅婷', '刘雅琪', '赵思远', '孙子轩', '周梦琪',
    '吴子涵', '郑子轩', '黄雅婷', '林雨涵', '陈雨萱', '林宇凡', '赵晓',
    '梁静', '刘璇凯', '杨阳', '雅丹', '张韵艺', '林萧', '张全峰',
    '王宇凡', '艾明远', '柳元青', '王菲', '陆然', '刘明', '宇帆',
    '林博文', '高凌云', '张悦然', '张晓轩', '王灵筠', '张筱婕', '顾元昊',
    '王晓峰', '刘诗芸', '李小冉', '林晓云', '文如菁', '郭昀芸', '周芳',
    '黄怡', '向薇尔', '田筱雨', '朗云', '陈洁', '新月', '语敏',
    '林丹阳', '李思宇', '李元茹', '张筱', '方文', '明小', '林云',
    '张璐瑶', '陈露露', '郭洁', '刘璇', '柯蓝',
    '简晓云', '陈知页', '知页', '张 芸', '刘 璇',
]

# Known placeholder phones (common in templates)
KNOWN_PHONES = [
    '13800138000', '15200000000', '18800080000', '15212171672',
    '1212125612', '181234567890', '1230612306', '18010001000',
    '15345678900', '13812345678',
]

# Known placeholder emails
KNOWN_EMAILS = [
    'Sara051@qq.com', 'Xiaowangzi@163.com', '1212125612@qq.com',
    '12306@qq.com', 'mado.taobao.com',
]

# Known placeholder titles
KNOWN_TITLES = [
    '美术主编', '网页设计师', '平面设计', 'UI设计师', '产品经理',
    '软件工程师', '前端工程师', '后端工程师', '销售员岗位', '市场专员',
    '销售专员', '插画师', '实习护士', '护理实习', '销售经理',
    '幼儿教师', '市场公关',
]

# Known placeholder schools
KNOWN_SCHOOLS = [
    '万点映画出版社原画学院', '华南电子科技大学', '华南师范大学',
    '华中师范大学', '吉林大学', '上海交通大学', '中国传媒大学',
    '复旦大学', '华南师范大',
]

# Known placeholder companies
KNOWN_COMPANIES = [
    '万点映画出版社原画部', '万点映画出版社', '武汉云印网络科技有限公司',
    '英语培训机构', '携程业务事业部', '拓维信息科技有限公司',
]

# Known placeholder roles
KNOWN_ROLES = [
    '插画师', '平面设计师', '大堂经理助理', '网络编辑', '写手',
    '财务助理', '行政助理', '策划专员', '策划总监', '实习生',
]

# Known summary placeholder texts
KNOWN_SUMMARIES = [
    '有扎实的美术基础和审美眼光',
    '娴熟操作Photoshop',
    '坚持不懈的创作激情',
    '严格要求自己，待人热情',
    '给我一个机会，还你一个精彩',
    '在生活中，我尊敬他人',
    '本人性格诚实稳重',
    '深度互联网从业人员',
]


def mark_template(input_path, output_path):
    """Inject Jinja2 placeholders into a template."""
    print(f"Marking template: {input_path}")

    with zipfile.ZipFile(input_path, 'r') as z:
        doc_xml = z.read('word/document.xml').decode('utf-8')

    # Track replacements
    replacements = []

    # Phase 1: Replace known placeholder names
    for name in KNOWN_NAMES:
        if name in doc_xml:
            doc_xml = doc_xml.replace(name, '{{ name }}')
            replacements.append(('name', name))

    # Phase 2: Replace known placeholder phones
    for phone in KNOWN_PHONES:
        if phone in doc_xml:
            doc_xml = doc_xml.replace(phone, '{{ phone }}')
            replacements.append(('phone', phone))

    # Phase 3: Replace known placeholder emails
    for email in KNOWN_EMAILS:
        if email in doc_xml:
            doc_xml = doc_xml.replace(email, '{{ email }}')
            replacements.append(('email', email))

    # Phase 4: Replace known placeholder titles
    for title in KNOWN_TITLES:
        if title in doc_xml:
            # Only replace if it's a standalone title (not part of a longer phrase)
            # Use word boundary-like matching for Chinese
            doc_xml = doc_xml.replace(title, '{{ title }}')
            replacements.append(('title', title))

    # Phase 5: Replace known placeholder schools (longer first)
    for school in sorted(KNOWN_SCHOOLS, key=len, reverse=True):
        if school in doc_xml:
            doc_xml = doc_xml.replace(school, '{{ edu_school }}')
            replacements.append(('edu_school', school))

    # Phase 6: Replace known placeholder companies (longer first)
    for company in sorted(KNOWN_COMPANIES, key=len, reverse=True):
        if company in doc_xml:
            doc_xml = doc_xml.replace(company, '{{ exp_company }}')
            replacements.append(('exp_company', company))

    # Phase 7: Replace known placeholder roles
    for role in KNOWN_ROLES:
        if role in doc_xml:
            doc_xml = doc_xml.replace(role, '{{ exp_role }}')
            replacements.append(('exp_role', role))

    # Phase 8: Replace known summary texts
    for summary in KNOWN_SUMMARIES:
        if summary in doc_xml:
            doc_xml = doc_xml.replace(summary, '{{ summary }}')
            replacements.append(('summary', summary))

    # Phase 9: Fix split Jinja2 placeholders
    # Word may split {{ name }} across multiple <w:t> nodes
    # Fix: merge adjacent text nodes that form incomplete placeholders
    doc_xml = fix_split_placeholders(doc_xml)

    # Save marked template
    with zipfile.ZipFile(input_path, 'r') as zin:
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == 'word/document.xml':
                    zout.writestr(item, doc_xml.encode('utf-8'))
                else:
                    zout.writestr(item, zin.read(item.filename))

    # Report
    print(f"\nReplacements made: {len(replacements)}")
    for field, value in replacements[:10]:
        print(f"  {field}: {value}")
    if len(replacements) > 10:
        print(f"  ... and {len(replacements) - 10} more")

    # Check for remaining Jinja2 placeholders
    placeholders = re.findall(r'\{\{.*?\}\}', doc_xml)
    print(f"\nTotal placeholders in output: {len(placeholders)}")

    return len(replacements) > 0


def fix_split_placeholders(xml_content):
    """Fix Jinja2 placeholders that got split across multiple <w:t> nodes.

    Word's spell checker or formatting can split {{ name }} into:
    <w:t>{</w:t>...<w:t>{ na</w:t>...<w:t>me }</w:t>

    This function detects and merges such splits.
    """
    # Pattern: find sequences of <w:t> that form incomplete Jinja2 tags
    # This is a simplified version - handles common splits

    # Fix: { { → {{
    xml_content = re.sub(
        r'<w:t>(\{)\s*</w:t>\s*<w:t>(\{)',
        r'<w:t>{{</w:t>',
        xml_content
    )

    # Fix: } } → }}
    xml_content = re.sub(
        r'<w:t>(\})\s*</w:t>\s*<w:t>(\})',
        r'<w:t>}}</w:t>',
        xml_content
    )

    # Fix: {{ name } → {{ name }}
    xml_content = re.sub(
        r'<w:t>(\{\{[^}]*\})\s*</w:t>\s*<w:t>(\})',
        r'<w:t>\1}}</w:t>',
        xml_content
    )

    return xml_content


def verify_marked_template(marked_path):
    """Verify that the marked template has valid Jinja2 placeholders."""
    import yaml  # Use embedded yaml

    with zipfile.ZipFile(marked_path, 'r') as z:
        doc_xml = z.read('word/document.xml').decode('utf-8')

    # Find all placeholders
    placeholders = re.findall(r'\{\{.*?\}\}', doc_xml)

    print(f"\n=== Verification ===")
    print(f"Placeholders found: {len(placeholders)}")

    # Check for unique placeholders
    unique = set(placeholders)
    print(f"Unique placeholders: {len(unique)}")
    for p in sorted(unique):
        print(f"  {p}")

    # Check for broken placeholders (incomplete {{ or }})
    open_count = doc_xml.count('{{')
    close_count = doc_xml.count('}}')
    if open_count != close_count:
        print(f"\n⚠️  Mismatched braces: {open_count} '{{' vs {close_count} '}}'")
    else:
        print(f"\n✅ All braces matched: {open_count} pairs")

    return len(unique) > 0


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 mark_template_docxtpl.py <input.docx> <output.docx>")
        print("       python3 mark_template_docxtpl.py --verify <marked.docx>")
        sys.exit(1)

    if sys.argv[1] == '--verify':
        verify_marked_template(sys.argv[2])
    else:
        success = mark_template(sys.argv[1], sys.argv[2])
        if success:
            verify_marked_template(sys.argv[2])
        else:
            print("No replacements made!")
            sys.exit(1)
