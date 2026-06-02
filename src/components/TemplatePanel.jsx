import React from 'react';
import { 
  Palette, 
  Layers, 
  Download, 
  Upload, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { DEFAULT_RESUME_DATA } from '../utils/aiParser';

// 配色卡定义
const THEME_PALETTES = [
  { name: '黛蓝 (经典商务)', value: '#1e3a8a', desc: '职场经典，适用于国企/金融/选调生' },
  { name: '竹青 (优雅活力)', value: '#0f766e', desc: '低调奢华，适用于IT/技术/运营' },
  { name: '朱砂 (儒雅文艺)', value: '#991b1b', desc: '高雅古典，适用于文职/教师/传媒' },
  { name: '玄灰 (极简主义)', value: '#374151', desc: '极简典雅，适用于程序员/学术科研' }
];

// 模板定义
const RESUME_TEMPLATES = [
  { id: 'minimalist', name: '极简单页', desc: '黑灰线条，大呼吸感排版' },
  { id: 'classic', name: '稳重单页', desc: '经典的深色页眉头部' },
  { id: 'modern', name: '简约单页', desc: '现代居中，精细渐变细线' },
  { id: 'vibrant', name: '活泼单页', desc: '精致小图标与背景高亮块' },
  { id: 'elegant', name: '文艺单页', desc: '优雅衬线体，居中古典菱形' }
];

export default function TemplatePanel({
  selectedTemplate,
  setSelectedTemplate,
  themeColor,
  setThemeColor,
  resumeData,
  setResumeData,
  onNotification
}) {

  // 一键备份简历 JSON 文件
  const handleExportJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resumeData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const fileName = `${resumeData.basicInfo.name || '我的'}_简历数据配置备份.json`;
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      onNotification({ type: 'success', message: '简历 JSON 数据已成功导出备份！' });
    } catch (err) {
      onNotification({ type: 'warning', message: '数据备份失败，请重试。' });
    }
  };

  // 一键恢复以前的简历 JSON 文件
  const handleImportJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        // 做简单的属性验证
        if (parsed.basicInfo) {
          setResumeData(parsed);
          onNotification({ type: 'success', message: '已成功导入您所备份的简历配置！' });
        } else {
          onNotification({ type: 'warning', message: '解析格式不匹配，非标准简历数据。' });
        }
      } catch (err) {
        onNotification({ type: 'warning', message: 'JSON 格式解析错误，请确保文件完整。' });
      }
    };
    reader.readAsText(file);
  };

  // 重置简历
  const handleResetData = () => {
    if (window.confirm("确定要恢复默认简历数据吗？当前输入的数据将丢失！")) {
      setResumeData(DEFAULT_RESUME_DATA);
      onNotification({ type: 'info', message: '已成功恢复系统默认高保真简历数据' });
    }
  };

  return (
    <div className="glass-panel template-panel" style={{ color: '#f3f4f6' }}>
      
      {/* 顶部标题 */}
      <div style={{ 
        padding: '16px 18px', 
        borderBottom: '1px solid var(--border-glass)', 
        fontSize: '14px', 
        fontWeight: 700, 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        background: 'rgba(0,0,0,0.1)'
      }}>
        <Layers size={16} style={{ color: 'var(--color-accent)' }} /> 简历风格与模板选择
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 1. 风格选择 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} /> 模板风格选择
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {RESUME_TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplate(tmpl.id);
                    onNotification({ type: 'success', message: `已成功套用“${tmpl.name}”样式` });
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: isSelected ? '1.5px solid var(--color-accent)' : '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? '#fff' : 'var(--color-text-main)' }}>{tmpl.name}</span>
                    {isSelected && (
                      <span style={{ 
                        fontSize: '9px', 
                        background: 'var(--color-accent)', 
                        padding: '1px 5px', 
                        borderRadius: '10px', 
                        fontWeight: 700 
                      }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {tmpl.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. 主题配色 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Palette size={14} /> 主题色系调配
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {THEME_PALETTES.map((color) => {
              const isSelected = themeColor === color.value;
              return (
                <div
                  key={color.value}
                  onClick={() => {
                    setThemeColor(color.value);
                    onNotification({ type: 'info', message: `已成功调配主题色为：${color.name.split(' ')[0]}` });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: isSelected ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '4px', 
                    backgroundColor: color.value, 
                    boxShadow: isSelected ? `0 0 10px ${color.value}` : 'none'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#fff' : 'var(--color-text-muted)' }}>{color.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{color.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 简历备份管理 */}
        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '15px', marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            💾 数据备份与恢复
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* 备份导出 */}
            <button
              onClick={handleExportJson}
              style={{
                padding: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-glass)',
                borderRadius: '6px',
                color: 'var(--color-text-main)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
            >
              <Download size={12} /> 备份数据
            </button>

            {/* 导入恢复 */}
            <label
              style={{
                padding: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-glass)',
                borderRadius: '6px',
                color: 'var(--color-text-main)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s',
                textAlign: 'center'
              }}
            >
              <Upload size={12} /> 恢复数据
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportJson} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>

          {/* 系统重置 */}
          <button
            onClick={handleResetData}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              color: 'var(--color-danger)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s'
            }}
          >
            <RotateCcw size={12} /> 重置为系统默认数据
          </button>
        </div>

      </div>
    </div>
  );
}
