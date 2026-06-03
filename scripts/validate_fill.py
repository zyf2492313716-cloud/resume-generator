#!/usr/bin/env python3
"""
validate_fill.py - Full validation of all 103 resume templates.

For each .docx template:
  - If .yaml exists → use template_engine
  - If no .yaml → use v2 fallback
  - Check output for 5 key fields: name, phone, school, company, summary

Usage:
  python3 scripts/validate_fill.py                    # validate all templates
  python3 scripts/validate_fill.py --template 简约单页01  # validate single template

Output: CSV to stdout
"""

import os
import sys
import csv
import argparse
import tempfile
import zipfile

# Add src/utils to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'utils'))

from lxml import etree as ET

NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'templates')
FALLBACK_TEMPLATES_DIR = '/Users/zhouyufeng/Downloads/1 单页简历'

TEST_DATA = {
    "basicInfo": {
        "name": "周煜峰",
        "title": "预防医学",
        "phone": "15212171672",
        "email": "21301020019@m.fudan.edu.cn",
        "wechat": "",
        "github": "",
        "summary": "已获保研资格。复旦大学预防医学2026届本科，掌握数据分析与跨学科研究能力。"
    },
    "education": [
        {"school": "复旦大学", "major": "预防医学", "degree": "本科", "date": "2021.09-2026.06", "description": "GPA 3.20/4.0"}
    ],
    "experience": [
        {"company": "上海市疾病预防控制中心", "role": "实习生", "date": "2025.10-2026.01", "description": "公共卫生数据处理"},
        {"company": "上海市第五人民医院", "role": "临床实习", "date": "2024.09-2025.01", "description": "轮转内科、外科、儿科"}
    ],
    "projects": [],
    "research": [
        {"name": "德隆学者科研项目", "role": "项目负责人", "date": "2022.05-2023.05", "description": "职业健康数据分析"},
        {"name": "射阳出生队列数据采集与处理", "role": "核心成员", "date": "2023.05-2023.10", "description": "队列数据管理"}
    ],
    "studentWork": [
        {"organization": "复旦大学学生会枫林办公室权益部", "role": "副部长", "date": "", "description": "权益服务"},
        {"organization": "青年研究中心", "role": "研究助理", "date": "", "description": "调研报告撰写"}
    ],
    "honors": ["校三等奖学金（3次）", "校优秀共青团员（2次）", "上海市科普大赛优秀奖"],
    "skills": ["Python/R/STATA/SPSS数据分析", "Office办公套件", "英语CET-6 470/雅思6.0"]
}


def get_docx_texts(docx_path):
    """Extract all non-empty text from a docx file."""
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            doc_xml = z.read('word/document.xml').decode('utf-8')
        root = ET.fromstring(doc_xml.encode('utf-8'))
        texts = []
        for t in root.iter(f'{{{NS}}}t'):
            txt = (t.text or '').strip()
            if txt:
                texts.append(txt)
        return texts
    except Exception:
        return []


def detect_sections(texts):
    """Detect which section types are present in the template based on header text."""
    section_headers = {
        'education': ['教育背景', '教育经历', '教育背景EDUCATION'],
        'experience': ['工作经历', '工作经验', '实习经历', '工作经历JOB EXPERIENCE'],
        'honors': ['证书奖励', '荣誉证书', '荣誉奖项', '个人荣誉', '获奖经历', '奖项荣誉', '资格证书'],
        'summary': ['自我评价', '个人介绍', '个人简介', '个人总结'],
        'skills': ['专业技能', '职业技能', '掌握技能', '技能SKILLS'],
        'studentWork': ['校内实践', '在校经历', '社团经历', '学生工作'],
    }
    found = []
    for sec, headers in section_headers.items():
        if any(h in ' '.join(texts) for h in headers):
            found.append(sec)
    return found


def check_field(texts, field_type):
    """Check if a field value appears in the output texts."""
    checks = {
        'name': lambda: any('周煜峰' in t for t in texts),
        'phone': lambda: any('15212171672' in t for t in texts),
        'school': lambda: any('复旦大学' in t for t in texts),
        'company': lambda: any('疾病预防控制中心' in t for t in texts),
        'summary': lambda: any('保研' in t or '预防医学2026' in t for t in texts),
    }
    try:
        return checks.get(field_type, lambda: False)()
    except Exception:
        return False


def find_template_path(template_name):
    """Find the .docx file for a template by name."""
    # Try exact match in YAML templates dir
    for ext in ['.docx']:
        path = os.path.join(TEMPLATES_DIR, template_name + ext)
        if os.path.exists(path):
            return path
    # Try fallback templates dir
    for ext in ['.docx']:
        path = os.path.join(FALLBACK_TEMPLATES_DIR, template_name + ext)
        if os.path.exists(path):
            return path
    return None


def validate_single(template_name):
    """Validate a single template. Returns dict with results."""
    from template_engine import fill_with_fallback

    template_path = find_template_path(template_name)
    if not template_path:
        return {
            'template_name': template_name,
            'engine_type': 'N/A',
            'sections': '',
            'name': False, 'phone': False, 'school': False, 'company': False, 'summary': False,
            'score': 0, 'status': 'TEMPLATE_NOT_FOUND'
        }

    config_path = template_path.replace('.docx', '.yaml')
    has_yaml = os.path.exists(config_path)
    engine_type = 'engine' if has_yaml else 'v2'

    with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
        out_path = f.name

    try:
        fill_with_fallback(template_path, TEST_DATA, out_path)
        texts = get_docx_texts(out_path)
        sections = detect_sections(texts)

        results = {}
        for field in ['name', 'phone', 'school', 'company', 'summary']:
            results[field] = check_field(texts, field)

        # Score based on which sections the template actually has
        score = 0
        score += 1 if results['name'] else 0
        score += 1 if results['phone'] else 0
        if 'education' in sections:
            score += 1 if results['school'] else 0
        else:
            score += 1  # N/A
        if 'experience' in sections:
            score += 1 if results['company'] else 0
        else:
            score += 1  # N/A
        if 'summary' in sections:
            score += 1 if results['summary'] else 0
        else:
            score += 1  # N/A

        status = 'OK' if score >= 4 else ('WARN' if score >= 3 else 'FAIL')

        return {
            'template_name': template_name,
            'engine_type': engine_type,
            'sections': '|'.join(sections),
            'name': results['name'],
            'phone': results['phone'],
            'school': results['school'],
            'company': results['company'],
            'summary': results['summary'],
            'score': score,
            'status': status
        }
    except Exception as e:
        return {
            'template_name': template_name,
            'engine_type': engine_type,
            'sections': '',
            'name': False, 'phone': False, 'school': False, 'company': False, 'summary': False,
            'score': 0, 'status': f'ERROR:{e}'
        }
    finally:
        try:
            os.unlink(out_path)
        except Exception:
            pass


def get_all_template_names():
    """Get all template names from both directories."""
    names = set()
    # From YAML templates dir (these have configs)
    if os.path.isdir(TEMPLATES_DIR):
        for f in os.listdir(TEMPLATES_DIR):
            if f.endswith('.docx'):
                names.add(f.replace('.docx', ''))
    # From fallback dir
    if os.path.isdir(FALLBACK_TEMPLATES_DIR):
        for f in os.listdir(FALLBACK_TEMPLATES_DIR):
            if f.endswith('.docx'):
                names.add(f.replace('.docx', ''))
    return sorted(names)


def main():
    parser = argparse.ArgumentParser(description='Validate resume template filling')
    parser.add_argument('--template', type=str, help='Validate a single template by name')
    parser.add_argument('--json', action='store_true', help='Output as JSON instead of CSV')
    args = parser.parse_args()

    if args.template:
        names = [args.template]
    else:
        names = get_all_template_names()

    results = []
    for name in names:
        result = validate_single(name)
        results.append(result)

    if args.json:
        import json
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        writer = csv.DictWriter(sys.stdout, fieldnames=[
            'template_name', 'engine_type', 'sections',
            'name', 'phone', 'school', 'company', 'summary', 'score', 'status'
        ])
        writer.writeheader()
        for r in results:
            writer.writerow(r)

    # Print summary to stderr
    total = len(results)
    engine_count = sum(1 for r in results if r['engine_type'] == 'engine')
    v2_count = sum(1 for r in results if r['engine_type'] == 'v2')
    score_4_plus = sum(1 for r in results if r['score'] >= 4)
    avg_score = sum(r['score'] for r in results) / total if total else 0

    print(f"\n=== Validation Summary ===", file=sys.stderr)
    print(f"Total templates: {total}", file=sys.stderr)
    print(f"Engine (YAML):   {engine_count}", file=sys.stderr)
    print(f"V2 fallback:     {v2_count}", file=sys.stderr)
    print(f"Score >= 4/5:    {score_4_plus} ({score_4_plus*100//total}%)", file=sys.stderr)
    print(f"Average score:   {avg_score:.1f}/5", file=sys.stderr)

    # Count by score
    for score in [5, 4, 3, 2, 1, 0]:
        count = sum(1 for r in results if r['score'] == score)
        if count:
            print(f"  {score}/5: {count} templates", file=sys.stderr)

    sys.exit(0 if score_4_plus >= 90 else 1)


if __name__ == '__main__':
    main()
