import React, { useState, useEffect } from 'react';
import { Printer, FileText, Loader } from 'lucide-react';

export default function PreviewPanel({
  previewHtml,
  previewLoading,
  onNotification,
  templateName,
  resumeData
}) {
  const [canvasScale, setCanvasScale] = useState(0.7);

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

  const handlePrint = () => {
    const defaultName = `${resumeData.basicInfo.name || '我的'}_求职简历.pdf`;
    if (window.electronAPI) {
      onNotification({ type: 'info', message: '正在生成 PDF...' });
      window.electronAPI.printToPdf(defaultName, templateName, resumeData);
    } else {
      onNotification({ type: 'success', message: '正在启动打印...' });
      setTimeout(() => window.print(), 500);
    }
  };

  const handleExportWord = () => {
    if (!window.electronAPI || !templateName) {
      onNotification({ type: 'warning', message: '请先选择模板' });
      return;
    }
    onNotification({ type: 'info', message: `正在导出到 "${templateName}"...` });
    window.electronAPI.exportToWord(templateName, resumeData);
  };

  return (
    <div className="preview-panel">
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
              style={{ width: '80px', height: '4px', cursor: 'pointer' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '35px' }}>
              {Math.round(canvasScale * 100)}%
            </span>
          </div>
        </div>

        {templateName && (
          <div style={{
            fontSize: '11px', color: 'var(--color-text-muted)',
            background: 'rgba(255,255,255,0.04)', padding: '4px 8px',
            borderRadius: '4px', maxWidth: '200px', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {templateName.replace('.docx', '')}
          </div>
        )}
      </div>

      <div className="a4-container" style={{
        width: '794px', minHeight: '1123px',
        background: '#fff', borderRadius: '4px',
        overflow: 'hidden', position: 'relative',
        transform: `scale(${canvasScale})`, transformOrigin: 'top center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
      }}>
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
      </div>

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
