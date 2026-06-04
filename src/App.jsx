import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Bell, Settings } from 'lucide-react';
import EditorPanel from './components/EditorPanel';
import PreviewPanel from './components/PreviewPanel';
import TemplatePanel from './components/TemplatePanel';
import UpdateNotification from './components/UpdateNotification';
import ApiConfigModal from './components/ApiConfigModal';
import { DEFAULT_RESUME_DATA } from './utils/aiParser';

export default function App() {
  const [resumeData, setResumeData] = useState(DEFAULT_RESUME_DATA);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateList, setTemplateList] = useState([]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [templateEngineType, setTemplateEngineType] = useState('yaml');
  const previewTimerRef = React.useRef(null);

  const loadTemplates = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.getTemplateList().then(list => {
        setTemplateList(list);
        if (list.length > 0 && !selectedTemplate) {
          setSelectedTemplate(list[0]);
        }
      });
    }
  }, [selectedTemplate]);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate && window.electronAPI) {
      window.electronAPI.checkTemplateConfig(selectedTemplate.path).then(res => {
        setTemplateEngineType(res.engineType || 'yaml');
      });
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedTemplate || !window.electronAPI) {
      setPreviewLoading(false);
      return;
    }
    if (templateEngineType === 'spatial') {
      // 绝对定位精雕预览由前端 InteractiveCanvas 像素级呈现，无需 Mammoth 转换预览
      setPreviewLoading(false);
      return;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    previewTimerRef.current = setTimeout(() => {
      setPreviewLoading(true);
      const dataForIpc = JSON.parse(JSON.stringify(resumeData));
      window.electronAPI.renderPreview(selectedTemplate.name, dataForIpc)
        .then(result => {
          if (result.success) {
            setPreviewHtml(result.html);
          } else {
            console.error('Preview error:', result.error);
            showNotification({ type: 'warning', message: `预览渲染失败: ${result.error}` });
          }
          setPreviewLoading(false);
        })
        .catch(err => {
          console.error('Preview IPC error:', err);
          showNotification({ type: 'warning', message: `预览 IPC 错误: ${err.message}` });
          setPreviewLoading(false);
        });
    }, 800);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [resumeData, selectedTemplate, templateEngineType]);

  const showNotification = useCallback(({ type, message }) => {
    setNotification({ type, message });
    if (type === 'success' && message.includes('成功')) {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    }
    setTimeout(() => setNotification(null), 4500);
  }, []);

  return (
    <div className="workspace-container">
      {notification && (
        <div className="print-hide" style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '12px 24px', borderRadius: '10px',
          backdropFilter: 'blur(20px)',
          background: notification.type === 'success' ? 'rgba(16,185,129,0.25)' :
            notification.type === 'warning' ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.25)',
          border: `1px solid ${notification.type === 'success' ? 'rgba(16,185,129,0.4)' :
            notification.type === 'warning' ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.4)'}`,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          gap: '10px', color: '#fff', fontSize: '13.5px', fontWeight: 600,
          animation: 'slideDown 0.3s cubic-bezier(0.16,1,0.3,1) forwards'
        }}>
          <Bell size={16} /><span>{notification.message}</span>
        </div>
      )}

      <EditorPanel
        resumeData={resumeData}
        setResumeData={setResumeData}
        onNotification={showNotification}
        onOpenApiConfig={() => setShowApiConfig(true)}
        engineType={templateEngineType}
      />

      <PreviewPanel
        previewHtml={previewHtml}
        previewLoading={previewLoading}
        onNotification={showNotification}
        selectedTemplate={selectedTemplate}
        resumeData={resumeData}
        setResumeData={setResumeData}
        engineType={templateEngineType}
      />

      <TemplatePanel
        templateList={templateList}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        onReloadTemplates={loadTemplates}
      />

      <UpdateNotification />

      {showApiConfig && (
        <ApiConfigModal onClose={() => setShowApiConfig(false)} onNotification={showNotification} />
      )}

      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -30px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
