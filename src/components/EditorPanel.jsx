import React, { useState, useEffect } from 'react';
import {
  Sparkles, Plus, Trash2, ArrowUp, ArrowDown, Settings,
  User, Briefcase, GraduationCap, FolderGit, Code, FlaskConical, Users, Award
} from 'lucide-react';
import { parseResumeText } from '../utils/aiParser';

const ALL_SECTION_DEFS = [
  { key: 'education', icon: GraduationCap, title: '教育背景', label: '教育', fields: ['school', 'major', 'degree', 'date'], placeholders: ['学校', '专业', '学历', '时间'], default: { school: '某高校', major: '专业', degree: '学士', date: '2020.09-2024.06', description: '' } },
  { key: 'experience', icon: Briefcase, title: '工作经历', label: '工作', fields: ['company', 'role', 'date'], placeholders: ['公司', '职位', '时间'], default: { company: '某公司', role: '职位', date: '2024.01-至今', description: '' } },
  { key: 'projects', icon: FolderGit, title: '项目经验', label: '项目', fields: ['name', 'role', 'date'], placeholders: ['项目', '角色', '时间'], default: { name: '某项目', role: '角色', date: '2024.01-2024.06', description: '' } },
  { key: 'research', icon: FlaskConical, title: '科研经历', label: '科研', fields: ['name', 'role', 'date'], placeholders: ['课题/项目', '角色', '时间'], default: { name: '某课题', role: '负责人', date: '2024.01-2024.06', description: '' } },
  { key: 'studentWork', icon: Users, title: '学生工作', label: '学生', fields: ['organization', 'role', 'date'], placeholders: ['组织/社团', '职务', '时间'], default: { organization: '某组织', role: '成员', date: '2024.01-2024.06', description: '' } },
  { key: 'honors', icon: Award, title: '荣誉奖励', label: '', fields: [], placeholders: [], default: '' },
  { key: 'skills', icon: Code, title: '技能特长', label: '', fields: [], placeholders: [], default: '' },
];

export default function EditorPanel({ resumeData, setResumeData, onNotification, onOpenApiConfig }) {
  const [activeTab, setActiveTab] = useState('form');
  const [aiInput, setAiInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [apiConfig, setApiConfig] = useState(null);
  const [enabledSections, setEnabledSections] = useState(() => {
    const saved = new Set(['education', 'experience', 'projects', 'skills']);
    ALL_SECTION_DEFS.forEach(s => {
      if (resumeData[s.key] && Array.isArray(resumeData[s.key]) && resumeData[s.key].length > 0) {
        saved.add(s.key);
      }
    });
    return saved;
  });

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getApiConfig().then(setApiConfig);
    }
  }, []);

  useEffect(() => {
    setEnabledSections(prev => {
      const next = new Set(prev);
      ALL_SECTION_DEFS.forEach(s => {
        if (resumeData[s.key] && Array.isArray(resumeData[s.key]) && resumeData[s.key].length > 0) {
          next.add(s.key);
        }
      });
      return next;
    });
  }, [resumeData]);

  const toggleSection = (key) => {
    setEnabledSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleAiExtract = async () => {
    setIsParsing(true);
    onNotification({ type: 'info', message: '正在解析...' });
    try {
      const config = apiConfig || { apiUrl: '', apiKey: '', modelName: '' };
      const { data, source, error } = await parseResumeText(aiInput, config);
      setResumeData(data);

      const counts = [];
      if (data.basicInfo.name) counts.push(`姓名(${data.basicInfo.name})`);
      if (data.basicInfo.title) counts.push(`意向(${data.basicInfo.title})`);
      if (data.education.length) counts.push(`教育(${data.education.length}条)`);
      if (data.experience.length) counts.push(`工作(${data.experience.length}条)`);
      if (data.projects.length) counts.push(`项目(${data.projects.length}条)`);
      if (data.research.length) counts.push(`科研(${data.research.length}条)`);
      if (data.studentWork.length) counts.push(`学生(${data.studentWork.length}条)`);
      if (data.honors.length) counts.push(`荣誉(${data.honors.length}条)`);
      if (data.skills.length) counts.push(`技能(${data.skills.length}项)`);
      const summary = counts.length > 0 ? `已提取: ${counts.join(', ')}` : '未提取到结构化信息';

      if (source === 'fallback') {
        onNotification({ type: 'warning', message: `AI 解析失败(${error || '未知错误'})，${summary}（本地降级）` });
      } else if (source === 'api') {
        onNotification({ type: 'success', message: `AI 解析成功: ${summary}` });
      } else {
        onNotification({ type: counts.length > 0 ? 'success' : 'warning', message: summary });
      }
      setActiveTab('form');
    } catch (err) {
      onNotification({ type: 'warning', message: '解析失败，请手动编辑' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleBasicChange = (field, val) => {
    setResumeData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, [field]: val } }));
  };

  const addArrayItem = (type, defaultObj) => {
    setResumeData(prev => ({ ...prev, [type]: [...(prev[type] || []), defaultObj] }));
    onNotification({ type: 'info', message: '已添加' });
  };

  const updateArrayItem = (type, index, field, val) => {
    setResumeData(prev => {
      const arr = [...(prev[type] || [])];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, [type]: arr };
    });
  };

  const removeArrayItem = (type, index) => {
    setResumeData(prev => ({
      ...prev, [type]: (prev[type] || []).filter((_, i) => i !== index)
    }));
    onNotification({ type: 'info', message: '已删除' });
  };

  const moveArrayItem = (type, index, direction) => {
    const target = index + direction;
    const arr = resumeData[type] || [];
    if (target < 0 || target >= arr.length) return;
    setResumeData(prev => {
      const a = [...(prev[type] || [])];
      [a[index], a[target]] = [a[target], a[index]];
      return { ...prev, [type]: a };
    });
  };

  const addListItem = (type) => {
    setResumeData(prev => ({ ...prev, [type]: [...(prev[type] || []), '新条目'] }));
  };

  const removeListItem = (type, index) => {
    setResumeData(prev => ({
      ...prev, [type]: (prev[type] || []).filter((_, i) => i !== index)
    }));
  };

  const updateListItem = (type, index, val) => {
    setResumeData(prev => {
      const arr = [...(prev[type] || [])];
      arr[index] = val;
      return { ...prev, [type]: arr };
    });
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--border-glass)', borderRadius: '6px',
    color: '#fff', fontSize: '12.5px', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box'
  };
  const smallInput = { ...inputStyle, padding: '6px 8px', fontSize: '12px' };
  const cardStyle = {
    padding: '12px', background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px'
  };

  return (
    <div className="glass-panel editor-panel" style={{ color: '#f3f4f6' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)' }}>
        <button onClick={() => setActiveTab('form')} style={{
          flex: 1, padding: '14px', background: 'none', border: 'none',
          fontWeight: 600, cursor: 'pointer', fontSize: '14px',
          color: activeTab === 'form' ? 'var(--color-accent)' : 'var(--color-text-muted)',
          borderBottom: activeTab === 'form' ? '2.5px solid var(--color-accent)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}><User size={16} /> 编辑信息</button>
        <button onClick={() => setActiveTab('ai')} style={{
          flex: 1, padding: '14px', background: 'none', border: 'none',
          fontWeight: 600, cursor: 'pointer', fontSize: '14px',
          color: activeTab === 'ai' ? 'var(--color-accent)' : 'var(--color-text-muted)',
          borderBottom: activeTab === 'ai' ? '2.5px solid var(--color-accent)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}><Sparkles size={16} /> AI 录入</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                粘贴简历文稿，自动解析填入表单
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                  background: apiConfig?.apiUrl ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: apiConfig?.apiUrl ? '#34d399' : '#fbbf24'
                }}>
                  {apiConfig?.apiUrl ? 'AI 已配置' : '本地解析'}
                </span>
                <button onClick={onOpenApiConfig} title="AI 接口配置" style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px',
                  padding: '4px', cursor: 'pointer', color: '#9ca3af', display: 'flex'
                }}>
                  <Settings size={14} />
                </button>
              </div>
            </div>
            <textarea value={aiInput} onChange={e => setAiInput(e.target.value)}
              placeholder="粘贴简历文字，支持以下格式：\n- 分段式简历（教育背景 / 科研经历 / 实习经历...）\n- 纯文本简历（姓名 + 电话 + 邮箱 + 经历描述）\n- 其他 AI 生成的简历文本"
              style={{ width: '100%', height: '240px', background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '12px',
                color: '#fff', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit'
              }} />
            <button onClick={handleAiExtract} disabled={isParsing || !aiInput.trim()} style={{
              padding: '12px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600,
              cursor: isParsing || !aiInput.trim() ? 'not-allowed' : 'pointer',
              opacity: isParsing || !aiInput.trim() ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}>
              <Sparkles size={16} /> {isParsing ? '解析中...' : '智能提取'}
            </button>
          </div>
        )}

        {activeTab === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px 10px',
              background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <span style={{ fontSize: '11px', color: '#9ca3af', marginRight: '4px', lineHeight: '26px' }}>模块:</span>
              {ALL_SECTION_DEFS.map(s => (
                <button key={s.key} onClick={() => toggleSection(s.key)} style={{
                  padding: '3px 8px', borderRadius: '4px', border: '1px solid',
                  borderColor: enabledSections.has(s.key) ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)',
                  background: enabledSections.has(s.key) ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                  color: enabledSections.has(s.key) ? '#fff' : '#6b7280',
                  cursor: 'pointer', fontSize: '10.5px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '3px'
                }}>
                  <s.icon size={10} />{s.title}
                </button>
              ))}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', marginBottom: '10px' }}>
                <User size={15} style={{ color: 'var(--color-accent)' }} /> 基本信息
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {['name', 'title', 'phone', 'email', 'wechat', 'github'].map(f => (
                  <div key={f}>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {{ name: '姓名', title: '求职意向', phone: '电话', email: '邮箱', wechat: '微信', github: 'GitHub' }[f]}
                    </label>
                    <input type="text" value={resumeData.basicInfo[f] || ''}
                      onChange={e => handleBasicChange(f, e.target.value)} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>个人总结</label>
                <textarea value={resumeData.basicInfo.summary || ''}
                  onChange={e => handleBasicChange('summary', e.target.value)}
                  style={{ ...inputStyle, height: '60px', resize: 'vertical' }} />
              </div>
            </div>

            {ALL_SECTION_DEFS.filter(s => s.key !== 'skills' && s.key !== 'honors' && enabledSections.has(s.key)).map(section => (
              <div key={section.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700 }}>
                    <section.icon size={15} style={{ color: 'var(--color-accent)' }} /> {section.title}
                  </div>
                  <button onClick={() => addArrayItem(section.key, section.default)} style={{
                    background: 'rgba(59,130,246,0.15)', border: 'none',
                    color: 'var(--color-accent)', borderRadius: '4px',
                    padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '3px'
                  }}><Plus size={12} /> 添加</button>
                </div>
                {(resumeData[section.key] || []).map((item, idx) => (
                  <div key={idx} style={{ ...cardStyle, marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600 }}>{section.label} #{idx + 1}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => moveArrayItem(section.key, idx, -1)} disabled={idx === 0}
                          style={{ background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: '3px', padding: '4px', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                          <ArrowUp size={12} /></button>
                        <button onClick={() => moveArrayItem(section.key, idx, 1)} disabled={idx === (resumeData[section.key] || []).length - 1}
                          style={{ background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: '3px', padding: '4px', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                          <ArrowDown size={12} /></button>
                        <button onClick={() => removeArrayItem(section.key, idx)}
                          style={{ background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: '3px', padding: '4px', cursor: 'pointer', color: 'var(--color-danger)' }}>
                          <Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {section.fields.map((f, fi) => (
                        <div key={f}>
                          <label style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{section.placeholders[fi]}</label>
                          <input type="text" value={item[f] || ''}
                            onChange={e => updateArrayItem(section.key, idx, f, e.target.value)}
                            style={smallInput} />
                        </div>
                      ))}
                    </div>
                    <textarea placeholder="描述" value={item.description || ''}
                      onChange={e => updateArrayItem(section.key, idx, 'description', e.target.value)}
                      style={{ ...smallInput, marginTop: '6px', height: '50px', resize: 'vertical' }} />
                  </div>
                ))}
              </div>
            ))}

            {enabledSections.has('honors') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700 }}>
                    <Award size={15} style={{ color: 'var(--color-accent)' }} /> 荣誉奖励
                  </div>
                  <button onClick={() => addListItem('honors')} style={{
                    background: 'rgba(59,130,246,0.15)', border: 'none', color: 'var(--color-accent)',
                    borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                  }}><Plus size={12} /> 添加</button>
                </div>
                {(resumeData.honors || []).map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input type="text" value={s} onChange={e => updateListItem('honors', idx, e.target.value)}
                      style={{ ...smallInput, flex: 1 }} />
                    <button onClick={() => removeListItem('honors', idx)} style={{
                      background: 'rgba(239,68,68,0.15)', border: 'none', color: 'var(--color-danger)',
                      borderRadius: '4px', padding: '6px', cursor: 'pointer'
                    }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}

            {enabledSections.has('skills') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700 }}>
                    <Code size={15} style={{ color: 'var(--color-accent)' }} /> 技能特长
                  </div>
                  <button onClick={() => addListItem('skills')} style={{
                    background: 'rgba(59,130,246,0.15)', border: 'none', color: 'var(--color-accent)',
                    borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                  }}><Plus size={12} /> 添加</button>
                </div>
                {(resumeData.skills || []).map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input type="text" value={s} onChange={e => updateListItem('skills', idx, e.target.value)}
                      style={{ ...smallInput, flex: 1 }} />
                    <button onClick={() => removeListItem('skills', idx)} style={{
                      background: 'rgba(239,68,68,0.15)', border: 'none', color: 'var(--color-danger)',
                      borderRadius: '4px', padding: '6px', cursor: 'pointer'
                    }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
