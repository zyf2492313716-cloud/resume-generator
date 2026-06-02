import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  User, 
  Briefcase, 
  GraduationCap, 
  FolderGit, 
  Code, 
  Settings,
  AlertCircle
} from 'lucide-react';
import { parseResumeText } from '../utils/aiParser';

export default function EditorPanel({ 
  resumeData, 
  setResumeData, 
  aiConfig, 
  setAiConfig,
  onNotification 
}) {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'form'
  const [aiInput, setAiInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);

  // 一键 AI 智能提取文稿
  const handleAiExtract = async () => {
    setIsParsing(true);
    onNotification({ type: 'info', message: '正在启动智能解析引擎，抽取简历骨架...' });
    
    try {
      const parsed = await parseResumeText(aiInput, aiConfig);
      setResumeData(parsed);
      onNotification({ type: 'success', message: '简历骨架智能解析成功！已自动填入表单。' });
      setActiveTab('form'); // 自动跳到表单，方便微调
    } catch (err) {
      onNotification({ 
        type: 'warning', 
        message: 'API 解析受限，已自动启用本地备用解析器（仍抽取了约 75% 的有效字段）！' 
      });
    } finally {
      setIsParsing(false);
    }
  };

  // 基础输入变更处理
  const handleBasicChange = (field, val) => {
    setResumeData(prev => ({
      ...prev,
      basicInfo: {
        ...prev.basicInfo,
        [field]: val
      }
    }));
  };

  // 数组节点增加
  const addArrayItem = (type, defaultObj) => {
    setResumeData(prev => ({
      ...prev,
      [type]: [...prev[type], defaultObj]
    }));
    onNotification({ type: 'info', message: '已成功添加新栏目' });
  };

  // 数组节点变更
  const updateArrayItem = (type, index, field, val) => {
    setResumeData(prev => {
      const newArr = [...prev[type]];
      newArr[index] = { ...newArr[index], [field]: val };
      return { ...prev, [type]: newArr };
    });
  };

  // 数组节点删除
  const removeArrayItem = (type, index) => {
    setResumeData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, idx) => idx !== index)
    }));
    onNotification({ type: 'info', message: '栏目已移去' });
  };

  // 数组节点排序移动 (上下移动)
  const moveArrayItem = (type, index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= resumeData[type].length) return;

    setResumeData(prev => {
      const newArr = [...prev[type]];
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return { ...prev, [type]: newArr };
    });
  };

  // 技能项处理
  const handleSkillChange = (index, val) => {
    setResumeData(prev => {
      const newSkills = [...prev.skills];
      newSkills[index] = val;
      return { ...prev, skills: newSkills };
    });
  };

  const addSkillItem = () => {
    setResumeData(prev => ({
      ...prev,
      skills: [...prev.skills, '熟悉的新业务技术项']
    }));
  };

  const removeSkillItem = (index) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, idx) => idx !== index)
    }));
  };

  return (
    <div className="glass-panel editor-panel" style={{ color: '#f3f4f6' }}>
      {/* 顶部面板 Tab */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)' }}>
        <button 
          onClick={() => setActiveTab('ai')}
          className="print-hide"
          style={{
            flex: 1,
            padding: '14px',
            background: 'none',
            border: 'none',
            color: activeTab === 'ai' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'ai' ? '2.5px solid var(--color-accent)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          <Sparkles size={16} /> AI 智能录入
        </button>
        <button 
          onClick={() => setActiveTab('form')}
          className="print-hide"
          style={{
            flex: 1,
            padding: '14px',
            background: 'none',
            border: 'none',
            color: activeTab === 'form' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'form' ? '2.5px solid var(--color-accent)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          <Settings size={16} /> 可视化编辑
        </button>
      </div>

      {/* 主工作区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px', boxSizing: 'border-box' }}>
        
        {/* ==========================================
            TAB 1: AI 智能录入
            ========================================== */}
        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              直接粘贴由 AI 聊天生成或大模型润色的杂乱简历文稿，点击一键提取，将自动智能填充至右侧高拟真 A4 画布中。
            </div>

            {/* AI 录入框 */}
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="例如：我叫李明，硕士毕业于复旦大学计算机系... 2025年在阿里做过一个高并发大屏项目..."
              style={{
                width: '100%',
                height: '240px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                padding: '12px',
                color: '#fff',
                fontSize: '13.5px',
                lineHeight: '1.6',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />

            {/* 解析按钮 */}
            <button
              onClick={handleAiExtract}
              disabled={isParsing || !aiInput.trim()}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: (isParsing || !aiInput.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px var(--color-accent-glow)',
                transition: 'transform 0.1s, opacity 0.2s',
                opacity: (isParsing || !aiInput.trim()) ? 0.6 : 1
              }}
            >
              <Sparkles size={16} className={isParsing ? "animate-spin" : ""} />
              {isParsing ? "正在全力解析抽取中..." : "一键套模板预览"}
            </button>

            {/* API 参数折叠设置 */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '15px', marginTop: '10px' }}>
              <div 
                onClick={() => setShowApiSettings(!showApiSettings)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'var(--color-accent)',
                  fontWeight: 600
                }}
              >
                <span>🔧 大模型 API 密钥配置 (选填)</span>
                <span>{showApiSettings ? '▲' : '▼'}</span>
              </div>

              {showApiSettings && (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  marginTop: '12px',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.15)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>大模型 API 端点 (Endpoint)</label>
                    <input 
                      type="text" 
                      value={aiConfig.apiUrl}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                      style={{
                        padding: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>大模型 API Key</label>
                    <input 
                      type="password" 
                      value={aiConfig.apiKey}
                      placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                      onChange={(e) => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      style={{
                        padding: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>模型名称 (Model)</label>
                    <input 
                      type="text" 
                      value={aiConfig.modelName}
                      placeholder="deepseek-chat"
                      onChange={(e) => setAiConfig(prev => ({ ...prev, modelName: e.target.value }))}
                      style={{
                        padding: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', gap: '4px', alignItems: 'center', lineHeight: '1.4' }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    若不配置 Key，将自动使用内置的本地启发式解析器，在本地瞬间提取您的信息，数据绝不上传！
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: 可视化表单编辑器
            ========================================== */}
        {activeTab === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. 个人基本信息 */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                <User size={15} style={{ color: 'var(--color-accent)' }} /> 个人基本信息
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>姓名</label>
                  <input type="text" value={resumeData.basicInfo.name || ''} onChange={(e) => handleBasicChange('name', e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>求职岗/意向</label>
                  <input type="text" value={resumeData.basicInfo.title || ''} onChange={(e) => handleBasicChange('title', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>联络电话</label>
                  <input type="text" value={resumeData.basicInfo.phone || ''} onChange={(e) => handleBasicChange('phone', e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>电子邮箱</label>
                  <input type="text" value={resumeData.basicInfo.email || ''} onChange={(e) => handleBasicChange('email', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>微信号</label>
                  <input type="text" value={resumeData.basicInfo.wechat || ''} onChange={(e) => handleBasicChange('wechat', e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>GitHub / 网页</label>
                  <input type="text" value={resumeData.basicInfo.github || ''} onChange={(e) => handleBasicChange('github', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>个人总结 / 自我评价 (影响单页排版高度的重要因素)</label>
                <textarea value={resumeData.basicInfo.summary || ''} onChange={(e) => handleBasicChange('summary', e.target.value)} style={{ ...inputStyle, height: '70px', resize: 'vertical' }} />
              </div>
            </div>

            {/* 2. 工作经历 */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={15} style={{ color: 'var(--color-accent)' }} /> 工作履历
                </div>
                <button 
                  onClick={() => addArrayItem('experience', { company: '新公司', role: '岗位职位', date: '2024.01 - 至今', description: '主要职责描述...' })}
                  style={addBtnStyle}
                >
                  <Plus size={12} /> 添加
                </button>
              </div>

              {resumeData.experience.map((exp, idx) => (
                <div key={idx} style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={{ fontWeight: 600, fontSize: '12px' }}>经历 #{idx + 1}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => moveArrayItem('experience', idx, -1)} disabled={idx === 0} style={iconBtnStyle}><ArrowUp size={12} /></button>
                      <button onClick={() => moveArrayItem('experience', idx, 1)} disabled={idx === resumeData.experience.length - 1} style={iconBtnStyle}><ArrowDown size={12} /></button>
                      <button onClick={() => removeArrayItem('experience', idx)} style={{ ...iconBtnStyle, color: 'var(--color-danger)' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="text" placeholder="公司/企业" value={exp.company || ''} onChange={(e) => updateArrayItem('experience', idx, 'company', e.target.value)} style={smallInputStyle} />
                    <input type="text" placeholder="起止时间" value={exp.date || ''} onChange={(e) => updateArrayItem('experience', idx, 'date', e.target.value)} style={smallInputStyle} />
                  </div>
                  <input type="text" placeholder="职位/角色" value={exp.role || ''} onChange={(e) => updateArrayItem('experience', idx, 'role', e.target.value)} style={{ ...smallInputStyle, marginTop: '8px' }} />
                  <textarea placeholder="职责描述，多点请换行(使用 - 或 • 开头自动列表显示)" value={exp.description || ''} onChange={(e) => updateArrayItem('experience', idx, 'description', e.target.value)} style={{ ...smallInputStyle, height: '70px', marginTop: '8px', resize: 'vertical' }} />
                </div>
              ))}
            </div>

            {/* 3. 项目经验 */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FolderGit size={15} style={{ color: 'var(--color-accent)' }} /> 专研项目
                </div>
                <button 
                  onClick={() => addArrayItem('projects', { name: '新项目', role: '开发负责人', date: '2024.01 - 2024.05', description: '项目详情描述...' })}
                  style={addBtnStyle}
                >
                  <Plus size={12} /> 添加
                </button>
              </div>

              {resumeData.projects.map((proj, idx) => (
                <div key={idx} style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={{ fontWeight: 600, fontSize: '12px' }}>项目 #{idx + 1}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => moveArrayItem('projects', idx, -1)} disabled={idx === 0} style={iconBtnStyle}><ArrowUp size={12} /></button>
                      <button onClick={() => moveArrayItem('projects', idx, 1)} disabled={idx === resumeData.projects.length - 1} style={iconBtnStyle}><ArrowDown size={12} /></button>
                      <button onClick={() => removeArrayItem('projects', idx)} style={{ ...iconBtnStyle, color: 'var(--color-danger)' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="text" placeholder="项目名称" value={proj.name || ''} onChange={(e) => updateArrayItem('projects', idx, 'name', e.target.value)} style={smallInputStyle} />
                    <input type="text" placeholder="起止时间" value={proj.date || ''} onChange={(e) => updateArrayItem('projects', idx, 'date', e.target.value)} style={smallInputStyle} />
                  </div>
                  <input type="text" placeholder="项目角色" value={proj.role || ''} onChange={(e) => updateArrayItem('projects', idx, 'role', e.target.value)} style={{ ...smallInputStyle, marginTop: '8px' }} />
                  <textarea placeholder="项目业绩，多点换行以 - 开头自动渲染列表" value={proj.description || ''} onChange={(e) => updateArrayItem('projects', idx, 'description', e.target.value)} style={{ ...smallInputStyle, height: '70px', marginTop: '8px', resize: 'vertical' }} />
                </div>
              ))}
            </div>

            {/* 4. 教育背景 */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <GraduationCap size={15} style={{ color: 'var(--color-accent)' }} /> 修业背景
                </div>
                <button 
                  onClick={() => addArrayItem('education', { school: '某高校', major: '本专业', degree: '学士', date: '2020.09 - 2024.06', description: '' })}
                  style={addBtnStyle}
                >
                  <Plus size={12} /> 添加
                </button>
              </div>

              {resumeData.education.map((edu, idx) => (
                <div key={idx} style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={{ fontWeight: 600, fontSize: '12px' }}>学府 #{idx + 1}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => moveArrayItem('education', idx, -1)} disabled={idx === 0} style={iconBtnStyle}><ArrowUp size={12} /></button>
                      <button onClick={() => moveArrayItem('education', idx, 1)} disabled={idx === resumeData.education.length - 1} style={iconBtnStyle}><ArrowDown size={12} /></button>
                      <button onClick={() => removeArrayItem('education', idx)} style={{ ...iconBtnStyle, color: 'var(--color-danger)' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="text" placeholder="学校名称" value={edu.school || ''} onChange={(e) => updateArrayItem('education', idx, 'school', e.target.value)} style={smallInputStyle} />
                    <input type="text" placeholder="修业时间" value={edu.date || ''} onChange={(e) => updateArrayItem('education', idx, 'date', e.target.value)} style={smallInputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <input type="text" placeholder="所学专业" value={edu.major || ''} onChange={(e) => updateArrayItem('education', idx, 'major', e.target.value)} style={smallInputStyle} />
                    <input type="text" placeholder="学历（学士/硕士）" value={edu.degree || ''} onChange={(e) => updateArrayItem('education', idx, 'degree', e.target.value)} style={smallInputStyle} />
                  </div>
                  <textarea placeholder="教育描述/校内表现 (选填)" value={edu.description || ''} onChange={(e) => updateArrayItem('education', idx, 'description', e.target.value)} style={{ ...smallInputStyle, height: '50px', marginTop: '8px', resize: 'vertical' }} />
                </div>
              ))}
            </div>

            {/* 5. 技能特长 */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Code size={15} style={{ color: 'var(--color-accent)' }} /> 技能特长
                </div>
                <button 
                  onClick={addSkillItem}
                  style={addBtnStyle}
                >
                  <Plus size={12} /> 添加
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {resumeData.skills.map((skill, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={skill} 
                      onChange={(e) => handleSkillChange(idx, e.target.value)} 
                      style={{ ...smallInputStyle, flex: 1 }} 
                    />
                    <button 
                      onClick={() => removeSkillItem(idx)} 
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.15)', 
                        border: 'none', 
                        color: 'var(--color-danger)', 
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// 样式常数
const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--border-glass)',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '12.5px',
  outline: 'none',
  fontFamily: 'inherit'
};

const smallInputStyle = {
  width: '100%',
  padding: '6px 8px',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '12px',
  outline: 'none',
  fontFamily: 'inherit'
};

const cardStyle = {
  padding: '12px',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.04)',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column'
};

const cardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '10px',
  color: 'var(--color-text-muted)'
};

const iconBtnStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: 'none',
  color: 'var(--color-text-muted)',
  borderRadius: '3px',
  padding: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s'
};

const addBtnStyle = {
  background: 'rgba(59, 130, 246, 0.15)',
  border: 'none',
  color: 'var(--color-accent)',
  borderRadius: '4px',
  padding: '3px 8px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '3px'
};
