import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Bell } from 'lucide-react';
import EditorPanel from './components/EditorPanel';
import PreviewPanel from './components/PreviewPanel';
import TemplatePanel from './components/TemplatePanel';
import UpdateNotification from './components/UpdateNotification';
import { DEFAULT_RESUME_DATA } from './utils/aiParser';

export default function App() {
  const [resumeData, setResumeData] = useState(DEFAULT_RESUME_DATA);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateList, setTemplateList] = useState([]);
  const [previewDocx, setPreviewDocx] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [notification, setNotification] = useState(null);
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
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    previewTimerRef.current = setTimeout(() => {
      if (selectedTemplate && window.electronAPI) {
        setPreviewLoading(true);
        window.electronAPI.renderPreview(selectedTemplate.name, resumeData).then(result => {
          if (result.success) {
            setPreviewDocx(result.docxBase64);
          } else {
            console.error('Preview error:', result.error);
            showNotification({ type: 'warning', message: `预览渲染失败: ${result.error}` });
          }
          setPreviewLoading(false);
        });
      }
    }, 800);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [resumeData, selectedTemplate]);

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
      />

      <PreviewPanel
        previewDocx={previewDocx}
        previewLoading={previewLoading}
        onNotification={showNotification}
        templateName={selectedTemplate?.name}
        resumeData={resumeData}
      />

      <TemplatePanel
        templateList={templateList}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        onReloadTemplates={loadTemplates}
      />

      <UpdateNotification />

      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -30px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
