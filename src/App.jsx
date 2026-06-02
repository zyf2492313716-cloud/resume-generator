import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  FileText, 
  Settings,
  Bell
} from 'lucide-react';
import EditorPanel from './components/EditorPanel';
import PreviewPanel from './components/PreviewPanel';
import TemplatePanel from './components/TemplatePanel';
import { DEFAULT_RESUME_DATA } from './utils/aiParser';

export default function App() {
  // 1. 核心状态：结构化简历数据 (双向绑定，数据源)
  const [resumeData, setResumeData] = useState(DEFAULT_RESUME_DATA);

  // 2. 模板与配色状态
  const [selectedTemplate, setSelectedTemplate] = useState('minimalist');
  const [themeColor, setThemeColor] = useState('#1e3a8a');

  // 3. AI 抽取 API 设置状态
  const [aiConfig, setAiConfig] = useState({
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: '',
    modelName: 'deepseek-chat'
  });

  // 4. 拟真 Toast 通知浮层系统
  const [notification, setNotification] = useState(null);

  const showNotification = ({ type, message }) => {
    // 设置通知并自动在 4 秒后滑出销毁
    setNotification({ type, message });
    
    // 如果是解析成功的喜报，触发 Canvas-Confetti 撒花庆祝动效
    if (type === 'success' && message.includes('成功')) {
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
      });
    }

    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  return (
    <div className="workspace-container">
      {/* 玻璃感 Toast 通知栏 (Print-Hide) */}
      {notification && (
        <div 
          className="print-hide"
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '12px 24px',
            borderRadius: '10px',
            backdropFilter: 'blur(20px)',
            background: notification.type === 'success' 
              ? 'rgba(16, 185, 129, 0.25)' 
              : notification.type === 'warning' 
              ? 'rgba(245, 158, 11, 0.25)' 
              : 'rgba(59, 130, 246, 0.25)',
            border: notification.type === 'success' 
              ? '1px solid rgba(16, 185, 129, 0.4)' 
              : notification.type === 'warning' 
              ? '1px solid rgba(245, 158, 11, 0.4)' 
              : '1px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#fff',
            fontSize: '13.5px',
            fontWeight: 600,
            animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <Bell size={16} className="animate-bounce" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* ==========================================================================
          左侧控制面板：AI 录入与结构化经历编辑 (Print-Hide)
          ========================================================================== */}
      <EditorPanel 
        resumeData={resumeData}
        setResumeData={setResumeData}
        aiConfig={aiConfig}
        setAiConfig={setAiConfig}
        onNotification={showNotification}
      />

      {/* ==========================================================================
          中间预览面板：A4真实悬浮画布，智能单页自适应缩放算法
          ========================================================================== */}
      <PreviewPanel 
        resumeData={resumeData}
        selectedTemplate={selectedTemplate}
        themeColor={themeColor}
        onNotification={showNotification}
      />

      {/* ==========================================================================
          右侧模板面板：模板风格切换与配色板调理 (Print-Hide)
          ========================================================================== */}
      <TemplatePanel 
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        themeColor={themeColor}
        setThemeColor={setThemeColor}
        resumeData={resumeData}
        setResumeData={setResumeData}
        onNotification={showNotification}
      />

      {/* 动画关键帧 CSS 注入 (Print-Hide) */}
      <style>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -30px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(-25%);
            animation-timing-function: cubic-bezier(0.8,0,1,1);
          }
          50% {
            transform: none;
            animation-timing-function: cubic-bezier(0,0,0.2,1);
          }
        }
      `}</style>
    </div>
  );
}
