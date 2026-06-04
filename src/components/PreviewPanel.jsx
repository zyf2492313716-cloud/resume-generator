import React, { useState, useEffect } from 'react';
import { Printer, FileText, Loader, Eye, EyeOff, Palette, Type, Space, Camera } from 'lucide-react';
import InteractiveCanvas from './InteractiveCanvas';
import SnapshotModal from './SnapshotModal';

export default function PreviewPanel({
  previewHtml,
  previewLoading,
  onNotification,
  selectedTemplate,
  resumeData,
  setResumeData,
  engineType
}) {
  const [canvasScale, setCanvasScale] = useState(0.7);
  const [layoutAdjustments, setLayoutAdjustments] = useState({});

  // Advanced Layout Control States
  const [isDesensitized, setIsDesensitized] = useState(false);
  const [themeColor, setThemeColor] = useState('');
  const [fontSizeOffset, setFontSizeOffset] = useState(0);
  const [spacingOffset, setSpacingOffset] = useState(0);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  useEffect(() => {
    // Reset layout adjustments when the template changes
    setLayoutAdjustments({});
    setThemeColor('');
    setFontSizeOffset(0);
    setSpacingOffset(0);
  }, [selectedTemplate?.name]);

  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanups = [
      window.electronAPI.onWordSaved((msg) => onNotification({ type: 'success', message: msg })),
      window.electronAPI.onWordFailed((msg) => onNotification({ type: 'warning', message: msg })),
      window.electronAPI.onPdfSaved((msg) => onNotification({ type: 'success', message: msg })),
      window.electronAPI.onPdfFailed((msg) => onNotification({ type: 'warning', message: msg })),
    ];

    return () => cleanups.forEach(fn => fn());
  }, [onNotification]);

  // Deep clone and obfuscate personal data fields for desensitized outputs
  const getDesensitizedData = (data) => {
    const copy = JSON.parse(JSON.stringify(data));
    if (copy.basicInfo) {
      const rawName = copy.basicInfo.name || '';
      copy.basicInfo.name = rawName.length > 1 ? `${rawName[0]}${'*'.repeat(rawName.length - 1)}` : '求职者';
      if (copy.basicInfo.phone) {
        copy.basicInfo.phone = copy.basicInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
      if (copy.basicInfo.email) {
        copy.basicInfo.email = copy.basicInfo.email.replace(/(.{2}).*(@.*)/, '$1***$2');
      }
      if (copy.basicInfo.wechat) {
        copy.basicInfo.wechat = '***';
      }
    }
    return copy;
  };

  const handlePrint = () => {
    const dataToExport = isDesensitized ? getDesensitizedData(resumeData) : resumeData;
    const defaultName = `${dataToExport.basicInfo.name || '我的'}_求职简历.pdf`;
    
    if (window.electronAPI) {
      onNotification({ type: 'info', message: '正在生成 PDF...' });
      window.electronAPI.printToPdf(defaultName, selectedTemplate?.name, dataToExport, layoutAdjustments);
    } else {
      onNotification({ type: 'success', message: '正在启动打印...' });
      setTimeout(() => window.print(), 500);
    }
  };

  const handleExportWord = () => {
    if (!window.electronAPI || !selectedTemplate) {
      onNotification({ type: 'warning', message: '请先选择模板' });
      return;
    }
    const dataToExport = isDesensitized ? getDesensitizedData(resumeData) : resumeData;
    onNotification({ type: 'info', message: `正在导出到 "${selectedTemplate.name}"...` });
    window.electronAPI.exportToWord(selectedTemplate.name, dataToExport, layoutAdjustments);
  };

  const handleApplySnapshot = (snappedData, snappedLayout) => {
    setResumeData(snappedData);
    setLayoutAdjustments(snappedLayout);
  };

  const isSpatial = engineType === 'spatial';
  const a4Width = isSpatial ? '595px' : '794px';
  const a4MinHeight = isSpatial ? '842px' : '1123px';

  return (
    <div className="preview-panel">
      
      {/* Primary Export and Sizing Toolbar */}
      <div className="print-hide" style={{
        width: '100%', maxWidth: '850px',
        background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
        backdropFilter: 'blur(10px)', borderRadius: '12px',
        padding: '12px 18px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={handleExportWord} style={{
            padding: '8px 14px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', boxShadow: '0 4px 12px rgba(59,130,246,0.25)'
          }}>
            <FileText size={14} /> 导出 Word
          </button>
          <button onClick={handlePrint} style={{
            padding: '8px 14px', background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', boxShadow: '0 4px 12px rgba(16,185,129,0.25)'
          }}>
            <Printer size={14} /> 导出 PDF
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>缩放:</span>
            <input type="range" min="0.4" max="1.2" step="0.05" value={canvasScale}
              onChange={(e) => setCanvasScale(parseFloat(e.target.value))}
              style={{ width: '70px', height: '4px', cursor: 'pointer' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '35px' }}>
              {Math.round(canvasScale * 100)}%
            </span>
          </div>
        </div>

        {selectedTemplate?.name && (
          <div style={{
            fontSize: '11px', color: 'var(--color-text-muted)',
            background: 'rgba(255,255,255,0.04)', padding: '4px 8px',
            borderRadius: '4px', maxWidth: '200px', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {selectedTemplate.name.replace('.docx', '')}
          </div>
        )}
      </div>

      {/* Advanced Layout Customization Toolbar (Only visible for absolute layout spatial templates) */}
      {isSpatial && (
        <div className="print-hide" style={{
          width: '100%', maxWidth: '850px',
          background: 'rgba(23, 23, 23, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '8px', padding: '10px 16px', display: 'flex', gap: '15px',
          alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          {/* Spacing Offset Adjuster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Space size={12} /> 板块间距:
            </span>
            <input type="range" min="-30" max="30" step="5" value={spacingOffset}
              onChange={(e) => setSpacingOffset(parseInt(e.target.value))}
              style={{ width: '65px', height: '3px', cursor: 'pointer' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '32px' }}>
              {spacingOffset > 0 ? `+${spacingOffset}` : spacingOffset}px
            </span>
          </div>

          {/* FontSize Offset Adjuster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Type size={12} /> 全局字号:
            </span>
            <input type="range" min="-2.0" max="2.0" step="0.5" value={fontSizeOffset}
              onChange={(e) => setFontSizeOffset(parseFloat(e.target.value))}
              style={{ width: '65px', height: '3px', cursor: 'pointer' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '32px' }}>
              {fontSizeOffset > 0 ? `+${fontSizeOffset}` : fontSizeOffset}pt
            </span>
          </div>

          {/* Global Accent Theme recoloring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Palette size={12} /> 主题换色:
            </span>
            <div style={{ position: 'relative', width: '18px', height: '18px', borderRadius: '50%', background: themeColor || '#3b82f6', border: '1.5px solid #fff', cursor: 'pointer', overflow: 'hidden' }}>
              <input type="color" value={themeColor || '#3b82f6'}
                onChange={(e) => setThemeColor(e.target.value)}
                style={{ position: 'absolute', inset: '-5px', width: '30px', height: '30px', cursor: 'pointer', opacity: 0 }} />
            </div>
            {themeColor && (
              <button onClick={() => setThemeColor('')} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', padding: 0 }}>
                清除
              </button>
            )}
          </div>

          {/* Privacy Desensitization Toggle */}
          <button onClick={() => setIsDesensitized(!isDesensitized)} style={{
            padding: '5px 10px', background: isDesensitized ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isDesensitized ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: isDesensitized ? '#34d399' : '#d1d5db', borderRadius: '4px', cursor: 'pointer',
            fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            {isDesensitized ? <EyeOff size={12} /> : <Eye size={12} />}
            隐私打码 {isDesensitized ? '已开启' : '已关闭'}
          </button>

          {/* Snapshots Button */}
          <button onClick={() => setShowSnapshotModal(true)} style={{
            padding: '5px 10px', background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#60a5fa', borderRadius: '4px', cursor: 'pointer',
            fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            <Camera size={12} /> 历史快照
          </button>
        </div>
      )}

      {/* Render canvas or Mammoth output */}
      <div className="a4-container" style={{
        width: a4Width, minHeight: a4MinHeight,
        background: isSpatial ? 'transparent' : '#fff', borderRadius: '4px',
        overflow: isSpatial ? 'visible' : 'hidden', position: 'relative',
        transform: `scale(${canvasScale})`, transformOrigin: 'top center',
        boxShadow: isSpatial ? 'none' : '0 8px 40px rgba(0,0,0,0.3)'
      }}>
        {isSpatial ? (
          <InteractiveCanvas
            templatePath={selectedTemplate?.path}
            resumeData={resumeData}
            setResumeData={setResumeData}
            onNotification={onNotification}
            canvasScale={canvasScale}
            layoutAdjustments={layoutAdjustments}
            setLayoutAdjustments={setLayoutAdjustments}
            isDesensitized={isDesensitized}
            themeColor={themeColor}
            fontSizeOffset={fontSizeOffset}
            spacingOffset={spacingOffset}
          />
        ) : (
          <>
            {previewLoading && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(255,255,255,0.85)', zIndex: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                  <Loader size={20} className="animate-spin" />
                  <span>正在渲染模板预览...</span>
                </div>
              </div>
            )}
            {previewHtml ? (
              <div
                className="preview-content"
                style={{ padding: '0', width: '100%', minHeight: '1123px' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '1123px', color: '#9ca3af', gap: '10px'
              }}>
                <FileText size={32} />
                <div style={{ fontSize: '14px' }}>请先在左侧编辑简历数据，右侧选择模板</div>
                <div style={{ fontSize: '12px' }}>选中模板后将自动生成预览</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Snapshot Controller Modal Popover */}
      {showSnapshotModal && (
        <SnapshotModal
          onClose={() => setShowSnapshotModal(false)}
          templateName={selectedTemplate?.name}
          resumeData={resumeData}
          layoutAdjustments={layoutAdjustments}
          onApplySnapshot={handleApplySnapshot}
          onNotification={onNotification}
        />
      )}

      <style>{`
        .preview-content {
          font-family: '宋体', 'SimSun', 'Times New Roman', serif;
        }
        .preview-content table {
          border-collapse: collapse;
          width: 100%;
        }
        .preview-content img {
          max-width: 100%;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
