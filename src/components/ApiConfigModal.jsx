import React, { useState, useEffect } from 'react';
import { Settings, X, Check, AlertCircle, ExternalLink } from 'lucide-react';

export default function ApiConfigModal({ onClose, onNotification }) {
  const [config, setConfig] = useState({
    provider: 'custom',
    apiUrl: '',
    apiKey: '',
    modelName: 'deepseek-chat'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getApiConfig().then(setConfig);
    }
  }, []);

  const PROVIDERS = [
    { key: 'custom', label: '自定义 API', url: '', model: 'deepseek-chat' },
    { key: 'deepseek', label: 'DeepSeek 官方', url: 'https://api.deepseek.com', model: 'deepseek-chat' },
    { key: 'openai', label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  ];

  const selectProvider = (key) => {
    const p = PROVIDERS.find(x => x.key === key);
    if (p) {
      setConfig(prev => ({
        ...prev,
        provider: key,
        apiUrl: p.url || prev.apiUrl,
        modelName: p.model || prev.modelName
      }));
    }
  };

  const handleSave = async () => {
    if (!config.apiUrl || !config.apiKey) {
      onNotification({ type: 'warning', message: '请填写 API 地址和 Key' });
      return;
    }
    setSaving(true);
    try {
      await window.electronAPI.saveApiConfig(config);
      onNotification({ type: 'success', message: 'API 配置已保存' });
      onClose();
    } catch {
      onNotification({ type: 'warning', message: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--border-glass)', borderRadius: '6px',
    color: '#fff', fontSize: '12.5px', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '20px', paddingBottom: '12px',
          borderBottom: '1px solid var(--border-glass)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: '#f3f4f6' }}>
            <Settings size={16} style={{ color: 'var(--color-accent)' }} /> AI 接口配置
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px'
          }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {PROVIDERS.map(p => (
            <button key={p.key} onClick={() => selectProvider(p.key)} style={{
              padding: '6px 12px', borderRadius: '6px', border: '1px solid',
              borderColor: config.provider === p.key ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
              background: config.provider === p.key ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
              color: config.provider === p.key ? '#fff' : '#9ca3af',
              cursor: 'pointer', fontSize: '12px', fontWeight: 600
            }}>{p.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>API 地址</label>
            <input type="text" value={config.apiUrl}
              onChange={e => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
              placeholder="https://api.deepseek.com 或 http://127.0.0.1:3000/v1"
              style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>API Key</label>
            <input type="password" value={config.apiKey}
              onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="sk-..."
              style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>模型名称</label>
            <input type="text" value={config.modelName}
              onChange={e => setConfig(prev => ({ ...prev, modelName: e.target.value }))}
              placeholder="deepseek-chat"
              style={inputStyle} />
          </div>
        </div>

        <div style={{
          marginTop: '16px', padding: '10px 12px', borderRadius: '6px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
          display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '11px', color: '#fbbf24'
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>配置后可大幅提升简历解析精度。支持 OpenAI 兼容接口，也支持本地部署的推理服务（如 DeepSeek Web2API）。Key 仅保存在本地。</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
            color: '#9ca3af', cursor: 'pointer', fontSize: '12px'
          }}>取消</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 16px',
            background: saving ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            border: 'none', borderRadius: '6px', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Check size={14} /> {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}
