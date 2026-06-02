import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Sparkles,
  Maximize2,
  Minimize2,
  Sliders,
  CheckCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import {
  MinimalistTemplate,
  ClassicTemplate,
  ModernTemplate,
  VibrantTemplate,
  ElegantTemplate
} from './ResumeTemplates';

export default function PreviewPanel({
  resumeData,
  selectedTemplate,
  themeColor,
  onNotification
}) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  const [autoFitEnabled, setAutoFitEnabled] = useState(true);
  const [fullPackEnabled, setFullPackEnabled] = useState(true);
  const [canvasScale, setCanvasScale] = useState(0.8);

  const [pageMetrics, setPageMetrics] = useState({
    scrollHeight: 0,
    clientHeight: 1123,
    ratio: 100,
    status: 'perfect'
  });

  const [fitConfig, setFitConfig] = useState({
    fontSize: 14,
    lineHeight: 1.6,
    paddingY: 12,
    marginY: 10
  });

  const [showManualControls, setShowManualControls] = useState(false);

  const renderTemplateContent = () => {
    const props = { data: resumeData };
    switch (selectedTemplate) {
      case 'minimalist':
        return <MinimalistTemplate {...props} />;
      case 'classic':
        return <ClassicTemplate {...props} />;
      case 'modern':
        return <ModernTemplate {...props} />;
      case 'vibrant':
        return <VibrantTemplate {...props} />;
      case 'elegant':
        return <ElegantTemplate {...props} />;
      default:
        return <MinimalistTemplate {...props} />;
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--theme-primary', themeColor);
    }
  }, [themeColor]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onPdfSaved((msg) => {
        onNotification({ type: 'success', message: msg });
      });
      window.electronAPI.onPdfFailed((err) => {
        if (err !== '导出已取消') {
          onNotification({ type: 'warning', message: err });
        }
      });

      window.electronAPI.onWordSaved((msg) => {
        onNotification({ type: 'success', message: msg });
      });
      window.electronAPI.onWordFailed((err) => {
        if (err !== '导出已取消') {
          onNotification({ type: 'warning', message: err });
        }
      });
    }
  }, []);

  const runAutoFit = () => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    if (!autoFitEnabled) {
      const sh = content.scrollHeight;
      const ch = container.clientHeight;
      const ratio = Math.round((sh / ch) * 100);
      let status = 'perfect';
      if (sh > ch) status = 'overflow';
      else if (sh < ch * 0.8) status = 'empty';
      setPageMetrics({ scrollHeight: sh, clientHeight: ch, ratio, status });
      return;
    }

    let currentFontSize = 14;
    let currentLineHeight = 1.6;
    let currentPaddingY = 12;
    let currentMarginY = 10;

    const ch = container.clientHeight;
    let sh = content.scrollHeight;

    const maxIterations = 35;
    let i = 0;

    const applyStylesToDom = (fs, lh, py, my) => {
      container.style.setProperty('--theme-font-size-base', `${fs}px`);
      container.style.setProperty('--theme-line-height', lh);
      container.style.setProperty('--theme-padding-y', `${py}px`);
      container.style.setProperty('--theme-margin-y', `${my}px`);
    };

    applyStylesToDom(currentFontSize, currentLineHeight, currentPaddingY, currentMarginY);
    sh = content.scrollHeight;

    while (sh > ch && i < maxIterations) {
      if (currentMarginY > 5) {
        currentMarginY -= 1;
      } else if (currentPaddingY > 6) {
        currentPaddingY -= 1;
      } else if (currentLineHeight > 1.3) {
        currentLineHeight -= 0.05;
      } else if (currentFontSize > 11.5) {
        currentFontSize -= 0.2;
      } else {
        break;
      }

      applyStylesToDom(currentFontSize, currentLineHeight, currentPaddingY, currentMarginY);
      sh = content.scrollHeight;
      i++;
    }

    if (fullPackEnabled && sh < ch * 0.82) {
      while (sh < ch * 0.95 && i < maxIterations) {
        if (currentFontSize < 15.5) {
          currentFontSize += 0.2;
        } else if (currentLineHeight < 1.75) {
          currentLineHeight += 0.05;
        } else if (currentMarginY < 14) {
          currentMarginY += 1;
        } else if (currentPaddingY < 16) {
          currentPaddingY += 1;
        } else {
          break;
        }

        applyStylesToDom(currentFontSize, currentLineHeight, currentPaddingY, currentMarginY);
        sh = content.scrollHeight;
        i++;
      }
    }

    setFitConfig({
      fontSize: parseFloat(currentFontSize.toFixed(1)),
      lineHeight: parseFloat(currentLineHeight.toFixed(2)),
      paddingY: currentPaddingY,
      marginY: currentMarginY
    });

    const finalRatio = Math.round((sh / ch) * 100);
    let status = 'perfect';
    if (sh > ch) status = 'overflow';
    else if (sh < ch * 0.8) status = 'empty';

    setPageMetrics({
      scrollHeight: sh,
      clientHeight: ch,
      ratio: finalRatio,
      status
    });
  };

  useEffect(() => {
    const timer = setTimeout(runAutoFit, 100);
    return () => clearTimeout(timer);
  }, [resumeData, selectedTemplate, autoFitEnabled, fullPackEnabled]);

  const handleManualFitChange = (field, value) => {
    setAutoFitEnabled(false);
    const newConfig = { ...fitConfig, [field]: value };
    setFitConfig(newConfig);

    if (containerRef.current) {
      const container = containerRef.current;
      container.style.setProperty('--theme-font-size-base', `${newConfig.fontSize}px`);
      container.style.setProperty('--theme-line-height', newConfig.lineHeight);
      container.style.setProperty('--theme-padding-y', `${newConfig.paddingY}px`);
      container.style.setProperty('--theme-margin-y', `${newConfig.marginY}px`);

      setTimeout(() => {
        if (contentRef.current) {
          const sh = contentRef.current.scrollHeight;
          const ch = container.clientHeight;
          const ratio = Math.round((sh / ch) * 100);
          let status = 'perfect';
          if (sh > ch) status = 'overflow';
          else if (sh < ch * 0.8) status = 'empty';

          setPageMetrics({ scrollHeight: sh, clientHeight: ch, ratio, status });
        }
      }, 50);
    }
  };

  const handlePrint = () => {
    const defaultName = `${resumeData.basicInfo.name || '我的'}_求职简历.pdf`;
    if (window.electronAPI) {
      onNotification({ type: 'info', message: '正在打开系统存盘面板...' });
      window.electronAPI.printToPdf(defaultName);
    } else {
      onNotification({ type: 'success', message: '正在启动打印引擎，请选择另存为 PDF' });
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  const handleExportWord = () => {
    if (!window.electronAPI) {
      onNotification({
        type: 'warning',
        message: 'Word 导出功能需要在桌面端中使用'
      });
      return;
    }

    let docxTemplateName = "极简单页01.docx";
    if (selectedTemplate === 'classic') docxTemplateName = "稳重单页01.docx";
    else if (selectedTemplate === 'modern') docxTemplateName = "简约单页02.docx";
    else if (selectedTemplate === 'vibrant') docxTemplateName = "活泼单页01.docx";
    else if (selectedTemplate === 'elegant') docxTemplateName = "文艺单页03.docx";

    onNotification({ type: 'info', message: `正在调用模板: ${docxTemplateName}...` });
    window.electronAPI.exportToWord(docxTemplateName, resumeData);
  };

  return (
    <div className="preview-panel">
      <div
        className="print-hide"
        style={{
          width: '100%',
          maxWidth: '850px',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-glass)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '8px 14px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
              transition: 'transform 0.1s'
            }}
          >
            <Printer size={14} /> 导出 PDF
          </button>

          <button
            onClick={handleExportWord}
            style={{
              padding: '8px 14px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(59,130,246,0.25)',
              transition: 'transform 0.1s'
            }}
          >
            <FileText size={14} /> 套模板导出 Word
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>缩放:</span>
            <input
              type="range"
              min="0.5"
              max="1.2"
              step="0.05"
              value={canvasScale}
              onChange={(e) => setCanvasScale(parseFloat(e.target.value))}
              style={{ width: '80px', height: '4px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '35px' }}>{Math.round(canvasScale * 100)}%</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={autoFitEnabled}
              onChange={(e) => {
                setAutoFitEnabled(e.target.checked);
                if (e.target.checked) {
                  onNotification({ type: 'info', message: '已开启智能单页自适应' });
                }
              }}
              style={{ cursor: 'pointer' }}
            />
            单页约束
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={fullPackEnabled}
              disabled={!autoFitEnabled}
              onChange={(e) => setFullPackEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            饱满填充
          </label>

          <button
            onClick={() => setShowManualControls(!showManualControls)}
            style={{
              padding: '6px 10px',
              background: showManualControls ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: '1px solid var(--border-glass)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sliders size={13} /> {showManualControls ? '收起' : '微调'}
          </button>
        </div>
      </div>

      {showManualControls && (
        <div
          className="print-hide"
          style={{
            width: '100%',
            maxWidth: '794px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            backdropFilter: 'blur(10px)',
            borderRadius: '8px',
            padding: '12px 18px',
            marginTop: '10px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            zIndex: 99
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>字号: {fitConfig.fontSize}px</span>
            <input
              type="range" min="11" max="16" step="0.1"
              value={fitConfig.fontSize}
              onChange={(e) => handleManualFitChange('fontSize', parseFloat(e.target.value))}
              style={{ height: '3px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>行高: {fitConfig.lineHeight}</span>
            <input
              type="range" min="1.2" max="1.8" step="0.02"
              value={fitConfig.lineHeight}
              onChange={(e) => handleManualFitChange('lineHeight', parseFloat(e.target.value))}
              style={{ height: '3px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>内距: {fitConfig.paddingY}px</span>
            <input
              type="range" min="5" max="18" step="1"
              value={fitConfig.paddingY}
              onChange={(e) => handleManualFitChange('paddingY', parseInt(e.target.value))}
              style={{ height: '3px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>间距: {fitConfig.marginY}px</span>
            <input
              type="range" min="4" max="16" step="1"
              value={fitConfig.marginY}
              onChange={(e) => handleManualFitChange('marginY', parseInt(e.target.value))}
              style={{ height: '3px', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      <div
        className="print-hide"
        style={{
          width: '100%',
          maxWidth: '794px',
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px',
          fontWeight: 600,
          background: pageMetrics.status === 'perfect'
            ? 'rgba(16, 185, 129, 0.12)'
            : pageMetrics.status === 'overflow'
            ? 'rgba(239, 68, 68, 0.12)'
            : 'rgba(245, 158, 11, 0.12)',
          border: pageMetrics.status === 'perfect'
            ? '1px solid rgba(16, 185, 129, 0.25)'
            : pageMetrics.status === 'overflow'
            ? '1px solid rgba(239, 68, 68, 0.25)'
            : '1px solid rgba(245, 158, 11, 0.25)',
          color: pageMetrics.status === 'perfect'
            ? 'var(--color-success)'
            : pageMetrics.status === 'overflow'
            ? 'var(--color-danger)'
            : 'var(--color-warning)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {pageMetrics.status === 'perfect' ? (
            <>
              <CheckCircle size={14} />
              <span>排版完美</span>
            </>
          ) : pageMetrics.status === 'overflow' ? (
            <>
              <AlertTriangle size={14} className="animate-pulse" />
              <span>内容超出单页，正在收缩...</span>
            </>
          ) : (
            <>
              <FileText size={14} />
              <span>内容略少，建议补充经历或开启饱满填充</span>
            </>
          )}
        </div>
        <div>
          占比: <strong style={{ fontSize: '13px' }}>{pageMetrics.ratio}%</strong>
        </div>
      </div>

      <div
        ref={containerRef}
        className="a4-container"
        style={{
          transform: `scale(${canvasScale})`
        }}
      >
        <div ref={contentRef} className="a4-content">
          {renderTemplateContent()}
        </div>
      </div>
    </div>
  );
}
