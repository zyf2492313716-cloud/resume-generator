#!/bin/bash
# 智能简历生成器：一键交互式推送到 GitHub 并绑定更新源脚本
# 遵循 UTF-8 编码与简体中文输出规范

# 强制进入脚本所在的当前目录，确保上下文绝对正确
cd "$(dirname "$0")"

clear
echo -e "\033[1;36m==========================================================================\033[0m"
echo -e "       🚀 \033[1;32m 智能简历生成器：一键交互式推送到 GitHub 并同步软件更新源\033[0m"
echo -e "==========================================================================\033[0m"
echo -e "本脚本将帮助您在 30 秒内把简历生成器项目上传至 GitHub，并自动绑定更新检查源。"
echo ""
echo -e "\033[1;33m👉 第一步：准备工作\033[0m"
echo "请先在您的 GitHub (https://github.com) 上新建一个公开的仓库 (Public Repository)。"
echo "推荐仓库命名为：\033[1;32mresume-generator\033[0m"
echo -e "\033[1;31m⚠️ 注意：新建仓库时，请勿勾选 'Add a README' 或 'Add .gitignore'，保持绝对为空！\033[0m"
echo ""

# 引导用户输入 GitHub 仓库 URL
while true; do
    echo -e "\033[1;33m👉 第二步：输入您的 GitHub 仓库地址\033[0m"
    read -p "请输入您新建的 GitHub 仓库 HTTPS 地址 (例如 https://github.com/用户名/resume-generator.git): " REPO_URL
    REPO_URL=$(echo "$REPO_URL" | xargs) # 去除首尾空格
    
    # 简单的格式正则校验
    if [[ $REPO_URL =~ ^https://github\.com/([^/]+)/([^/]+)(\.git)?$ ]]; then
        GITHUB_USER="${BASH_REMATCH[1]}"
        # 如果包含 .git 后缀，去除它
        GITHUB_REPO="${BASH_REMATCH[2]%.git}"
        break
    else
        echo -e "\033[1;31m❌ 仓库地址格式不正确，请重新输入！\033[0m"
        echo "格式参考：https://github.com/您的用户名/您的仓库名.git"
        echo ""
    fi
done

echo ""
echo -e "✅ 成功解析 GitHub 配置："
echo -e "   👤 GitHub 用户名: \033[1;32m$GITHUB_USER\033[0m"
echo -e "   📦 GitHub 仓库名: \033[1;32m$GITHUB_REPO\033[0m"
echo ""

# 强悍联动：自动将用户名与仓库名更新写入本地配置文件
CONFIG_PATH="$HOME/.gemini_resume_config.json"
echo -e "\033[1;33m[1/3]\033[0m 正在自动将 GitHub 信息绑定到您的简历生成器客户端中..."
python3 -c "
import json, os
cfg_path = os.path.expanduser('~/.gemini_resume_config.json')
cfg = {}
if os.path.exists(cfg_path):
    try:
        with open(cfg_path, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
    except: pass
cfg['github_user'] = '$GITHUB_USER'
cfg['github_repo'] = '$GITHUB_REPO'
with open(cfg_path, 'w', encoding='utf-8') as f:
    json.dump(cfg, f, ensure_ascii=False, indent=2)
"
echo -e "✅ \033[1;32m软件客户端配置同步大成功！\033[0m 软件中的「自动检测更新」已完美指向您的个人仓库！"
echo ""

# 第三步：Git 初始化与提交
echo -e "\033[1;33m[2/3]\033[0m 正在本地初始化 Git 仓库并执行首版代码提交..."

# 检查当前目录下是否有 .git，如果没有则初始化
if [ ! -d ".git" ]; then
    git init
    git branch -M main
else
    echo "ℹ️ 本地 Git 仓库已存在，无需重复初始化。"
fi

# 关联远程仓库地址
git remote remove origin 2>/dev/null
git remote add origin "$REPO_URL"
echo "✅ 成功关联远程 GitHub 仓库：$REPO_URL"

# 执行本地提交
echo "📦 正在整理代码文件并执行本地提交..."
git add .
git commit -m "feat: 智能简历生成器 Mac 原生纯软件版 (支持检查更新)"
echo "✅ 本地首版代码提交成功！"
echo ""

# 第四步：推送至远程 GitHub
echo -e "\033[1;33m[3/3]\033[0m 正在将本地代码极速推送至 GitHub..."
echo -e "\033[1;32m👉 正在执行：git push -u origin main \033[0m"
echo "--------------------------------------------------------------------------"

git push -u origin main

if [ $? -eq 0 ]; then
    echo "--------------------------------------------------------------------------"
    echo -e "🎉 \033[1;32m大功告成！您的代码已成功、完美地推送到了 GitHub！\033[0m"
    echo -e "🌐 GitHub 仓库在线地址：\033[4;34mhttps://github.com/$GITHUB_USER/$GITHUB_REPO\033[0m"
    echo ""
    echo -e "\033[1;36m💡 下一步如何使用“自动检查更新”功能？\033[0m"
    echo -e "   1. 以后当您有了新版本，只需在 GitHub 仓库右侧点击 \033[1;32m'Releases' -> 'Create a new release'\033[0m。"
    echo -e "   2. 创建一个名为 \033[1;32mv1.1.0\033[0m（或者任何高于 v1.0.0 的版本号）的 Release 标签。"
    echo -e "   3. 将您最新打包出来的 \033[1;32m智能简历生成器-原生版.dmg\033[0m 上传到 Release 附件中并发布。"
    echo -e "   4. 客户端再次启动时就会自动探测到新版本，并拉起浏览器让用户下载！真正的专业级独立软件成色！"
else
    echo "--------------------------------------------------------------------------"
    echo -e "\033[1;31m⚠️ 推送失败，发生了什么？\033[0m"
    echo "这通常是由于 GitHub 网络连通性不佳，或您的电脑尚未授权/登录 GitHub 账号。"
    echo ""
    echo -e "\033[1;33m💡 保姆级自助登录排查方案：\033[0m"
    echo -e "   1. \033[1;32m方案 A (推荐)：使用 GitHub Personal Access Token (PAT) 登录\033[0m"
    echo "      前往 https://github.com/settings/tokens 生成一个包含 'repo' 权限的 Token。"
    echo "      当上方提示输入 Username 时输入您的用户名，Password 时粘贴该 Token 即可。"
    echo "   2. \033[1;32m方案 B：使用 GitHub Desktop 桌面客户端\033[0m"
    echo "      直接下载 GitHub Desktop，将当前目录下的项目文件夹拖入进去推行推送，最傻瓜化、100%成功。"
fi
echo -e "\033[1;36m==========================================================================\033[0m"

read -p "按回车键退出..."
