import React from 'react';

/**
 * 格式化经历描述（处理换行，并智能转换为精美的点符号列表）
 */
const renderBulletPoints = (desc) => {
  if (!desc) return null;
  const lines = desc.split('\n').map(l => l.trim()).filter(l => l !== '');
  return (
    <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: '4px 0 0 0' }}>
      {lines.map((line, idx) => {
        const isBullet = line.startsWith('-') || line.startsWith('*') || line.startsWith('•');
        const cleanLine = isBullet ? line.replace(/^[-*•]\s*/, '') : line;
        return (
          <li 
            key={idx} 
            style={{ 
              position: 'relative', 
              paddingLeft: '12px',
              fontSize: '100%',
              lineHeight: 'inherit',
              color: '#4b5563',
              marginBottom: '2px',
              textAlign: 'justify'
            }}
          >
            <span style={{ 
              position: 'absolute', 
              left: '1px', 
              top: '7px', 
              width: '3.5px', 
              height: '3.5px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--theme-primary)',
              opacity: 0.8
            }} />
            {cleanLine}
          </li>
        );
      })}
    </ul>
  );
};

// ==========================================================================
// 📂 1. 极简单页 01 风格复刻 (Minimalist 01 - 双栏非对称极简)
// ==========================================================================
export const MinimalistTemplate = ({ data }) => {
  const { basicInfo, education, experience, projects, skills } = data;

  return (
    <div className="tmpl-minimalist" style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#1f2937' }}>
      {/* 极简姓名与岗位一排平铺 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #111827', paddingBottom: '10px', marginBottom: '15px' }}>
        <div>
          <h1 style={{ fontSize: 'calc(var(--theme-font-size-base) * 2.1)', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', margin: 0 }}>
            {basicInfo.name || "姓名"}
          </h1>
          <p style={{ fontSize: 'calc(var(--theme-font-size-base) * 1.05)', fontWeight: 600, color: 'var(--theme-primary)', marginTop: '3px', margin: 0 }}>
            {basicInfo.title || "意向职位"}
          </p>
        </div>
        <div style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.85)', color: '#4b5563', textAlign: 'right', lineHeight: '1.4' }}>
          {basicInfo.phone && <div>联络电话: {basicInfo.phone}</div>}
          {basicInfo.email && <div>电子邮箱: {basicInfo.email}</div>}
          {(basicInfo.wechat || basicInfo.github) && (
            <div>
              {basicInfo.wechat && `微信号: ${basicInfo.wechat}`}
              {basicInfo.wechat && basicInfo.github && ' | '}
              {basicInfo.github && `Github: ${basicInfo.github}`}
            </div>
          )}
        </div>
      </div>

      {/* 主体非对称双栏布局 */}
      <div style={{ display: 'flex', flexGrow: 1, gap: '25px' }}>
        
        {/* 左栏 (占 30%) - 联系、自我评价、技能特长 */}
        <div style={{ width: '30%', borderRight: '1px solid #e5e7eb', paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* 自我评价 */}
          {basicInfo.summary && (
            <div style={{ boxSizing: 'border-box' }}>
              <h2 className="section-title" style={{ fontSize: 'calc(var(--theme-font-size-base) * 1.05)', fontWeight: 700, borderBottom: '1px solid #374151', paddingBottom: '3px', color: '#111827' }}>
                个人评估
              </h2>
              <p style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.86)', color: '#4b5563', lineHeight: 'var(--theme-line-height)', marginTop: '6px', textAlign: 'justify' }}>
                {basicInfo.summary}
              </p>
            </div>
          )}

          {/* 技能特长 */}
          {skills && skills.length > 0 && (
            <div style={{ flexGrow: 1 }}>
              <h2 className="section-title" style={{ fontSize: 'calc(var(--theme-font-size-base) * 1.05)', fontWeight: 700, borderBottom: '1px solid #374151', paddingBottom: '3px', color: '#111827' }}>
                专业技能
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {skills.map((skill, idx) => (
                  <div key={idx} style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.85)', color: '#374151', lineHeight: '1.4' }}>
                    ▪ {skill}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右栏 (占 70%) - 经历大项列表 */}
        <div style={{ width: '70%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* 工作履历 */}
          {experience && experience.length > 0 && (
            <div className="resume-section" style={{ padding: 0 }}>
              <h2 className="section-title">工作经历</h2>
              <div className="resume-block-list">
                {experience.map((exp, idx) => (
                  <div key={idx} style={{ paddingBottom: '2px' }}>
                    <div className="resume-row">
                      <span style={{ fontWeight: 700 }}>{exp.company}</span>
                      <span style={{ fontWeight: 500, fontSize: '92%', color: '#4b5563' }}>{exp.date}</span>
                    </div>
                    <div className="resume-subrow">
                      <span style={{ color: 'var(--theme-primary)', fontWeight: 600 }}>{exp.role}</span>
                    </div>
                    {exp.description && <div className="resume-desc">{renderBulletPoints(exp.description)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 专研项目 */}
          {projects && projects.length > 0 && (
            <div className="resume-section" style={{ padding: 0 }}>
              <h2 className="section-title">项目经验</h2>
              <div className="resume-block-list">
                {projects.map((proj, idx) => (
                  <div key={idx} style={{ paddingBottom: '2px' }}>
                    <div className="resume-row">
                      <span style={{ fontWeight: 700 }}>{proj.name}</span>
                      <span style={{ fontWeight: 500, fontSize: '92%', color: '#4b5563' }}>{proj.date}</span>
                    </div>
                    <div className="resume-subrow">
                      <span style={{ color: 'var(--theme-primary)', fontWeight: 600 }}>{proj.role}</span>
                    </div>
                    {proj.description && <div className="resume-desc">{renderBulletPoints(proj.description)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 教育经历 */}
          {education && education.length > 0 && (
            <div className="resume-section" style={{ padding: 0 }}>
              <h2 className="section-title">教育背景</h2>
              <div className="resume-block-list">
                {education.map((edu, idx) => (
                  <div key={idx} style={{ paddingBottom: '2px' }}>
                    <div className="resume-row">
                      <span style={{ fontWeight: 700 }}>{edu.school}</span>
                      <span style={{ fontWeight: 500, fontSize: '92%', color: '#4b5563' }}>{edu.date}</span>
                    </div>
                    <div className="resume-subrow">
                      <span style={{ color: 'var(--theme-primary)', fontWeight: 600 }}>{edu.major} · {edu.degree}</span>
                    </div>
                    {edu.description && <div className="resume-desc">{renderBulletPoints(edu.description)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ==========================================================================
// 📂 2. 稳重单页 01 风格复刻 (Classic 01 - 顶部宽深色带豪华稳重型)
// ==========================================================================
export const ClassicTemplate = ({ data }) => {
  const { basicInfo, education, experience, projects, skills } = data;

  return (
    <div className="tmpl-classic" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部宽海军蓝/深灰底色块头部 (高精度复刻稳重单页01的庄重外观) */}
      <div className="header-bar">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '28px', margin: 0 }}>{basicInfo.name || "姓名"}</h1>
          <div style={{ 
            display: 'inline-block',
            borderTop: '2px solid rgba(255,255,255,0.4)', 
            marginTop: '6px', 
            paddingTop: '3px',
            fontSize: 'calc(var(--theme-font-size-base) * 1.02)', 
            fontWeight: 600,
            opacity: 0.95
          }}>
            {basicInfo.title || "求职意向"}
          </div>
        </div>
        <div style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.86)', textAlign: 'right', opacity: 0.95, lineHeight: '1.6', fontWeight: 500 }}>
          {basicInfo.phone && <div>📞 联络电话: {basicInfo.phone}</div>}
          {basicInfo.email && <div>✉️ 电子邮箱: {basicInfo.email}</div>}
          {(basicInfo.wechat || basicInfo.github) && (
            <div>
              {basicInfo.wechat && `💬 微信账号: ${basicInfo.wechat}`}
              {basicInfo.wechat && basicInfo.github && '  |  '}
              {basicInfo.github && `🔗 雅集Github: ${basicInfo.github.replace(/^https?:\/\//, '')}`}
            </div>
          )}
        </div>
      </div>

      {/* 自我评价 */}
      {basicInfo.summary && (
        <div className="resume-section">
          <h2 className="section-title">个人评估</h2>
          <div className="resume-desc" style={{ marginTop: '3px', borderLeft: '3px solid var(--theme-primary)', paddingLeft: '10px', textAlign: 'justify' }}>
            {basicInfo.summary}
          </div>
        </div>
      )}

      {/* 教育背景 */}
      {education && education.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">修业背景</h2>
          <div className="resume-block-list">
            {education.map((edu, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row">
                  <span style={{ fontWeight: 700 }}>{edu.school}</span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>{edu.date}</span>
                </div>
                <div className="resume-subrow">
                  <span style={{ color: 'var(--theme-primary)', fontWeight: 600 }}>{edu.major} · {edu.degree}</span>
                </div>
                {edu.description && <div className="resume-desc" style={{ paddingLeft: '2px' }}>{renderBulletPoints(edu.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 工作经历 */}
      {experience && experience.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">生平履历</h2>
          <div className="resume-block-list">
            {experience.map((exp, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row">
                  <span style={{ fontWeight: 700 }}>{exp.company}</span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>{exp.date}</span>
                </div>
                <div className="resume-subrow">
                  <span style={{ color: 'var(--theme-primary)', fontWeight: 600 }}>{exp.role}</span>
                </div>
                {exp.description && <div className="resume-desc">{renderBulletPoints(exp.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 项目经历 */}
      {projects && projects.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">核心专研项目</h2>
          <div className="resume-block-list">
            {projects.map((proj, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row">
                  <span style={{ fontWeight: 700 }}>{proj.name}</span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>{proj.date}</span>
                </div>
                <div className="resume-subrow">
                  <span style={{ color: 'var(--theme-primary)', fontWeight: 600 }}>{proj.role}</span>
                </div>
                {proj.description && <div className="resume-desc">{renderBulletPoints(proj.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 技能特长 */}
      {skills && skills.length > 0 && (
        <div className="resume-section" style={{ flexGrow: 1 }}>
          <h2 className="section-title">业务艺能与专长</h2>
          <div className="skills-container" style={{ marginTop: '4px' }}>
            {skills.map((skill, idx) => (
              <div key={idx} className="skill-item" style={{ paddingLeft: '8px', borderLeft: '3px solid var(--theme-primary)', color: '#374151' }}>
                {skill}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================================================
// 📂 3. 简约单页 02 风格复刻 (Modern 02 - 左标题右正文极简精干型)
// ==========================================================================
export const ModernTemplate = ({ data }) => {
  const { basicInfo, education, experience, projects, skills } = data;

  return (
    <div className="tmpl-modern" style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#1f2937' }}>
      {/* 居中姓名与岗位 */}
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h1 style={{ fontSize: 'calc(var(--theme-font-size-base) * 2.1)', fontWeight: 800, color: '#111827', letterSpacing: '1px', margin: 0 }}>
          {basicInfo.name || "姓名"}
        </h1>
        <p style={{ fontSize: 'calc(var(--theme-font-size-base) * 1.05)', fontWeight: 600, color: 'var(--theme-primary)', marginTop: '2px', margin: 0 }}>
          {basicInfo.title || "求职意向"}
        </p>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          flexWrap: 'wrap', 
          gap: '12px', 
          fontSize: 'calc(var(--theme-font-size-base) * 0.86)', 
          color: '#4b5563', 
          marginTop: '6px' 
        }}>
          {basicInfo.phone && <span>{basicInfo.phone}</span>}
          {basicInfo.email && <span>• {basicInfo.email}</span>}
          {basicInfo.wechat && <span>• 微信: {basicInfo.wechat}</span>}
          {basicInfo.github && <span>• GitHub: {basicInfo.github}</span>}
        </div>
      </div>

      {/* 自我评价 */}
      {basicInfo.summary && (
        <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb', padding: '10px 0' }}>
          <div style={{ width: '20%', fontSize: 'calc(var(--theme-font-size-base) * 1.02)', fontWeight: 700, color: 'var(--theme-primary)' }}>
            个人评估
          </div>
          <div style={{ width: '80%', fontSize: 'calc(var(--theme-font-size-base) * 0.88)', color: '#4b5563', textAlign: 'justify', lineHeight: 'var(--theme-line-height)' }}>
            {basicInfo.summary}
          </div>
        </div>
      )}

      {/* 工作经历 */}
      {experience && experience.length > 0 && (
        <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb', padding: '10px 0' }}>
          <div style={{ width: '20%', fontSize: 'calc(var(--theme-font-size-base) * 1.02)', fontWeight: 700, color: 'var(--theme-primary)' }}>
            工作经历
          </div>
          <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {experience.map((exp, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row" style={{ fontWeight: 700 }}>
                  <span>{exp.company}</span>
                  <span style={{ color: '#6b7280', fontSize: '92%', fontWeight: 500 }}>{exp.date}</span>
                </div>
                <div style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.92)', fontWeight: 600, color: '#374151', marginTop: '1px' }}>
                  {exp.role}
                </div>
                {exp.description && <div style={{ marginTop: '2px' }}>{renderBulletPoints(exp.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 项目经历 */}
      {projects && projects.length > 0 && (
        <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb', padding: '10px 0' }}>
          <div style={{ width: '20%', fontSize: 'calc(var(--theme-font-size-base) * 1.02)', fontWeight: 700, color: 'var(--theme-primary)' }}>
            项目开发
          </div>
          <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projects.map((proj, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row" style={{ fontWeight: 700 }}>
                  <span>{proj.name}</span>
                  <span style={{ color: '#6b7280', fontSize: '92%', fontWeight: 500 }}>{proj.date}</span>
                </div>
                <div style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.92)', fontWeight: 600, color: '#374151', marginTop: '1px' }}>
                  {proj.role}
                </div>
                {proj.description && <div style={{ marginTop: '2px' }}>{renderBulletPoints(proj.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 教育背景 */}
      {education && education.length > 0 && (
        <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb', padding: '10px 0' }}>
          <div style={{ width: '20%', fontSize: 'calc(var(--theme-font-size-base) * 1.02)', fontWeight: 700, color: 'var(--theme-primary)' }}>
            教育修业
          </div>
          <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {education.map((edu, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row" style={{ fontWeight: 700 }}>
                  <span>{edu.school}</span>
                  <span style={{ color: '#6b7280', fontSize: '92%', fontWeight: 500 }}>{edu.date}</span>
                </div>
                <div style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.92)', fontWeight: 600, color: '#374151', marginTop: '1px' }}>
                  {edu.major} · {edu.degree}
                </div>
                {edu.description && <div style={{ marginTop: '2px' }}>{renderBulletPoints(edu.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 技能证书 */}
      {skills && skills.length > 0 && (
        <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb', padding: '10px 0', flexGrow: 1 }}>
          <div style={{ width: '20%', fontSize: 'calc(var(--theme-font-size-base) * 1.02)', fontWeight: 700, color: 'var(--theme-primary)' }}>
            技能艺能
          </div>
          <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {skills.map((skill, idx) => (
              <div key={idx} style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.88)', color: '#374151', lineHeight: '1.4' }}>
                ▪ {skill}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================================================
// 📂 4. 活泼单页 01 风格复刻 (Vibrant 01 - 圆角胶囊意向多彩活泼型)
// ==========================================================================
export const VibrantTemplate = ({ data }) => {
  const { basicInfo, education, experience, projects, skills } = data;

  return (
    <div className="tmpl-vibrant" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 胶囊式岗位与姓名 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px', 
        borderBottom: '3.5px solid var(--theme-primary)', 
        paddingBottom: '10px' 
      }}>
        <div>
          <h1 style={{ fontSize: 'calc(var(--theme-font-size-base) * 2.1)', fontWeight: 800, color: '#111827', margin: 0 }}>
            {basicInfo.name || "姓名"}
          </h1>
          <div style={{ 
            backgroundColor: 'var(--theme-primary)', 
            color: '#ffffff', 
            display: 'inline-block', 
            padding: '3px 10px', 
            borderRadius: '15px', /* 胶囊圆角 */
            fontSize: 'calc(var(--theme-font-size-base) * 0.88)',
            fontWeight: 700,
            marginTop: '5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            🎯 {basicInfo.title || "求职意向"}
          </div>
        </div>
        <div style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.88)', color: '#374151', lineHeight: '1.6', fontWeight: 500 }}>
          {basicInfo.phone && <div>📱 <strong style={{ color: '#111827' }}>{basicInfo.phone}</strong></div>}
          {basicInfo.email && <div>✉️ <strong style={{ color: '#111827' }}>{basicInfo.email}</strong></div>}
          {basicInfo.wechat && <div>💬 微信: <strong style={{ color: '#111827' }}>{basicInfo.wechat}</strong></div>}
          {basicInfo.github && <div>🔗 雅集: <strong style={{ color: '#111827' }}>{basicInfo.github.replace(/^https?:\/\//, '')}</strong></div>}
        </div>
      </div>

      {/* 自我评价 */}
      {basicInfo.summary && (
        <div className="resume-section">
          <h2 className="section-title">🌟 个人评估</h2>
          <div className="resume-desc" style={{ marginTop: '2px', color: '#4b5563' }}>{basicInfo.summary}</div>
        </div>
      )}

      {/* 教育背景 */}
      {education && education.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">🎓 修修修业</h2>
          <div className="resume-block-list">
            {education.map((edu, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row" style={{ fontWeight: 700 }}>
                  <span style={{ color: 'var(--theme-primary)' }}>{edu.school}</span>
                  <span>{edu.date}</span>
                </div>
                <div className="resume-subrow" style={{ fontWeight: 600, color: '#374151' }}>
                  <span>{edu.major} · {edu.degree}</span>
                </div>
                {edu.description && <div className="resume-desc">{renderBulletPoints(edu.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 工作经历 */}
      {experience && experience.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">💼 历任履历</h2>
          <div className="resume-block-list">
            {experience.map((exp, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row" style={{ fontWeight: 700 }}>
                  <span style={{ color: 'var(--theme-primary)' }}>{exp.company}</span>
                  <span>{exp.date}</span>
                </div>
                <div className="resume-subrow" style={{ fontWeight: 600, color: '#374151' }}>
                  <span>{exp.role}</span>
                </div>
                {exp.description && <div className="resume-desc">{renderBulletPoints(exp.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 项目经历 */}
      {projects && projects.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">🚀 专研项目</h2>
          <div className="resume-block-list">
            {projects.map((proj, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row" style={{ fontWeight: 700 }}>
                  <span style={{ color: 'var(--theme-primary)' }}>{proj.name}</span>
                  <span>{proj.date}</span>
                </div>
                <div className="resume-subrow" style={{ fontWeight: 600, color: '#374151' }}>
                  <span>{proj.role}</span>
                </div>
                {proj.description && <div className="resume-desc">{renderBulletPoints(proj.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 技能标签 (平铺多彩圆角小标签) */}
      {skills && skills.length > 0 && (
        <div className="resume-section" style={{ flexGrow: 1 }}>
          <h2 className="section-title">🛠️ 艺能与技能</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {skills.map((skill, idx) => (
              <div 
                key={idx} 
                className="skill-item" 
                style={{ 
                  display: 'inline-block',
                  backgroundColor: 'rgba(59, 130, 246, 0.06)',
                  padding: '3px 8px',
                  borderRadius: '12px', /* 极润圆角 */
                  border: '1px solid rgba(59, 130, 246, 0.1)',
                  fontSize: 'calc(var(--theme-font-size-base) * 0.85)',
                  color: 'var(--theme-primary)',
                  fontWeight: 600,
                  margin: 0
                }}
              >
                ⚡ {skill}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================================================
// 📂 5. 文艺单页 03 风格复刻 (Elegant 03 - 居中典雅大字距诗意衬线型)
// ==========================================================================
export const ElegantTemplate = ({ data }) => {
  const { basicInfo, education, experience, projects, skills } = data;

  return (
    <div className="tmpl-elegant" style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#1f2937' }}>
      {/* 纯古典大字距居中头部 */}
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <h1 style={{ 
          fontSize: 'calc(var(--theme-font-size-base) * 2.3)', 
          fontWeight: 700, 
          color: '#111827', 
          letterSpacing: '5px',
          margin: 0,
          fontFamily: 'var(--theme-font-family-serif)'
        }}>
          {basicInfo.name || "姓名"}
        </h1>
        <p style={{ 
          fontSize: 'calc(var(--theme-font-size-base) * 1.05)', 
          fontWeight: 700, 
          color: 'var(--theme-primary)', 
          marginTop: '6px', 
          letterSpacing: '2px',
          margin: 0,
          fontFamily: 'var(--theme-font-family-serif)'
        }}>
          {basicInfo.title || "意向"}
        </p>
        
        {/* 高雅小菱形分割线 (完美复刻文艺单页03的花型分隔线) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '8px 0' }}>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to right, transparent, var(--theme-primary))' }} />
          <span style={{ fontSize: '8px', color: 'var(--theme-primary)' }}>♦</span>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to left, transparent, var(--theme-primary))' }} />
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          flexWrap: 'wrap', 
          gap: '12px', 
          fontSize: 'calc(var(--theme-font-size-base) * 0.86)', 
          color: '#4b5563', 
          letterSpacing: '0.5px'
        }}>
          {basicInfo.phone && <span>联络: {basicInfo.phone}</span>}
          {basicInfo.email && <span>邮存: {basicInfo.email}</span>}
          {basicInfo.wechat && <span>微信: {basicInfo.wechat}</span>}
          {basicInfo.github && <span>雅集: {basicInfo.github}</span>}
        </div>
      </div>

      {/* 自叙 */}
      {basicInfo.summary && (
        <div className="resume-section">
          <h2 className="section-title">自叙</h2>
          <div className="resume-desc" style={{ marginTop: '2px', textAlign: 'justify', textIndent: '2em', letterSpacing: '0.3px', lineHeight: 'var(--theme-line-height)' }}>
            {basicInfo.summary}
          </div>
        </div>
      )}

      {/* 历任工作 */}
      {experience && experience.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">生平履历</h2>
          <div className="resume-block-list">
            {experience.map((exp, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row">
                  <span style={{ fontWeight: 700 }}>{exp.company}</span>
                  <span style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.88)', color: '#6b7280' }}>{exp.date}</span>
                </div>
                <div className="resume-subrow" style={{ fontWeight: 700, color: 'var(--theme-primary)', marginTop: '1px' }}>
                  <span>{exp.role}</span>
                </div>
                {exp.description && <div className="resume-desc" style={{ letterSpacing: '0.2px' }}>{renderBulletPoints(exp.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 专研项目 */}
      {projects && projects.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">专研项目</h2>
          <div className="resume-block-list">
            {projects.map((proj, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row">
                  <span style={{ fontWeight: 700 }}>{proj.name}</span>
                  <span style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.88)', color: '#6b7280' }}>{proj.date}</span>
                </div>
                <div className="resume-subrow" style={{ fontWeight: 700, color: 'var(--theme-primary)', marginTop: '1px' }}>
                  <span>{proj.role}</span>
                </div>
                {proj.description && <div className="resume-desc" style={{ letterSpacing: '0.2px' }}>{renderBulletPoints(proj.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 进修背景 */}
      {education && education.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">修业背景</h2>
          <div className="resume-block-list">
            {education.map((edu, idx) => (
              <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                <div className="resume-row">
                  <span style={{ fontWeight: 700 }}>{edu.school}</span>
                  <span style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.88)', color: '#6b7280' }}>{edu.date}</span>
                </div>
                <div className="resume-subrow" style={{ fontWeight: 700, color: 'var(--theme-primary)', marginTop: '1px' }}>
                  <span>{edu.major} · {edu.degree}</span>
                </div>
                {edu.description && <div className="resume-desc" style={{ letterSpacing: '0.2px' }}>{renderBulletPoints(edu.description)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 专业特长 */}
      {skills && skills.length > 0 && (
        <div className="resume-section" style={{ flexGrow: 1 }}>
          <h2 className="section-title">专业艺能</h2>
          <div className="skills-container" style={{ marginTop: '4px', letterSpacing: '0.3px' }}>
            {skills.map((skill, idx) => (
              <div key={idx} className="skill-item" style={{ paddingLeft: '2px', color: '#374151' }}>
                ♦ {skill}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
