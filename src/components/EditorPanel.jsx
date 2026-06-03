import React, { useState } from 'react';
import {
  Sparkles, Plus, Trash2, ArrowUp, ArrowDown,
  User, Briefcase, GraduationCap, FolderGit, Code
} from 'lucide-react';
import { parseResumeText } from '../utils/aiParser';

export default function EditorPanel({ resumeData, setResumeData, onNotification }) {
  const [activeTab, setActiveTab] = useState('form');
  const [aiInput, setAiInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleAiExtract = async () => {
    setIsParsing(true);
    onNotification({ type: 'info', message: '正在解析...' });
    try {
      const parsed = await parseResumeText(aiInput, { apiUrl: '', apiKey: '', modelName: '' });
      setResumeData(parsed);
      onNotification({ type: 'success', message: '解析成功，已填入表单' });
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
    setResumeData(prev => ({ ...prev, [type]: [...prev[type], defaultObj] }));
    onNotification({ type: 'info', message: '已添加' });
  };

  const updateArrayItem = (type, index, field, val) => {
    setResumeData(prev => {
      const arr = [...prev[type]];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, [type]: arr };
    });
  };

  const removeArrayItem = (type, index) => {
    setResumeData(prev => ({
      ...prev, [type]: prev[type].filter((_, i) => i !== index)
    }));
    onNotification({ type: 'info', message: '已删除' });
  };

  const moveArrayItem = (type, index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= resumeData[type].length) return;
    setResumeData(prev => {
      const arr = [...prev[type]];
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return { ...prev, [type]: arr };
    });
  };

  const addSkill = () => {
    setResumeData(prev => ({ ...prev, skills: [...prev.skills, '新技能'] }));
  };

  const removeSkill = (index) => {
    setResumeData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
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
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              粘贴 AI 生成的简历文稿，自动解析填入表单
            </div>
            <textarea value={aiInput} onChange={e => setAiInput(e.target.value)}
              placeholder="例如：我叫李明，硕士毕业于复旦大学计算机系..."
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

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

            {[
              { key: 'education', icon: GraduationCap, title: '教育背景', label: '教育', fields: ['school', 'major', 'degree', 'date'], placeholders: ['学校', '专业', '学历', '时间'], default: { school: '某高校', major: '专业', degree: '学士', date: '2020.09-2024.06', description: '' } },
              { key: 'experience', icon: Briefcase, title: '工作经历', label: '经历', fields: ['company', 'role', 'date'], placeholders: ['公司', '职位', '时间'], default: { company: '某公司', role: '职位', date: '2024.01-至今', description: '' } },
              { key: 'projects', icon: FolderGit, title: '项目经验', label: '项目', fields: ['name', 'role', 'date'], placeholders: ['项目', '角色', '时间'], default: { name: '某项目', role: '角色', date: '2024.01-2024.06', description: '' } },
            ].map(section => (
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
                {resumeData[section.key].map((item, idx) => (
                  <div key={idx} style={{ ...cardStyle, marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600 }}>{section.label} #{idx + 1}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => moveArrayItem(section.key, idx, -1)} disabled={idx === 0}
                          style={{ background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: '3px', padding: '4px', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                          <ArrowUp size={12} /></button>
                        <button onClick={() => moveArrayItem(section.key, idx, 1)} disabled={idx === resumeData[section.key].length - 1}
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

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700 }}>
                  <Code size={15} style={{ color: 'var(--color-accent)' }} /> 技能特长
                </div>
                <button onClick={addSkill} style={{
                  background: 'rgba(59,130,246,0.15)', border: 'none', color: 'var(--color-accent)',
                  borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                }}><Plus size={12} /> 添加</button>
              </div>
              {resumeData.skills.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                  <input type="text" value={s} onChange={e => {
                    setResumeData(prev => {
                      const arr = [...prev.skills];
                      arr[idx] = e.target.value;
                      return { ...prev, skills: arr };
                    });
                  }} style={{ ...smallInput, flex: 1 }} />
                  <button onClick={() => removeSkill(idx)} style={{
                    background: 'rgba(239,68,68,0.15)', border: 'none', color: 'var(--color-danger)',
                    borderRadius: '4px', padding: '6px', cursor: 'pointer'
                  }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
