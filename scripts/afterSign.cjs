#!/usr/bin/env node
/**
 * Electron Builder 后置签名脚本
 * 对 app bundle 进行 ad-hoc 签名并移除隔离属性，避免 "已损坏" 报错
 */

const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  const { appOutDir, packager } = context;
  const appName = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`[afterSign] 正在处理: ${appPath}`);

  try {
    // 1. 深度 ad-hoc 签名整个 app bundle
    console.log('[afterSign] 执行 ad-hoc 签名...');
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });

    // 2. 移除隔离属性
    console.log('[afterSign] 移除隔离属性...');
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });

    console.log('[afterSign] 处理完成');
  } catch (err) {
    console.error('[afterSign] 错误:', err.message);
    // 不阻断构建流程
  }
};
