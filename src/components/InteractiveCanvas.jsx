import React, { useState, useEffect, useRef } from 'react';
import { AlignLeft, LayoutGrid, RotateCcw, Sparkles, Loader } from 'lucide-react';
import { polishText } from '../utils/aiParser';

export default function InteractiveCanvas({
  templatePath,
  resumeData,
  setResumeData,
  onNotification,
  canvasScale,
  layoutAdjustments,
  setLayoutAdjustments,
  
  // Advanced styling variables
  isDesensitized,
  themeColor,
  fontSizeOffset,
  spacingOffset
}) {
  const [rawElements, setRawElements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [activeId, setActiveId] = useState(null);
  
  // Dragging & Resizing States
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);

  // AI Polish floating menu state
  const [polishState, setPolishState] = useState(null); // { id, x, y, text }
  const [polishing, setPolishing] = useState(false);

  const canvasRef = useRef(null);

  // Load layout from XML template via Electron IPC
  useEffect(() => {
    if (!templatePath || !window.electronAPI) return;
    
    setLoading(true);
    window.electronAPI.parseTemplateLayout(templatePath)
      .then(res => {
        if (res && res.elements) {
          setRawElements(res.elements);
        } else if (res && res.error) {
          console.error("Layout parse error:", res.error);
          onNotification({ type: 'warning', message: `解析模板坐标失败: ${res.error}` });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Layout parse IPC error:", err);
        onNotification({ type: 'warning', message: `解析模板 IPC 错误: ${err.message}` });
        setLoading(false);
      });
  }, [templatePath]);

  // Deep get value from resumeData path
  const getDeepValue = (obj, path) => {
    if (!path) return undefined;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  };

  // Deep set value for resumeData two-way sync
  const setDeepValue = (obj, path, value) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];
      const isNextNumber = !isNaN(Number(nextKey));
      
      if (current[key] === undefined) {
        current[key] = isNextNumber ? [] : {};
      }
      current = current[key];
    }
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  };

  // Format education / experience entries inline for visual demonstration
  const formatInlineSectionValue = (secType) => {
    const items = resumeData[secType] || [];
    if (items.length === 0) return '';
    return items.slice(0, 2).map(item => {
      if (secType === 'education') {
        return `${item.school || ''} | ${item.major || ''} (${item.degree || ''})  ${item.date || ''}`;
      } else if (secType === 'experience') {
        return `${item.company || ''} | ${item.role || ''}  ${item.date || ''}`;
      } else if (secType === 'projects') {
        return `${item.name || ''} | ${item.role || ''}  ${item.date || ''}`;
      }
      return '';
    }).join('\n');
  };

  // Get raw value without desensitization for editing
  const getRawText = (el) => {
    if (!el.role) return el.text;
    if (el.role.startsWith('header.')) return el.text;
    
    if (el.role === 'skills') {
      const skills = resumeData.skills || [];
      return skills.join('；') || el.text;
    }
    
    if (el.role === 'honors') {
      const honors = resumeData.honors || [];
      return honors.map(h => h.startsWith('•') || h.startsWith('-') ? h : `• ${h}`).join('\n') || el.text;
    }

    if (el.role.endsWith('.inline')) {
      const secType = el.role.split('.')[0];
      const inlineVal = formatInlineSectionValue(secType);
      if (inlineVal) {
        const separator = el.text.includes('\n') ? '\n' : ' ';
        const prefix = el.text.split(/[\n\s]/)[0] || '';
        return `${prefix}${separator}${inlineVal}`;
      }
      return el.text;
    }

    if (el.role.endsWith('.unused')) {
      return '';
    }

    const val = getDeepValue(resumeData, el.role);
    return val !== undefined && val !== null ? String(val) : el.text;
  };

  // Visual text formatting with privacy mask masking if enabled
  const getFilledText = (el) => {
    const rawVal = getRawText(el);
    if (!isDesensitized || !el.role) return rawVal;

    if (el.role === 'basicInfo.name') {
      return rawVal.length > 1 ? `${rawVal[0]}${'*'.repeat(rawVal.length - 1)}` : '求职者';
    }
    if (el.role === 'basicInfo.phone') {
      return rawVal.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    if (el.role === 'basicInfo.email') {
      return rawVal.replace(/(.{2}).*(@.*)/, '$1***$2');
    }
    if (el.role === 'basicInfo.wechat') {
      return '***';
    }
    
    return rawVal;
  };

  // Synchronize changes back to resumeData
  const syncTextToData = (role, newText) => {
    if (!role || role.startsWith('header.') || role.endsWith('.unused')) return;

    const updatedData = JSON.parse(JSON.stringify(resumeData));

    if (role === 'skills') {
      const array = newText.split(/[；;]/).map(s => s.trim()).filter(Boolean);
      updatedData.skills = array;
    } else if (role === 'honors') {
      const array = newText.split('\n').map(s => s.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean);
      updatedData.honors = array;
    } else if (role.endsWith('.inline')) {
      return;
    } else {
      setDeepValue(updatedData, role, newText);
    }
    
    setResumeData(updatedData);
  };

  // ↕️ Section Vertical Gap Shift Algorithm
  // Gathers all unique structural list entries, sorts them by average Y coordinate, and assigns accumulated delta Y.
  const entryAvgY = {};
  const entryCounts = {};
  
  rawElements.forEach(el => {
    const adj = layoutAdjustments[el.id] || {};
    const currentY = adj.y !== undefined ? adj.y : el.y;
    
    if (el.role && el.role.includes('.') && !el.role.startsWith('basicInfo') && !el.role.startsWith('header.')) {
      const parts = el.role.split('.');
      const entryId = `${parts[0]}.${parts[1]}`; // e.g. "education.0"
      entryAvgY[entryId] = (entryAvgY[entryId] || 0) + currentY;
      entryCounts[entryId] = (entryCounts[entryId] || 0) + 1;
    }
  });

  const sortedEntryIds = Object.keys(entryAvgY).sort((a, b) => {
    const avgA = entryAvgY[a] / entryCounts[a];
    const avgB = entryAvgY[b] / entryCounts[b];
    return avgA - avgB;
  });

  // Assemble elements with global style customizations (offsets applied)
  const elements = rawElements.map(el => {
    const adj = layoutAdjustments[el.id] || {};
    
    // Spacing offsets
    let dy = 0;
    if (el.role && el.role.includes('.') && !el.role.startsWith('basicInfo') && !el.role.startsWith('header.')) {
      const parts = el.role.split('.');
      const entryId = `${parts[0]}.${parts[1]}`;
      const k = sortedEntryIds.indexOf(entryId);
      if (k >= 0) {
        dy = k * spacingOffset;
      }
    }

    const baseObj = {
      ...el,
      x: adj.x !== undefined ? adj.x : el.x,
      y: (adj.y !== undefined ? adj.y : el.y) + dy,
      w: adj.w !== undefined ? adj.w : el.w,
      h: adj.h !== undefined ? adj.h : el.h,
    };

    // Color customization
    let finalColor = el.color;
    const isGreyOrBlack = /#(000000|333333|111111|222222|4b5563|6b7280|9ca3af|374151|1f2937|111|555|444|222)/i.test(el.color);
    if (!isGreyOrBlack && themeColor && el.color !== 'transparent') {
      finalColor = themeColor;
    }

    // Font size adjustments
    const finalFontSize = Math.max(5, el.fontSize + fontSizeOffset);

    return {
      ...baseObj,
      color: finalColor,
      fontSize: finalFontSize,
      filledText: getFilledText(baseObj),
      rawText: getRawText(baseObj)
    };
  });

  // Sync adjustments back when changes occur
  const updateLayoutAdjustment = (elId, fieldData) => {
    setLayoutAdjustments(prev => {
      const current = prev[elId] || {};
      const el = rawElements.find(e => e.id === elId);
      
      // Calculate delta offsets without the cumulative layout styling modifiers,
      // so we keep the true relative coordinate updates saved.
      let spacingDelta = 0;
      if (el && el.role && el.role.includes('.') && !el.role.startsWith('basicInfo') && !el.role.startsWith('header.')) {
        const parts = el.role.split('.');
        const entryId = `${parts[0]}.${parts[1]}`;
        const k = sortedEntryIds.indexOf(entryId);
        if (k >= 0) {
          spacingDelta = k * spacingOffset;
        }
      }

      const nextState = {
        ...prev,
        [elId]: {
          ...current,
          ...fieldData,
          fontSize: fieldData.fontSize !== undefined ? fieldData.fontSize : (current.fontSize !== undefined ? current.fontSize : el.fontSize),
          color: fieldData.color !== undefined ? fieldData.color : (current.color !== undefined ? current.color : el.color)
        }
      };

      if (fieldData.y !== undefined) {
        nextState[elId].y = Math.max(0, fieldData.y - spacingDelta);
      }
      return nextState;
    });
  };

  // Push the global styling variables (custom themeColor and fontSizeOffset) to adjustments on change
  useEffect(() => {
    if (rawElements.length === 0) return;
    
    // We update the layoutAdjustments map to include global styles
    const updated = { ...layoutAdjustments };
    rawElements.forEach(el => {
      let finalColor = el.color;
      const isGreyOrBlack = /#(000000|333333|111111|222222|4b5563|6b7280|9ca3af|374151|1f2937|111|555|444|222)/i.test(el.color);
      if (!isGreyOrBlack && themeColor && el.color !== 'transparent') {
        finalColor = themeColor;
      }
      
      const finalFontSize = Math.max(5, el.fontSize + fontSizeOffset);
      
      const prevAdj = updated[el.id] || {};
      updated[el.id] = {
        ...prevAdj,
        fontSize: finalFontSize,
        color: finalColor
      };
    });
    
    setLayoutAdjustments(updated);
  }, [themeColor, fontSizeOffset, rawElements]);

  // Handle Drag Start
  const handleDragStart = (e, el) => {
    if (e.target.closest('[contenteditable="true"]') || e.target.closest('.resize-handle')) {
      return; 
    }
    e.preventDefault();
    setActiveId(el.id);
    setPolishState(null); // Close polish bubble

    const clientX = e.clientX;
    const clientY = e.clientY;
    setDragState({
      id: el.id,
      startX: clientX,
      startY: clientY,
      origX: el.x,
      origY: el.y
    });
  };

  // Handle Resize Start
  const handleResizeStart = (e, el) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveId(el.id);
    setPolishState(null);

    setResizeState({
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origW: el.w,
      origH: el.h
    });
  };

  // Handle Mouse Move for Window
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragState) {
        const deltaX = (e.clientX - dragState.startX) / canvasScale;
        const deltaY = (e.clientY - dragState.startY) / canvasScale;
        
        let newX = dragState.origX + deltaX;
        let newY = dragState.origY + deltaY;

        if (snapToGrid) {
          newX = Math.round(newX / 5) * 5;
          newY = Math.round(newY / 5) * 5;
        }

        updateLayoutAdjustment(dragState.id, {
          x: Math.max(0, Math.min(595 - 40, newX)),
          y: Math.max(0, Math.min(842 - 20, newY))
        });
      }

      if (resizeState) {
        const deltaW = (e.clientX - resizeState.startX) / canvasScale;
        const deltaH = (e.clientY - resizeState.startY) / canvasScale;

        let newW = resizeState.origW + deltaW;
        let newH = resizeState.origH + deltaH;

        if (snapToGrid) {
          newW = Math.round(newW / 5) * 5;
          newH = Math.round(newH / 5) * 5;
        }

        updateLayoutAdjustment(resizeState.id, {
          w: Math.max(20, Math.min(595, newW)),
          h: Math.max(10, Math.min(842, newH))
        });
      }
    };

    const handleMouseUp = () => {
      if (dragState) setDragState(null);
      if (resizeState) setResizeState(null);
    };

    if (dragState || resizeState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState, canvasScale, snapToGrid, spacingOffset, sortedEntryIds]);

  // Handle Double Click to open AI Polish float or focus editable
  const handleElementDoubleClick = (e, el) => {
    setActiveId(el.id);
    if (!el.role || el.role.startsWith('header.') || el.role.endsWith('.unused')) return;

    setPolishState({
      id: el.id,
      x: el.x + el.w / 2,
      y: el.y - 50,
      text: el.rawText
    });
  };

  // AI Content Polish Invocation with mode types
  const handleAIPolish = async (mode) => {
    if (!polishState || polishing || !window.electronAPI) return;
    
    setPolishing(true);
    try {
      const config = await window.electronAPI.getApiConfig();
      if (!config.apiUrl || !config.apiKey) {
        onNotification({ type: 'warning', message: '⚠️ 请先配置 AI 大模型 API！点击左上角设置。' });
        setPolishing(false);
        return;
      }
      
      onNotification({ type: 'info', message: `✨ AI 正在处理 (${mode === 'star' ? 'STAR改写' : mode === 'shorten' ? '精简篇幅' : '专业润色'})...` });
      const polishedResult = await polishText(polishState.text, config, mode);
      
      // Update DOM contentEditable and sync back
      const elDom = document.querySelector(`[data-xpath="${CSS.escape(polishState.id)}"]`);
      if (elDom) {
        elDom.innerText = polishedResult;
      }
      
      const targetElement = elements.find(el => el.id === polishState.id);
      if (targetElement) {
        syncTextToData(targetElement.role, polishedResult);
      }
      
      onNotification({ type: 'success', message: '✨ AI 内容重塑完成！' });
      setPolishState(null);
    } catch (e) {
      console.error("AI Polish error:", e);
      onNotification({ type: 'warning', message: `润色失败: ${e.message}` });
    } finally {
      setPolishing(false);
    }
  };

  const handleContentBlur = (e, el) => {
    const newText = e.target.innerText.trim();
    syncTextToData(el.role, newText);
    
    setTimeout(() => {
      setPolishState(prev => prev && prev.id === el.id ? prev : null);
    }, 250);
  };

  // AI Alignment Heuristics
  const handleAIAlign = () => {
    if (elements.length === 0) return;
    
    let newElements = [...elements];
    const threshold = 10; 
    
    // 1. Align X axis
    for (let i = 0; i < newElements.length; i++) {
      for (let j = i + 1; j < newElements.length; j++) {
        if (Math.abs(newElements[i].x - newElements[j].x) < threshold) {
          const targetX = Math.min(newElements[i].x, newElements[j].x);
          newElements[i].x = targetX;
          newElements[j].x = targetX;
        }
      }
    }

    // 2. Align Y axis (same row items)
    for (let i = 0; i < newElements.length; i++) {
      for (let j = i + 1; j < newElements.length; j++) {
        if (Math.abs(newElements[i].y - newElements[j].y) < threshold) {
          const targetY = Math.min(newElements[i].y, newElements[j].y);
          newElements[i].y = targetY;
          newElements[j].y = targetY;
        }
      }
    }
    
    // 3. Align Width W
    for (let i = 0; i < newElements.length; i++) {
      for (let j = i + 1; j < newElements.length; j++) {
        if (newElements[i].x === newElements[j].x && Math.abs(newElements[i].w - newElements[j].w) < threshold) {
          const targetW = Math.max(newElements[i].w, newElements[j].w);
          newElements[i].w = targetW;
          newElements[j].w = targetW;
        }
      }
    }

    const newAdjustments = { ...layoutAdjustments };
    newElements.forEach(el => {
      // Calculate delta offsets without the cumulative layout styling modifiers,
      let spacingDelta = 0;
      if (el.role && el.role.includes('.') && !el.role.startsWith('basicInfo') && !el.role.startsWith('header.')) {
        const parts = el.role.split('.');
        const entryId = `${parts[0]}.${parts[1]}`;
        const k = sortedEntryIds.indexOf(entryId);
        if (k >= 0) {
          spacingDelta = k * spacingOffset;
        }
      }

      newAdjustments[el.id] = {
        x: el.x,
        y: Math.max(0, el.y - spacingDelta),
        w: el.w,
        h: el.h,
        fontSize: el.fontSize,
        color: el.color
      };
    });
    setLayoutAdjustments(newAdjustments);
    onNotification({ type: 'success', message: '✨ AI 智能排版对齐已完成' });
  };

  const handleResetLayout = () => {
    setLayoutAdjustments({});
    onNotification({ type: 'info', message: '已重置为模板默认位置与颜色' });
  };

  return (
    <div className="interactive-canvas-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* Top Controls Toolbar */}
      <div className="print-hide canvas-toolbar" style={{
        display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', userSelect: 'none' }}
             onClick={() => setSnapToGrid(!snapToGrid)}>
          <input type="checkbox" checked={snapToGrid} onChange={() => {}} style={{ cursor: 'pointer' }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)' }}>
            <LayoutGrid size={14} /> 吸附网格 (5px)
          </span>
        </div>

        <button onClick={handleAIAlign} style={{
          padding: '5px 12px', background: 'rgba(16,185,129,0.15)', color: '#34d399',
          border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', cursor: 'pointer',
          fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          <Sparkles size={12} /> AI 智能对齐
        </button>

        <button onClick={handleResetLayout} style={{
          padding: '5px 12px', background: 'rgba(239,68,68,0.1)', color: '#f87171',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', cursor: 'pointer',
          fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          <RotateCcw size={12} /> 重置布局
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '10px', color: '#10b981', background: 'rgba(16,185,129,0.15)',
            padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)',
            fontWeight: 700
          }}>
            ✨ 精雕排版模板已启用
          </span>
        </div>
      </div>

      {/* Main A4 Canvas Page */}
      <div className="canvas-wrapper" style={{ position: 'relative', width: '595px', height: '842px', margin: '0 auto' }}>
        
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(255,255,255,0.95)', zIndex: 1000,
            borderRadius: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563' }}>
              <Loader size={24} className="animate-spin" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>解析精雕排版物理定位中...</span>
            </div>
          </div>
        )}

        <div
          ref={canvasRef}
          className="a4-sheet"
          style={{
            position: 'absolute', width: '595px', height: '842px',
            background: '#ffffff', boxShadow: '0 8px 45px rgba(0,0,0,0.35)',
            borderRadius: '4px', overflow: 'hidden', userSelect: 'none'
          }}
          onClick={(e) => {
            if (e.target === canvasRef.current) {
              setActiveId(null);
              setPolishState(null);
            }
          }}
        >
          {/* Elements render */}
          {elements.map((el) => {
            const isSelected = activeId === el.id;
            const isHeader = el.role && el.role.startsWith('header.');
            const isUnused = el.role && el.role.endsWith('.unused');
            const isEditable = el.role && !isHeader && !isUnused;
            
            // Mask blur styling under desensitized mode
            const isSensitive = isDesensitized && el.role && 
              /basicInfo\.(name|phone|email|wechat)/.test(el.role);

            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleDragStart(e, el)}
                onDoubleClick={(e) => handleElementDoubleClick(e, el)}
                className={`textbox-item ${isSensitive ? 'sensitive-masked' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.w}px`,
                  height: `${el.h}px`,
                  fontSize: `${el.fontSize}pt`,
                  color: el.color,
                  fontWeight: el.bold ? 'bold' : 'normal',
                  textAlign: el.align === 'justify' ? 'justify' : el.align,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  padding: '4px',
                  border: isSelected 
                    ? '1.5px solid #3b82f6' 
                    : isEditable 
                      ? '1px dashed rgba(59,130,246,0.18)' 
                      : '1px dashed transparent',
                  cursor: dragState && dragState.id === el.id ? 'grabbing' : 'grab',
                  transition: 'border 0.2s ease, filter 0.25s ease',
                  filter: isSensitive ? 'blur(5.2px)' : 'none',
                  zIndex: isSelected ? 100 : 10,
                  boxSizing: 'border-box'
                }}
              >
                {/* ContentEditable Text block */}
                <div
                  data-xpath={el.id}
                  contentEditable={isEditable}
                  suppressContentEditableWarning
                  onBlur={(e) => handleContentBlur(e, el)}
                  style={{
                    width: '100%',
                    height: '100%',
                    outline: 'none',
                    fontFamily: '"SimSun", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
                    lineHeight: '1.25'
                  }}
                >
                  {el.filledText}
                </div>

                {/* Resize anchors */}
                {isSelected && isEditable && (
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart(e, el)}
                    style={{
                      position: 'absolute',
                      right: '-3px',
                      bottom: '-3px',
                      width: '8px',
                      height: '8px',
                      background: '#3b82f6',
                      border: '1.5px solid #fff',
                      borderRadius: '50%',
                      cursor: 'se-resize',
                      zIndex: 200
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* AI Polish floating popup menu */}
          {polishState && (
            <div style={{
              position: 'absolute',
              left: `${Math.max(10, Math.min(585 - 280, polishState.x - 140))}px`,
              top: `${Math.max(10, polishState.y)}px`,
              zIndex: 9999,
              background: 'rgba(23, 23, 23, 0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
              gap: '8px',
              animation: 'slideUpShort 0.2s cubic-bezier(0.16,1,0.3,1) forwards'
            }}>
              <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>AI 智能改写:</span>
              <button
                onClick={() => handleAIPolish('professional')}
                disabled={polishing}
                style={{
                  background: 'none', border: 'none', color: '#60a5fa', fontSize: '10.5px',
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '2px', padding: '3px 6px', borderRadius: '4px'
                }}
                className="hover-action-btn"
              >
                专业
              </button>
              <button
                onClick={() => handleAIPolish('star')}
                disabled={polishing}
                style={{
                  background: 'none', border: 'none', color: '#34d399', fontSize: '10.5px',
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '2px', padding: '3px 6px', borderRadius: '4px'
                }}
                className="hover-action-btn"
              >
                <Sparkles size={11} className={polishing ? "animate-spin" : ""} /> STAR
              </button>
              <button
                onClick={() => handleAIPolish('shorten')}
                disabled={polishing}
                style={{
                  background: 'none', border: 'none', color: '#fbbf24', fontSize: '10.5px',
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '2px', padding: '3px 6px', borderRadius: '4px'
                }}
                className="hover-action-btn"
              >
                精简
              </button>
              <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.15)' }} />
              <button
                onClick={() => setPolishState(null)}
                style={{
                  background: 'none', border: 'none', color: '#9ca3af', fontSize: '10px',
                  cursor: 'pointer', padding: '3px 6px'
                }}
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .canvas-toolbar button {
          transition: all 0.2s ease;
        }
        .canvas-toolbar button:hover {
          filter: brightness(1.15);
        }
        .canvas-toolbar button:active {
          transform: scale(0.97);
        }
        .hover-action-btn:hover {
          background: rgba(255,255,255,0.06) !important;
        }
        .sensitive-masked:hover {
          filter: none !important;
        }
        @keyframes slideUpShort {
          from { transform: translateY(4px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
