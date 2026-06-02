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

  // 状态定义：自动与手动排版参数
  const [autoFitEnabled, setAutoFitEnabled] = useState(true);
  const [fullPackEnabled, setFullPackEnabled] = useState(true);
  
  // 画布缩放比例 (为了适配屏幕高度)
  const [canvasScale, setCanvasScale] = useState(0.8);

  // 实时高度统计
  const [pageMetrics, setPageMetrics] = useState({
    scrollHeight: 0,
    clientHeight: 1123,
    ratio: 100,
    status: 'perfect' // 'perfect' | 'overflow' | 'empty'
  });

  // 微调系数状态 (用于手动滑块控制以及自动计算回存)
  const [fitConfig, setFitConfig] = useState({
    fontSize: 14,       // 基础字号 (px)，正常范围 12 - 16
    lineHeight: 1.6,    // 行高，正常范围 1.3 - 1.8
    paddingY: 12,       // 模块上下内边距 (px)，正常范围 6 - 18
    marginY: 10         // 经历块上下外边距 (px)，正常范围 4 - 16
  });

  // 控制面板是否展开
  const [showManualControls, setShowManualControls] = useState(false);

  // 根据模板映射渲染
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

  // ==========================================================================
  // 核心：智能一页纸约束自适应算法 (DOM 监听与阶梯微调)
  // ==========================================================================
  useEffect(() => {
    // 设置全局主题色 CSS 变量
    if (containerRef.current) {
      containerRef.current.style.setProperty('--theme-primary', themeColor);
    }
  }, [themeColor]);

  // 注册对 Electron IPC 桌面打印与Word导出通知的挂载监听
  useEffect(() => {
    if (window.electronAPI) {
      // PDF 导出成功通知
      window.electronAPI.onPdfSaved((msg) => {
        onNotification({ type: 'success', message: msg });
      });
      window.electronAPI.onPdfFailed((err) => {
        if (err !== '导出已取消') {
          onNotification({ type: 'warning', message: err });
        }
      });
      
      // Word 导出成功与失败通知
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

    // 如果未开启自动，只做静态高度测量
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

    // 默认初始值 (开始自适应迭代)
    let currentFontSize = 14;
    let currentLineHeight = 1.6;
    let currentPaddingY = 12;
    let currentMarginY = 10;

    const ch = container.clientHeight; // A4 锁死高度 1123px
    let sh = content.scrollHeight;

    const maxIterations = 35;
    let i = 0;

    // 辅助函数：同步更新真实 DOM 节点的 CSS 变量
    const applyStylesToDom = (fs, lh, py, my) => {
      container.style.setProperty('--theme-font-size-base', `${fs}px`);
      container.style.setProperty('--theme-line-height', lh);
      container.style.setProperty('--theme-padding-y', `${py}px`);
      container.style.setProperty('--theme-margin-y', `${my}px`);
    };

    // 1. 回收溢出 (从大到小阶梯收缩)
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
        break; // 达到求职简历极端可读性字号底线，停止收缩
      }

      applyStylesToDom(currentFontSize, currentLineHeight, currentPaddingY, currentMarginY);
      sh = content.scrollHeight;
      i++;
    }

    // 2. 扩充饱满 (从小到大阶梯延展)
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

    // 回存到控制面板状态中，使滑块同步
    setFitConfig({
      fontSize: parseFloat(currentFontSize.toFixed(1)),
      lineHeight: parseFloat(currentLineHeight.toFixed(2)),
      paddingY: currentPaddingY,
      marginY: currentMarginY
    });

    // 计算最终占比指标
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

  // 依赖简历数据与模板触发自适应
  useEffect(() => {
    const timer = setTimeout(runAutoFit, 100);
    return () => clearTimeout(timer);
  }, [resumeData, selectedTemplate, autoFitEnabled, fullPackEnabled]);

  // 手动修改配置滑块时的同步处理
  const handleManualFitChange = (field, value) => {
    setAutoFitEnabled(false); // 触发手动时，自动解除自动绑定
    const newConfig = { ...fitConfig, [field]: value };
    setFitConfig(newConfig);

    if (containerRef.current) {
      const container = containerRef.current;
      container.style.setProperty('--theme-font-size-base', `${newConfig.fontSize}px`);
      container.style.setProperty('--theme-line-height', newConfig.lineHeight);
      container.style.setProperty('--theme-padding-y', `${newConfig.paddingY}px`);
      container.style.setProperty('--theme-margin-y', `${newConfig.marginY}px`);

      // 重新统计比例
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

  // 一键打印 / 另存为 PDF
  const handlePrint = () => {
    const defaultName = `${resumeData.basicInfo.name || '我的'}_求职简历.pdf`;
    if (window.electronAPI) {
      // 桌面客户端：一键无感原生存盘，傻瓜式体验
      onNotification({ type: 'info', message: '正在唤起 Mac 系统存盘面板...' });
      window.electronAPI.printToPdf(defaultName);
    } else {
      // 网页端：降级使用传统 window.print() 打印
      onNotification({ type: 'success', message: '正在启动 Mac 打印引擎，请在系统弹窗中选择“另存为 PDF”以导出 100% 单页简历！' });
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  // 🌟 一键套用并导出可二次修改的原生 Word 文档 (.docx)
  const handleExportWord = () => {
    if (!window.electronAPI) {
      onNotification({ 
        type: 'warning', 
        message: '【Word 万能模板套用】与【经历智能克隆】需要运行在「macOS 原生桌面端」中！网页端受浏览器沙箱安全策略限制，无法直接调起本地 Python 引擎读写磁盘中的 docx 模板。建议您双击打开桌面 App 进行一键导出！' 
      });
      return;
    }
    
    // 将当前的风格 ID 智能映射为您下载文件夹“1 单页简历”中的爆款 Docx 模板文件名
    let docxTemplateName = "极简单页01.docx";
    if (selectedTemplate === 'classic') docxTemplateName = "稳重单页01.docx";
    else if (selectedTemplate === 'modern') docxTemplateName = "简约单页02.docx";
    else if (selectedTemplate === 'vibrant') docxTemplateName = "活泼单页01.docx";
    else if (selectedTemplate === 'elegant') docxTemplateName = "文艺单页03.docx";
    
    onNotification({ type: 'info', message: `已锁定本地模板：${docxTemplateName}，正在为您启动 Python 经历克隆引擎...` });
    window.electronAPI.exportToWord(docxTemplateName, resumeData);
  };

  return (
    <div className="preview-panel">
      {/* 顶部工具控制条 (Print-Hide) */}
      <div 
        className="print-hide" 
        style={{
          width: '100%',
          maxWidth: '850px', // 宽度加宽一点以优雅容纳多出来的按钮
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
        {/* 左侧：打印与缩放 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 1. PDF 导出按钮 */}
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

          {/* 2. Word 智能套用并导出按钮 */}
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
            <FileText size={14} /> 智能套模板导出 Word
          </button>

          {/* 缩放比例滑动器 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>预览缩放:</span>
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

        {/* 右侧：单页自适应配置 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={autoFitEnabled} 
              onChange={(e) => {
                setAutoFitEnabled(e.target.checked);
                if (e.target.checked) {
                  onNotification({ type: 'info', message: '已开启“智能一页纸自适应”约束系统' });
                }
              }}
              style={{ cursor: 'pointer' }}
            />
            智能单页约束
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={fullPackEnabled} 
              disabled={!autoFitEnabled}
              onChange={(e) => setFullPackEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            一键饱满充盈
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
            <Sliders size={13} /> {showManualControls ? '收起微调' : '手动微调'}
          </button>
        </div>
      </div>

      {/* 手动微调浮动控制台 (Print-Hide) */}
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
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>正文字号: {fitConfig.fontSize}px</span>
            <input 
              type="range" min="11" max="16" step="0.1" 
              value={fitConfig.fontSize} 
              onChange={(e) => handleManualFitChange('fontSize', parseFloat(e.target.value))}
              style={{ height: '3px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>段落行高: {fitConfig.lineHeight}倍</span>
            <input 
              type="range" min="1.2" max="1.8" step="0.02" 
              value={fitConfig.lineHeight} 
              onChange={(e) => handleManualFitChange('lineHeight', parseFloat(e.target.value))}
              style={{ height: '3px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>段上下内距: {fitConfig.paddingY}px</span>
            <input 
              type="range" min="5" max="18" step="1" 
              value={fitConfig.paddingY} 
              onChange={(e) => handleManualFitChange('paddingY', parseInt(e.target.value))}
              style={{ height: '3px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>经历上下距: {fitConfig.marginY}px</span>
            <input 
              type="range" min="4" max="16" step="1" 
              value={fitConfig.marginY} 
              onChange={(e) => handleManualFitChange('marginY', parseInt(e.target.value))}
              style={{ height: '3px', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      {/* 简历状态流光提示条 (Print-Hide) */}
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
              <span>一页纸比例完美（排版匀称，饱满大方）</span>
            </>
          ) : pageMetrics.status === 'overflow' ? (
            <>
              <AlertTriangle size={14} className="animate-pulse" />
              <span>经历内容已超出单页（正在为您进行一页纸瘦身...）</span>
            </>
          ) : (
            <>
              <FileText size={14} />
              <span>简历文字略偏少（开启“一键饱满”拉伸，或补充经历描述）</span>
            </>
          )}
        </div>
        <div>
          内容占比: <strong style={{ fontSize: '13px' }}>{pageMetrics.ratio}%</strong>
        </div>
      </div>

      {/* 简历 1:1 A4 画布 */}
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
