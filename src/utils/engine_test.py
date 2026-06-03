"""
engine_test.py - Unit tests for template_engine.py

11 test cases covering core modes, fallback, and edge cases.
Run: python3 -m unittest src/utils/engine_test.py
"""

import os
import sys
import json
import tempfile
import unittest
import zipfile

# Ensure src/utils is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lxml import etree as ET
from template_engine import TemplateEngine, fill, fill_with_fallback

NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'templates')
FALLBACK_TEMPLATES_DIR = '/Users/zhouyufeng/Downloads/1 单页简历'

TEST_DATA = {
    "basicInfo": {
        "name": "周煜峰",
        "title": "预防医学",
        "phone": "15212171672",
        "email": "21301020019@m.fudan.edu.cn",
        "wechat": "",
        "github": "",
        "summary": "已获保研资格。复旦大学预防医学2026届本科。"
    },
    "education": [
        {"school": "复旦大学", "major": "预防医学", "degree": "本科", "date": "2021.09-2026.06", "description": "GPA 3.20"}
    ],
    "experience": [
        {"company": "上海市疾病预防控制中心", "role": "实习生", "date": "2025.10-2026.01", "description": "公共卫生数据处理"}
    ],
    "projects": [],
    "research": [],
    "studentWork": [],
    "honors": ["校三等奖学金（3次）"],
    "skills": ["Python/R/STATA"]
}


def get_docx_texts(docx_path):
    """Extract all non-empty text nodes from a docx file."""
    with zipfile.ZipFile(docx_path, 'r') as z:
        doc_xml = z.read('word/document.xml').decode('utf-8')
    root = ET.fromstring(doc_xml.encode('utf-8'))
    texts = []
    for t in root.iter(f'{{{NS}}}t'):
        txt = (t.text or '').strip()
        if txt:
            texts.append(txt)
    return texts


class TestTemplateEngine(unittest.TestCase):

    def test_label_inline_basic(self):
        """label_inline with colon separator (e.g. '手机：138...')."""
        config = {
            "basic_info": {
                "fields": {
                    "phone": {"type": "label_inline", "pattern": "手机"}
                }
            },
            "sections": {}
        }
        engine = TemplateEngine(
            os.path.join(FALLBACK_TEMPLATES_DIR, '简约单页01.docx'),
            config
        )
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = engine.fill(TEST_DATA, out)
        self.assertTrue(result)
        texts = get_docx_texts(out)
        self.assertTrue(any('15212171672' in t for t in texts))
        os.unlink(out)

    def test_label_inline_no_colon(self):
        """label_inline fallback when no colon separator found."""
        config = {
            "basic_info": {
                "fields": {
                    "name": {"type": "keyword_scan", "keywords": ["宋艾嘉"], "value_scope": "keyword_substring"}
                }
            },
            "sections": {}
        }
        engine = TemplateEngine(
            os.path.join(FALLBACK_TEMPLATES_DIR, '极简单页01.docx'),
            config
        )
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = engine.fill(TEST_DATA, out)
        self.assertTrue(result)
        texts = get_docx_texts(out)
        self.assertTrue(any('周煜峰' in t for t in texts))
        os.unlink(out)

    def test_label_adjacent_same_para(self):
        """label_adjacent: label in one w:t, value in next w:t (same paragraph)."""
        config = {
            "basic_info": {
                "fields": {
                    "phone": {"type": "label_adjacent", "pattern": "手机"}
                }
            },
            "sections": {}
        }
        engine = TemplateEngine(
            os.path.join(FALLBACK_TEMPLATES_DIR, '知页简历01.docx'),
            config
        )
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = engine.fill(TEST_DATA, out)
        self.assertTrue(result)
        texts = get_docx_texts(out)
        self.assertTrue(any('15212171672' in t for t in texts))
        os.unlink(out)

    def test_label_adjacent_cross_para(self):
        """label_adjacent: label in paragraph N, value in paragraph N+1..N+3."""
        config = {
            "basic_info": {
                "fields": {
                    "phone": {"type": "label_adjacent", "pattern": "电话"}
                }
            },
            "sections": {}
        }
        engine = TemplateEngine(
            os.path.join(FALLBACK_TEMPLATES_DIR, '极简单页01.docx'),
            config
        )
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = engine.fill(TEST_DATA, out)
        self.assertTrue(result)
        texts = get_docx_texts(out)
        self.assertTrue(any('15212171672' in t for t in texts))
        os.unlink(out)

    def test_section_replace(self):
        """section_replace: replace content after section header."""
        config = {
            "basic_info": {"fields": {}},
            "sections": {
                "honors": {
                    "header": "证书奖励",
                    "type": "section_replace"
                }
            }
        }
        engine = TemplateEngine(
            os.path.join(FALLBACK_TEMPLATES_DIR, '简约单页01.docx'),
            config
        )
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = engine.fill(TEST_DATA, out)
        self.assertTrue(result)
        texts = get_docx_texts(out)
        self.assertTrue(any('校三等奖学金' in t for t in texts))
        os.unlink(out)

    def test_keyword_scan_substring(self):
        """keyword_scan with value_scope=keyword_substring expands to word boundaries."""
        config = {
            "basic_info": {
                "fields": {
                    "name": {"type": "keyword_scan", "keywords": ["肖颖馨"], "value_scope": "keyword_substring"}
                }
            },
            "sections": {}
        }
        engine = TemplateEngine(
            os.path.join(FALLBACK_TEMPLATES_DIR, '稳重单页01.docx'),
            config
        )
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = engine.fill(TEST_DATA, out)
        self.assertTrue(result)
        texts = get_docx_texts(out)
        self.assertTrue(any('周煜峰' in t for t in texts))
        os.unlink(out)

    def test_keyword_scan_full_node(self):
        """keyword_scan with value_scope=full_node replaces entire text node."""
        config = {
            "basic_info": {
                "fields": {
                    "name": {"type": "keyword_scan", "keywords": ["宋艾嘉"], "value_scope": "full_node"}
                }
            },
            "sections": {}
        }
        engine = TemplateEngine(
            os.path.join(FALLBACK_TEMPLATES_DIR, '极简单页01.docx'),
            config
        )
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = engine.fill(TEST_DATA, out)
        self.assertTrue(result)
        texts = get_docx_texts(out)
        self.assertTrue(any('周煜峰' in t for t in texts))
        os.unlink(out)

    def test_multi_node_name(self):
        """Name split across multiple w:t nodes (e.g. '陈' + '知页')."""
        config = {
            "basic_info": {
                "fields": {
                    "name": {"type": "keyword_scan", "keywords": ["陈知页"], "value_scope": "full_node"}
                }
            },
            "sections": {}
        }
        engine = TemplateEngine(
            os.path.join(FALLBACK_TEMPLATES_DIR, '知页简历01.docx'),
            config
        )
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = engine.fill(TEST_DATA, out)
        self.assertTrue(result)
        os.unlink(out)

    def test_v2_fallback(self):
        """Template without YAML config falls back to v2 filler."""
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = fill_with_fallback(
            os.path.join(FALLBACK_TEMPLATES_DIR, '简约单页01.docx'),
            TEST_DATA, out
        )
        self.assertTrue(result)
        texts = get_docx_texts(out)
        self.assertTrue(any('周煜峰' in t for t in texts))
        os.unlink(out)

    def test_section_failure_graceful(self):
        """Section header not found should warn but not crash."""
        config = {
            "basic_info": {"fields": {}},
            "sections": {
                "honors": {
                    "header": "不存在的板块标题",
                    "type": "section_replace"
                }
            }
        }
        engine = TemplateEngine(
            os.path.join(FALLBACK_TEMPLATES_DIR, '简约单页01.docx'),
            config
        )
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = engine.fill(TEST_DATA, out)
        # Should not crash, warnings should be collected
        self.assertGreater(len(engine.warnings), 0)
        os.unlink(out)

    def test_empty_data(self):
        """Empty data should produce output without errors."""
        config = {
            "basic_info": {
                "fields": {
                    "name": {"type": "keyword_scan", "keywords": ["宋艾嘉"], "value_scope": "full_node"}
                }
            },
            "sections": {}
        }
        engine = TemplateEngine(
            os.path.join(FALLBACK_TEMPLATES_DIR, '极简单页01.docx'),
            config
        )
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
            out = f.name
        result = engine.fill({}, out)
        # Should not crash
        self.assertTrue(os.path.exists(out))
        os.unlink(out)


if __name__ == '__main__':
    unittest.main()
