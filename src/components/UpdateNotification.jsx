import React, { useState, useEffect } from 'react';

export default function UpdateNotification() {
  const [updateState, setUpdateState] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateState('available');
    });

    window.electronAPI.onUpdateNotAvailable(() => {
    });

    window.electronAPI.onUpdateError((msg) => {
      setUpdateState('error');
    });

    window.electronAPI.onDownloadProgress((percent) => {
      setUpdateState('downloading');
      setProgress(percent);
    });

    window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateState('downloaded');
    });
  }, []);

  const handleCheckUpdate = () => {
    if (window.electronAPI) {
      window.electronAPI.checkForUpdates();
      setUpdateState('checking');
    }
  };

  const handleRestart = () => {
    if (window.electronAPI) {
      window.electronAPI.restartAndUpdate();
    }
  };

  if (!window.electronAPI) return null;

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
      {updateState === 'checking' && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(59, 130, 246, 0.2)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          color: '#f3f4f6',
          fontSize: '13px',
          backdropFilter: 'blur(10px)'
        }}>
          正在检查更新...
        </div>
      )}

      {updateState === 'available' && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(245, 158, 11, 0.2)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '8px',
          color: '#f3f4f6',
          fontSize: '13px',
          backdropFilter: 'blur(10px)'
        }}>
          发现新版本，正在下载...
        </div>
      )}

      {updateState === 'downloading' && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(59, 130, 246, 0.2)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          color: '#f3f4f6',
          fontSize: '13px',
          backdropFilter: 'blur(10px)',
          minWidth: '180px'
        }}>
          <div>下载更新中... {Math.round(progress)}%</div>
          <div style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            marginTop: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: '#3b82f6',
              borderRadius: '2px',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {updateState === 'downloaded' && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          color: '#f3f4f6',
          fontSize: '13px',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>新版本已下载</span>
          <button onClick={handleRestart} style={{
            padding: '4px 10px',
            background: '#10b981',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            立即重启
          </button>
        </div>
      )}

      {!updateState && (
        <button onClick={handleCheckUpdate} style={{
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px',
          color: '#9ca3af',
          fontSize: '12px',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)'
        }}>
          检查更新
        </button>
      )}
    </div>
  );
}
