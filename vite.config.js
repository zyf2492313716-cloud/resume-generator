import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 遵循 UTF-8 与简体中文支持
export default defineConfig({
  plugins: [react()],
  base: './', // 🌟 核心破局点：强制将静态资源打包为“相对路径”，完美适配 Electron 离线 file:// 协议，根治白屏与黑屏！
  server: {
    port: 3000,
    open: true
  }
});
