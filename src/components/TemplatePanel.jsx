import React from 'react';
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
  setSelectedTemplate
}) {
  const grouped = {};
  templateList.forEach(t => {
    let group = '其他';
    for (const g of STYLE_GROUPS) {
      if (t.name.startsWith(g.key)) { group = g.label; break; }
    }
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(t);
  });

  return (
    <div className="glass-panel template-panel" style={{ color: '#f3f4f6' }}>
      <div style={{
        padding: '16px 18px', borderBottom: '1px solid var(--border-glass)',
        fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center',
        gap: '8px', background: 'rgba(0,0,0,0.1)'
      }}>
        <Layers size={16} style={{ color: 'var(--color-accent)' }} /> 选择模板 ({templateList.length})
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        {Object.entries(grouped).map(([group, templates]) => (
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
