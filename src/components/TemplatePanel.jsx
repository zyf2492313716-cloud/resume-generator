import React, { useState, useEffect } from 'react';
import { Layers, FileText, RefreshCw } from 'lucide-react';

const STYLE_GROUPS = [
  { key: '极简', label: '极简单页', icon: '◻' },
  { key: '稳重', label: '稳重单页', icon: '◆' },
  { key: '简约', label: '简约单页', icon: '○' },
  { key: '活泼', label: '活泼单页', icon: '◇' },
  { key: '文艺', label: '文艺单页', icon: '♢' },
  { key: '知页', label: '知页简历', icon: '▣' },
];

export default function TemplatePanel({
  templateList,
  selectedTemplate,
  setSelectedTemplate,
  onReloadTemplates
}) {
  const [configStatus, setConfigStatus] = useState({});

  useEffect(() => {
    if (!window.electronAPI?.checkTemplateConfig || !templateList.length) return;
    const check = async () => {
      const status = {};
      for (const t of templateList) {
        try {
          const result = await window.electronAPI.checkTemplateConfig(t.path);
          status[t.name] = result;
        } catch (e) {
          status[t.name] = { hasConfig: false, fallback: false };
        }
      }
      setConfigStatus(status);
    };
    check();
  }, [templateList]);

  const getStatusIcon = (name) => {
    const s = configStatus[name];
    if (!s) return null;
    if (s.hasConfig && !s.fallback) return <span title="YAML 配置" style={{ color: '#4ade80', fontSize: '10px', fontWeight: 700 }}>✓</span>;
    if (s.hasConfig && s.fallback) return <span title="YAML + v2 兜底" style={{ color: '#fb923c', fontSize: '10px', fontWeight: 700 }}>○</span>;
    return <span title="v2 填充" style={{ color: '#6b7280', fontSize: '10px' }}>—</span>;
  };
  const grouped = {};
  templateList.forEach(t => {
    let group = '其他';
    for (const g of STYLE_GROUPS) {
      if (t.name.startsWith(g.key)) { group = g.label; break; }
    }
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(t);
  });

  const handleSelectDir = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.selectTemplateDir();
    if (result.success && onReloadTemplates) {
      onReloadTemplates();
    }
  };

  return (
    <div className="glass-panel template-panel" style={{ color: '#f3f4f6' }}>
      <div style={{
        padding: '16px 18px', borderBottom: '1px solid var(--border-glass)',
        fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', background: 'rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} style={{ color: 'var(--color-accent)' }} /> 选择模板 ({templateList.length})
        </div>
        <button onClick={handleSelectDir} title="选择模板文件夹" style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '4px', padding: '3px 8px', cursor: 'pointer',
          color: 'var(--color-text-muted)', fontSize: '11px', display: 'flex',
          alignItems: 'center', gap: '4px'
        }}>
          <RefreshCw size={11} /> 更换
        </button>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        {templateList.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: '12px',
            color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px'
          }}>
            <FileText size={32} style={{ opacity: 0.4 }} />
            <div>未找到模板文件</div>
            <button onClick={handleSelectDir} style={{
              padding: '8px 16px', background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px',
              color: '#93c5fd', cursor: 'pointer', fontSize: '12px', fontWeight: 600
            }}>
              选择模板文件夹
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([group, templates]) => (
            <div key={group}>
              <div style={{
                fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)',
                marginBottom: '6px', paddingLeft: '8px',
                borderLeft: '2px solid var(--color-accent)'
              }}>
                {group} ({templates.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {templates.map(t => {
                  const isSelected = selectedTemplate?.name === t.name;
                  return (
                    <div key={t.name}
                      onClick={() => { setSelectedTemplate(t); }}
                      style={{
                        padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                        background: isSelected ? 'rgba(59,130,246,0.15)' : 'transparent',
                        border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent',
                        fontSize: '12px', fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? '#fff' : 'var(--color-text-muted)',
                        transition: 'all 0.15s'
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={12} style={{ flexShrink: 0 }} />
                        <span>{t.displayName}</span>
                        {getStatusIcon(t.name)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
