import React from 'react';

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

export const MinimalistTemplate = ({ data }) => {
  const { basicInfo, education, experience, projects, skills } = data;

  return (
    <div className="tmpl-minimalist" style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#1f2937' }}>
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
          {basicInfo.phone && <div>{basicInfo.phone}</div>}
          {basicInfo.email && <div>{basicInfo.email}</div>}
          {(basicInfo.wechat || basicInfo.github) && (
            <div>
              {basicInfo.wechat && `微信: ${basicInfo.wechat}`}
              {basicInfo.wechat && basicInfo.github && ' | '}
              {basicInfo.github && `GitHub: ${basicInfo.github}`}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1, gap: '25px' }}>

        <div style={{ width: '30%', borderRight: '1px solid #e5e7eb', paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>

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

          {skills && skills.length > 0 && (
            <div style={{ flexGrow: 1 }}>
              <h2 className="section-title" style={{ fontSize: 'calc(var(--theme-font-size-base) * 1.05)', fontWeight: 700, borderBottom: '1px solid #374151', paddingBottom: '3px', color: '#111827' }}>
                专业技能
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {skills.map((skill, idx) => (
                  <div key={idx} style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.85)', color: '#374151', lineHeight: '1.4' }}>
                    - {skill}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ width: '70%', display: 'flex', flexDirection: 'column', gap: '14px' }}>

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

export const ClassicTemplate = ({ data }) => {
  const { basicInfo, education, experience, projects, skills } = data;

  return (
    <div className="tmpl-classic" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
          {basicInfo.phone && <div>电话: {basicInfo.phone}</div>}
          {basicInfo.email && <div>邮箱: {basicInfo.email}</div>}
          {(basicInfo.wechat || basicInfo.github) && (
            <div>
              {basicInfo.wechat && `微信: ${basicInfo.wechat}`}
              {basicInfo.wechat && basicInfo.github && '  |  '}
              {basicInfo.github && `${basicInfo.github.replace(/^https?:\/\//, '')}`}
            </div>
          )}
        </div>
      </div>

      {basicInfo.summary && (
        <div className="resume-section">
          <h2 className="section-title">个人评估</h2>
          <div className="resume-desc" style={{ marginTop: '3px', borderLeft: '3px solid var(--theme-primary)', paddingLeft: '10px', textAlign: 'justify' }}>
            {basicInfo.summary}
          </div>
        </div>
      )}

      {education && education.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">教育背景</h2>
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

      {experience && experience.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">工作经历</h2>
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

      {projects && projects.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">项目经验</h2>
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

      {skills && skills.length > 0 && (
        <div className="resume-section" style={{ flexGrow: 1 }}>
          <h2 className="section-title">技能特长</h2>
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

export const ModernTemplate = ({ data }) => {
  const { basicInfo, education, experience, projects, skills } = data;

  return (
    <div className="tmpl-modern" style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#1f2937' }}>
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
          {basicInfo.email && <span>| {basicInfo.email}</span>}
          {basicInfo.wechat && <span>| 微信: {basicInfo.wechat}</span>}
          {basicInfo.github && <span>| GitHub: {basicInfo.github}</span>}
        </div>
      </div>

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

      {projects && projects.length > 0 && (
        <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb', padding: '10px 0' }}>
          <div style={{ width: '20%', fontSize: 'calc(var(--theme-font-size-base) * 1.02)', fontWeight: 700, color: 'var(--theme-primary)' }}>
            项目经验
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

      {education && education.length > 0 && (
        <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb', padding: '10px 0' }}>
          <div style={{ width: '20%', fontSize: 'calc(var(--theme-font-size-base) * 1.02)', fontWeight: 700, color: 'var(--theme-primary)' }}>
            教育背景
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

      {skills && skills.length > 0 && (
        <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb', padding: '10px 0', flexGrow: 1 }}>
          <div style={{ width: '20%', fontSize: 'calc(var(--theme-font-size-base) * 1.02)', fontWeight: 700, color: 'var(--theme-primary)' }}>
            技能特长
          </div>
          <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {skills.map((skill, idx) => (
              <div key={idx} style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.88)', color: '#374151', lineHeight: '1.4' }}>
                - {skill}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const VibrantTemplate = ({ data }) => {
  const { basicInfo, education, experience, projects, skills } = data;

  return (
    <div className="tmpl-vibrant" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
            borderRadius: '15px',
            fontSize: 'calc(var(--theme-font-size-base) * 0.88)',
            fontWeight: 700,
            marginTop: '5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {basicInfo.title || "求职意向"}
          </div>
        </div>
        <div style={{ fontSize: 'calc(var(--theme-font-size-base) * 0.88)', color: '#374151', lineHeight: '1.6', fontWeight: 500 }}>
          {basicInfo.phone && <div><strong style={{ color: '#111827' }}>{basicInfo.phone}</strong></div>}
          {basicInfo.email && <div><strong style={{ color: '#111827' }}>{basicInfo.email}</strong></div>}
          {basicInfo.wechat && <div>微信: <strong style={{ color: '#111827' }}>{basicInfo.wechat}</strong></div>}
          {basicInfo.github && <div>GitHub: <strong style={{ color: '#111827' }}>{basicInfo.github.replace(/^https?:\/\//, '')}</strong></div>}
        </div>
      </div>

      {basicInfo.summary && (
        <div className="resume-section">
          <h2 className="section-title">个人评估</h2>
          <div className="resume-desc" style={{ marginTop: '2px', color: '#4b5563' }}>{basicInfo.summary}</div>
        </div>
      )}

      {education && education.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">教育背景</h2>
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

      {experience && experience.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">工作经历</h2>
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

      {projects && projects.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">项目经验</h2>
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

      {skills && skills.length > 0 && (
        <div className="resume-section" style={{ flexGrow: 1 }}>
          <h2 className="section-title">技能特长</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {skills.map((skill, idx) => (
              <div
                key={idx}
                className="skill-item"
                style={{
                  display: 'inline-block',
                  backgroundColor: 'rgba(59, 130, 246, 0.06)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.1)',
                  fontSize: 'calc(var(--theme-font-size-base) * 0.85)',
                  color: 'var(--theme-primary)',
                  fontWeight: 600,
                  margin: 0
                }}
              >
                {skill}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ElegantTemplate = ({ data }) => {
  const { basicInfo, education, experience, projects, skills } = data;

  return (
    <div className="tmpl-elegant" style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#1f2937' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '8px 0' }}>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to right, transparent, var(--theme-primary))' }} />
          <span style={{ fontSize: '8px', color: 'var(--theme-primary)' }}>+</span>
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
          {basicInfo.phone && <span>电话: {basicInfo.phone}</span>}
          {basicInfo.email && <span>邮箱: {basicInfo.email}</span>}
          {basicInfo.wechat && <span>微信: {basicInfo.wechat}</span>}
          {basicInfo.github && <span>GitHub: {basicInfo.github}</span>}
        </div>
      </div>

      {basicInfo.summary && (
        <div className="resume-section">
          <h2 className="section-title">自叙</h2>
          <div className="resume-desc" style={{ marginTop: '2px', textAlign: 'justify', textIndent: '2em', letterSpacing: '0.3px', lineHeight: 'var(--theme-line-height)' }}>
            {basicInfo.summary}
          </div>
        </div>
      )}

      {experience && experience.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">工作经历</h2>
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

      {projects && projects.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">项目经验</h2>
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

      {education && education.length > 0 && (
        <div className="resume-section">
          <h2 className="section-title">教育背景</h2>
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

      {skills && skills.length > 0 && (
        <div className="resume-section" style={{ flexGrow: 1 }}>
          <h2 className="section-title">技能特长</h2>
          <div className="skills-container" style={{ marginTop: '4px', letterSpacing: '0.3px' }}>
            {skills.map((skill, idx) => (
              <div key={idx} className="skill-item" style={{ paddingLeft: '2px', color: '#374151' }}>
                - {skill}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
