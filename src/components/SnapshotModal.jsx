import React, { useState, useEffect } from 'react';
import { Camera, Calendar, Trash2, CheckCircle2, X, Download } from 'lucide-react';

export default function SnapshotModal({
  onClose,
  templateName,
  resumeData,
  layoutAdjustments,
  onApplySnapshot,
  onNotification
}) {
  const [snapshots, setSnapshots] = useState([]);
  const [newSnapshotName, setNewSnapshotName] = useState('');

  const storageKey = `resume_snapshots_${templateName || 'global'}`;

  // Load snapshots from localStorage
  useEffect(() => {
    try {
      const data = localStorage.getItem(storageKey);
      if (data) {
        setSnapshots(JSON.parse(data));
      }
    } catch (e) {
      console.error("Failed to load snapshots:", e);
    }
  }, [storageKey]);

  // Save current state as a new snapshot
  const handleSaveSnapshot = () => {
    const name = newSnapshotName.trim();
    if (!name) {
      onNotification({ type: 'warning', message: '请输入版本快照名称' });
      return;
    }

    const newSnapshot = {
      id: `snap_${Date.now()}`,
      name,
      timestamp: new Date().toLocaleString(),
      resumeData: JSON.parse(JSON.stringify(resumeData)),
      layoutAdjustments: JSON.parse(JSON.stringify(layoutAdjustments))
    };

    const updated = [newSnapshot, ...snapshots];
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSnapshots(updated);
    setNewSnapshotName('');
    onNotification({ type: 'success', message: `📷 快照 "${name}" 已成功保存` });
  };

  // Apply selected snapshot
  const handleApplySnapshot = (snap) => {
    onApplySnapshot(snap.resumeData, snap.layoutAdjustments);
    onNotification({ type: 'success', message: `✅ 已成功恢复至版本: ${snap.name}` });
    onClose();
  };

  // Delete a snapshot
  const handleDeleteSnapshot = (id, name) => {
    const updated = snapshots.filter(s => s.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSnapshots(updated);
    onNotification({ type: 'info', message: `🗑️ 已删除快照: ${name}` });
  };

  // Export all snapshots as a JSON file
  const handleExportSnapshots = () => {
    if (snapshots.length === 0) return;
    try {
      const blob = new Blob([JSON.stringify(snapshots, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_snapshots_${templateName?.replace('.docx', '')}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotification({ type: 'success', message: '已成功导出快照备份文件' });
    } catch (e) {
      onNotification({ type: 'warning', message: `备份导出失败: ${e.message}` });
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        width: '520px', maxWidth: '90%', maxHeight: '85vh',
        background: 'rgba(23, 23, 23, 0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        color: '#f3f4f6', overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
            <Camera size={18} /> 简历版本快照与回滚
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
            padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center'
          }} className="hover-close">
            <X size={18} />
          </button>
        </div>

        {/* Save Current State Form */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
            将当前页面上的简历文字内容与排版坐标微调，存为一个全局版本快照。
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="例如：投递字节前端实习版 / 经历微调版"
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              style={{
                flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                color: '#fff', fontSize: '13px', outline: 'none'
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshot()}
            />
            <button onClick={handleSaveSnapshot} style={{
              padding: '8px 16px', background: '#10b981', color: '#fff',
              border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              保存快照
            </button>
          </div>
        </div>

        {/* Snapshot List */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px', display: 'flex',
          flexDirection: 'column', gap: '12px', minHeight: '150px'
        }}>
          {snapshots.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', color: '#6b7280', gap: '10px',
              padding: '40px 0'
            }}>
              <Camera size={28} />
              <div style={{ fontSize: '12px' }}>暂无本地快照版本，赶紧保存一个吧！</div>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div key={snap.id} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px', padding: '12px 14px', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#e5e7eb' }}>
                    {snap.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={10} /> {snap.timestamp}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleApplySnapshot(snap)} style={{
                    padding: '5px 10px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                    border: '1px solid rgba(59,130,246,0.3)', borderRadius: '4px',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '2px'
                  }}>
                    <CheckCircle2 size={12} /> 应用
                  </button>
                  <button onClick={() => handleDeleteSnapshot(snap.id, snap.name)} style={{
                    padding: '5px', background: 'rgba(239,68,68,0.1)', color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {snapshots.length > 0 && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.2)'
          }}>
            <button onClick={handleExportSnapshots} style={{
              padding: '6px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.15)',
              color: '#d1d5db', borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <Download size={12} /> 导出备份 JSON
            </button>
          </div>
        )}

      </div>
      <style>{`
        .hover-close:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #f3f4f6 !important;
        }
      `}</style>
    </div>
  );
}
