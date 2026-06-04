import os
import sys
import re
import zipfile
import io

# 动态引入嵌入的依赖库目录
_libs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'libs')
if os.path.exists(_libs_path):
    sys.path.insert(0, _libs_path)

import lxml.etree as ET

NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS_WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
NS_V = 'urn:schemas-microsoft-com:vml'

# 全局板块关键字
SECTION_PATTERNS = {
    'education': ['教育背景', '教育经历', '修业背景', '教育', 'EDUCATION', 'Education'],
    'experience': ['工作经历', '工作经验', '实习经历', '工作实践', '工作', 'EXPERIENCE', 'Experience', 'JOB EXPERIENCE'],
    'projects': ['项目经验', '项目经历', '专研项目', '项目', 'PROJECTS', 'Projects'],
    'studentWork': ['校内实践', '在校经历', '社团经历', '学生活动', '学生工作', '实践经验'],
    'honors': ['荣誉证书', '荣誉奖项', '证书奖励', '个人荣誉', '获奖经历', '奖项荣誉', '资格证书', '荣誉AWARDS', 'AWARDS'],
    'skills': ['专业技能', '职业技能', '掌握技能', '技能特长', '技能证书', '技能', 'SKILLS', 'Skills'],
    'summary': ['自我评价', '个人介绍', '个人总结', '自我介绍', '个人陈述', '个人简介', '关于我', 'INTRODUCTION'],
    'interests': ['兴趣爱好', '兴趣', '爱好'],
}

# 基础信息已知占位名字
ALL_KNOWN_NAMES = [
    '宋艾嘉', '肖颖馨', '韩志弘', '李自强', '张三', '李四', '王五',
    '赵六', '关睢尔', '陈小明', '刘小红', '周洁', '吴芳',
    '白晓云', '王若琳', '沈慧美', '林晓歌', '林月明', '柳云萧',
    '苏语凝', '钟小艾', '冯青', '张小泉', '云海', '陈知页',
    '孟子君', '孟晓思', '关月兰', '刘璇凯', '张全峰', '张悦然',
]

def parse_pt_to_emu(val_str):
    """Parse pt/in/cm/mm style value and return EMU."""
    if not val_str:
        return 0
    match = re.match(r'([\d.-]+)(pt|in|cm|mm)?', val_str.strip())
    if not match:
        try:
            # 无单位默认为 dxa (1 dxa = 635 EMU)
            return int(float(val_str.strip()) * 635)
        except ValueError:
            return 0
    val = float(match.group(1))
    unit = match.group(2)
    if unit == 'pt':
        return int(val * 12700)
    elif unit == 'in':
        return int(val * 914400)
    elif unit == 'cm':
        return int(val * 360000)
    elif unit == 'mm':
        return int(val * 36000)
    else:
        return int(val * 635)


class SpatialFiller:
    def __init__(self, template_path: str, data: dict):
        self.template_path = template_path
        self.data = data
        self.warnings = []

        with zipfile.ZipFile(template_path, 'r') as z:
            self.doc_xml = z.read('word/document.xml').decode('utf-8')
        
        self.root = ET.fromstring(self.doc_xml.encode('utf-8'))
        
    def _extract_textboxes(self):
        """Extract all non-empty textboxes and map their coordinates (EMU)."""
        txbxs = []
        for txbx in self.root.iter(f'{{{NS_W}}}txbxContent'):
            # Extract own text
            texts = []
            for t in txbx.iter(f'{{{NS_W}}}t'):
                if t.text:
                    texts.append(t.text)
            full_text = "".join(texts).strip()
            if not full_text:
                continue
                
            x, y = None, None
            
            # 1. Check if nested in drawing anchor
            parent = txbx.getparent()
            drawing_node = None
            while parent is not None:
                if parent.tag == f'{{{NS_W}}}drawing':
                    drawing_node = parent
                    break
                parent = parent.getparent()
                
            if drawing_node is not None:
                anchor = drawing_node.find(f'{{{NS_WP}}}anchor')
                if anchor is not None:
                    pos_h = anchor.find(f'{{{NS_WP}}}positionH')
                    pos_v = anchor.find(f'{{{NS_WP}}}positionV')
                    offset_h = pos_h.find(f'{{{NS_WP}}}posOffset') if pos_h is not None else None
                    offset_v = pos_v.find(f'{{{NS_WP}}}posOffset') if pos_v is not None else None
                    if offset_h is not None and offset_h.text:
                        x = int(offset_h.text)
                    if offset_v is not None and offset_v.text:
                        y = int(offset_v.text)
            
            # 2. Check VML shape if drawing didn't yield coordinates
            if x is None or y is None:
                parent = txbx.getparent()
                shape_node = None
                while parent is not None:
                    if parent.tag == f'{{{NS_V}}}shape':
                        shape_node = parent
                        break
                    parent = parent.getparent()
                    
                if shape_node is not None:
                    style = shape_node.get('style', '')
                    style_dict = {}
                    for item in style.split(';'):
                        if ':' in item:
                            parts = item.split(':', 1)
                            style_dict[parts[0].strip().lower()] = parts[1].strip()
                    
                    margin_left = style_dict.get('margin-left') or style_dict.get('left')
                    margin_top = style_dict.get('margin-top') or style_dict.get('top')
                    if margin_left:
                        x = parse_pt_to_emu(margin_left)
                    if margin_top:
                        y = parse_pt_to_emu(margin_top)
            
            txbxs.append({
                'node': txbx,
                'text': full_text,
                'x': x if x is not None else 0,
                'y': y if y is not None else 0
            })
            
        return txbxs

    def _cluster_columns(self, txbxs):
        """Perform 1D DBSCAN-like clustering on X coordinates."""
        if not txbxs:
            return []
        # Sort by X axis
        sorted_txbxs = sorted(txbxs, key=lambda d: d['x'])
        columns = []
        current_col = [sorted_txbxs[0]]
        threshold = 1000000  # 约 2.7 cm
        
        for item in sorted_txbxs[1:]:
            if item['x'] - current_col[-1]['x'] < threshold:
                current_col.append(item)
            else:
                columns.append(current_col)
                current_col = [item]
        columns.append(current_col)
        return columns

    def _parse_inline_header(self, text):
        """Detect if header and content are in the same text block."""
        for sec_type, patterns in SECTION_PATTERNS.items():
            for pat in patterns:
                # Header must be at the beginning of the text block
                if text.startswith(pat):
                    # Strict length / suffix check: e.g. "教育背景\n学校名称" or "教育背景 华中师大"
                    rest = text[len(pat):].strip()
                    if rest:
                        return sec_type, pat, rest
                    else:
                        return sec_type, pat, ""
        return None, None, None

    def fill(self, output_path: str) -> bool:
        txbxs = self._extract_textboxes()
        if not txbxs:
            self.warnings.append("No absolute layout textboxes found.")
            return False

        columns = self._cluster_columns(txbxs)
        basic = self.data.get('basicInfo', {})
        
        # Track filled textbox nodes to prevent double replacement
        filled_nodes = set()

        # Gather user sections
        edus = self.data.get('education', [])
        exps = self.data.get('experience', [])
        projs = self.data.get('projects', [])
        sw_list = self.data.get('studentWork', [])
        honors = self.data.get('honors', [])
        skills = self.data.get('skills', [])

        # Process columns to identify section blocks
        for ci, col in enumerate(columns):
            # Sort boxes in the same column by Y coordinate (top-to-bottom)
            sorted_boxes = sorted(col, key=lambda d: d['y'])
            
            # Scan to find headers and group subsequent boxes under them
            current_section = None
            section_boxes = []
            
            for box in sorted_boxes:
                full_txt = box['text']
                node = box['node']
                
                # Check for explicit standalone header
                is_header = False
                for sec_type, patterns in SECTION_PATTERNS.items():
                    if full_txt in patterns and len(full_txt) < 15:
                        # Found a standalone header box
                        if current_section and section_boxes:
                            self._fill_section_boxes(current_section, section_boxes, filled_nodes)
                        current_section = sec_type
                        section_boxes = []
                        is_header = True
                        filled_nodes.add(node)  # Do not modify header box text
                        break
                        
                if is_header:
                    continue
                    
                # Check for inline header (header + content in same box)
                sec_type, pat, rest = self._parse_inline_header(full_txt)
                if sec_type:
                    # Fill the previous section first
                    if current_section and section_boxes:
                        self._fill_section_boxes(current_section, section_boxes, filled_nodes)
                    
                    # Split this inline box into header part and content part
                    # Modify this node's text by replacing the content portion
                    content_val = self._format_inline_section_value(sec_type)
                    if content_val:
                        # Keep the header text prefix
                        separator = "\n" if "\n" in full_txt else " "
                        self._replace_textbox_text(node, f"{pat}{separator}{content_val}")
                        filled_nodes.add(node)
                    
                    # Reset section context
                    current_section = None
                    section_boxes = []
                    continue
                
                # If currently inside a section, accumulate content boxes
                if current_section:
                    section_boxes.append(box)
                    
            # Fill the last accumulated section of the column
            if current_section and section_boxes:
                self._fill_section_boxes(current_section, section_boxes, filled_nodes)

        # --- Phase 2: Global Basic Info & Fallback Keyword Scan ---
        # Any box not claimed by a major section, or matches regex
        for box in txbxs:
            node = box['node']
            if node in filled_nodes:
                continue
            txt = box['text']
            
            modified = False
            new_txt = txt
            
            # 1. Replace phone numbers (e.g. 13800138000, 152 0032 0007, 138-0000-0000)
            if basic.get('phone'):
                phone_pat = r'1[3-9]\d(?:\s*\d){8}'
                if re.search(phone_pat, new_txt):
                    new_txt = re.sub(phone_pat, basic['phone'], new_txt)
                    modified = True
                    
            # 2. Replace email addresses
            if basic.get('email'):
                email_pat = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
                if re.search(email_pat, new_txt):
                    new_txt = re.sub(email_pat, basic['email'], new_txt)
                    modified = True
                    
            # 3. Replace known placeholder names
            if basic.get('name'):
                for name in ALL_KNOWN_NAMES:
                    if name in new_txt:
                        new_txt = new_txt.replace(name, basic['name'])
                        modified = True
                        break
                        
            # 4. Replace placeholder titles
            if basic.get('title'):
                for title in ['平面设计', '网页设计师', '美术主编', 'UI设计师', '销售员岗位']:
                    if title in new_txt:
                        new_txt = new_txt.replace(title, basic['title'])
                        modified = True
                        break

            if modified:
                self._replace_textbox_text(node, new_txt)
                filled_nodes.add(node)

        # Save filled document XML
        modified_xml = ET.tostring(self.root, encoding='unicode')
        buffer = io.BytesIO()
        with zipfile.ZipFile(self.template_path, 'r') as zin:
            with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    data_in = zin.read(item.filename)
                    if item.filename == 'word/document.xml':
                        data_in = modified_xml.encode('utf-8')
                    zout.writestr(item, data_in)

        with open(output_path, 'wb') as f:
            f.write(buffer.getvalue())
            
        return len(filled_nodes) > 0

    def _replace_textbox_text(self, txbx_node, value):
        """Replace all text run elements inside a textbox with value."""
        t_nodes = list(txbx_node.iter(f'{{{NS_W}}}t'))
        if not t_nodes:
            return
        # Set first text node, clear the rest
        t_nodes[0].text = value
        for t in t_nodes[1:]:
            t.text = ""

    def _format_inline_section_value(self, sec_type):
        """Format a list section as a single string for inline textbox replacement."""
        items = self.data.get(sec_type, [])
        if not items:
            return ""
        lines = []
        for item in items[:2]: # Max 2 entries to fit inline textbox space
            if sec_type == 'education':
                lines.append(f"{item.get('school', '')} | {item.get('major', '')} ({item.get('degree', '')})  {item.get('date', '')}")
            elif sec_type == 'experience':
                lines.append(f"{item.get('company', '')} | {item.get('role', '')}  {item.get('date', '')}")
            elif sec_type == 'projects':
                lines.append(f"{item.get('name', '')} | {item.get('role', '')}  {item.get('date', '')}")
        return "\n".join(lines)

    def _fill_section_boxes(self, sec_type, boxes, filled_nodes):
        """Align data array entries sequentially into sorted content boxes."""
        data_list = self.data.get(sec_type, [])
        if not data_list:
            # Clear placeholder contents if user has no data for this section
            for box in boxes:
                self._replace_textbox_text(box['node'], "")
                filled_nodes.add(box['node'])
            return

        # Special simple replace for honors / skills / interests / summary (non-structural lists)
        if sec_type in ('honors', 'skills', 'interests', 'summary'):
            formatted_text = ""
            if sec_type == 'honors':
                formatted_text = '\n'.join('• ' + h if not h.startswith('•') and not h.startswith('-') else h for h in data_list)
            elif sec_type == 'skills':
                formatted_text = '；'.join(data_list)
            elif sec_type == 'summary':
                formatted_text = data_list if isinstance(data_list, str) else '\n'.join(data_list)
            else:
                formatted_text = '\n'.join(data_list)
                
            if boxes:
                # Put all text in the first box, clear rest
                self._replace_textbox_text(boxes[0]['node'], formatted_text)
                filled_nodes.add(boxes[0]['node'])
                for b in boxes[1:]:
                    self._replace_textbox_text(b['node'], "")
                    filled_nodes.add(b['node'])
            return

        # Structural sections: education, experience, projects, studentWork
        # Map fields to content boxes based on position and key terms
        assigned_indexes = {} # item_index -> field -> box
        
        # We group boxes that belong to the same entry index based on Y distance
        # Boxes closer to each other Y-wise belong to the same entry index
        entry_threshold = 720000 # 2 cm Y-gap
        boxes_by_y = sorted(boxes, key=lambda d: d['y'])
        
        entries_boxes = []
        current_entry = [boxes_by_y[0]]
        for box in boxes_by_y[1:]:
            if box['y'] - current_entry[-1]['y'] < entry_threshold:
                current_entry.append(box)
            else:
                entries_boxes.append(current_entry)
                current_entry = [box]
        entries_boxes.append(current_entry)

        # Map user data items into horizontal/vertical groups
        for entry_idx, user_item in enumerate(data_list):
            if entry_idx >= len(entries_boxes):
                break
            
            entry_box_group = entries_boxes[entry_idx]
            
            # Map specific fields to matching boxes within this entry group
            for box in entry_box_group:
                node = box['node']
                txt = box['text']
                
                # Check target field semantics from template placeholder
                field_matched = None
                
                if sec_type == 'education':
                    if any(w in txt for w in ['大学', '学院', '学校', '吉林', '华中', '复旦']):
                        field_matched = 'school'
                    elif any(w in txt for w in ['专业', '工程', '设计', '管理', '学制']):
                        field_matched = 'major'
                    elif any(w in txt for w in ['本科', '硕士', '博士', '学历', '学位']):
                        field_matched = 'degree'
                    elif any(w in txt for w in ['年', '月', '-', '201', '202']):
                        field_matched = 'date'
                elif sec_type == 'experience':
                    if any(w in txt for w in ['公司', '网络', '科技', '企业', '有限', '医院', '出版社']):
                        field_matched = 'company'
                    elif any(w in txt for w in ['助理', '经理', '策划', '主管', '专员', '设计师', '编辑', '插画师', '实习生']):
                        field_matched = 'role'
                    elif any(w in txt for w in ['年', '月', '-', '201', '202']):
                        field_matched = 'date'
                    elif len(txt) > 20:
                        field_matched = 'description'
                elif sec_type == 'projects':
                    if any(w in txt for w in ['项目', '系统', '平台', '设计', '课题', '研究']):
                        field_matched = 'name'
                    elif any(w in txt for w in ['负责人', '核心', '开发', '研究员', '角色']):
                        field_matched = 'role'
                    elif any(w in txt for w in ['年', '月', '-', '201', '202']):
                        field_matched = 'date'
                    elif len(txt) > 20:
                        field_matched = 'description'
                elif sec_type == 'studentWork':
                    if any(w in txt for w in ['学生会', '社团', '协会', '团委', '办公室', '研究中心']):
                        field_matched = 'organization'
                    elif any(w in txt for w in ['部长', '会长', '干事', '主席', '助理', '副部长']):
                        field_matched = 'role'
                    elif any(w in txt for w in ['年', '月', '-', '201', '202']):
                        field_matched = 'date'
                    elif len(txt) > 15:
                        field_matched = 'description'

                if field_matched:
                    val = user_item.get(field_matched, '')
                    self._replace_textbox_text(node, val)
                    filled_nodes.add(node)
                else:
                    # Fallback default fill if semantic match fails
                    # Just replace with first non-empty field of user_item that is not yet fully assigned
                    pass

        # Clear remaining unused entry boxes
        for i in range(len(data_list), len(entries_boxes)):
            for box in entries_boxes[i]:
                self._replace_textbox_text(box['node'], "")
                filled_nodes.add(box['node'])


def fill_spatial(template_path: str, data: dict, output_path: str) -> bool:
    """Convenience endpoint for spatial filling."""
    filler = SpatialFiller(template_path, data)
    return filler.fill(output_path)
