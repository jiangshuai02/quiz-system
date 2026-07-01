# 自动推送脚本 - 智能刷题系统
# 使用方法：右键点击此文件 → 选择"使用 PowerShell 运行"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  智能刷题系统 - GitHub自动推送工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在正确目录
$currentPath = Get-Location
if (-not (Test-Path "app.py")) {
    Write-Host "❌ 错误：请在 quiz_system 目录运行此脚本" -ForegroundColor Red
    Write-Host "当前目录：$currentPath" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}

Write-Host "✅ 当前目录正确：$currentPath" -ForegroundColor Green
Write-Host ""

# 检查Git是否已安装
Write-Host "📦 检查Git安装状态..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    Write-Host "✅ Git已安装：$gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git未安装，请先安装Git：" -ForegroundColor Red
    Write-Host "   https://git-scm.com/download/win" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}
Write-Host ""

# 检查GitHub CLI是否已安装
Write-Host "📦 检查GitHub CLI安装状态..." -ForegroundColor Yellow
$ghPath = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghPath) {
    Write-Host "⚠️  GitHub CLI未安装，正在自动安装..." -ForegroundColor Yellow
    Write-Host ""
    
    # 下载GitHub CLI
    $ghUrl = "https://github.com/cli/cli/releases/download/v2.40.1/gh_2.40.1_windows_amd64.zip"
    $zipFile = "$env:TEMP\gh.zip"
    $extractPath = "$env:TEMP\gh"
    
    Write-Host "   正在下载GitHub CLI..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $ghUrl -OutFile $zipFile -ErrorAction Stop
        Write-Host "   ✅ 下载完成" -ForegroundColor Green
        
        # 解压
        Write-Host "   正在解压..." -ForegroundColor Cyan
        Expand-Archive -Path $zipFile -DestinationPath $extractPath -Force
        
        # 添加到PATH
        $ghExePath = Get-ChildItem -Path $extractPath -Filter "gh.exe" -Recurse | Select-Object -First 1
        if ($ghExePath) {
            $env:PATH += ";$($ghExePath.DirectoryName)"
            [Environment]::SetEnvironmentVariable("PATH", $env:PATH, [EnvironmentVariableTarget]::User)
            Write-Host "   ✅ GitHub CLI安装完成" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ 自动安装失败，请手动安装：" -ForegroundColor Red
        Write-Host "      https://cli.github.com/" -ForegroundColor Yellow
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host ""
} else {
    Write-Host "✅ GitHub CLI已安装" -ForegroundColor Green
}
Write-Host ""

# 检查是否已登录GitHub
Write-Host "🔐 检查GitHub登录状态..." -ForegroundColor Yellow
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  未登录GitHub，正在进行登录..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   即将打开浏览器，请完成以下操作：" -ForegroundColor Cyan
    Write-Host "   1. 登录你的GitHub账号（2992393861@qq.com）" -ForegroundColor White
    Write-Host "   2. 授权应用" -ForegroundColor White
    Write-Host "   3. 授权完成后，返回此窗口" -ForegroundColor White
    Write-Host ""
    Read-Host "按回车键继续..."
    
    # 启动登录流程
    gh auth login --web --git-protocol https --hostname github.com
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 登录失败，请重试" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host "✅ GitHub登录成功！" -ForegroundColor Green
} else {
    Write-Host "✅ 已登录GitHub" -ForegroundColor Green
}
Write-Host ""

# 获取GitHub用户名
Write-Host "📝 获取GitHub用户信息..." -ForegroundColor Yellow
$githubUser = gh api user --jq '.login' 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 无法获取用户信息" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}
Write-Host "✅ GitHub用户名：$githubUser" -ForegroundColor Green
Write-Host ""

# 检查远程仓库是否已配置
$remoteUrl = git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔗 配置远程仓库..." -ForegroundColor Yellow
    $repoUrl = "https://github.com/$githubUser/quiz-system.git"
    git remote add origin $repoUrl
    Write-Host "   ✅ 远程仓库已配置：$repoUrl" -ForegroundColor Green
} else {
    Write-Host "✅ 远程仓库已配置：$remoteUrl" -ForegroundColor Green
}
Write-Host ""

# 检查GitHub上是否已存在仓库
Write-Host "🔍 检查GitHub仓库状态..." -ForegroundColor Yellow
$repoExists = gh repo view "$githubUser/quiz-system" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  仓库不存在，正在创建..." -ForegroundColor Yellow
    gh repo create quiz-system --public --push --source=. --remote=origin
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ 创建仓库失败" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host "   ✅ 仓库创建成功！" -ForegroundColor Green
} else {
    Write-Host "   ✅ 仓库已存在" -ForegroundColor Green
    Write-Host "   📤 正在推送代码..." -ForegroundColor Yellow
    git push -u origin master 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ 推送失败" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host "   ✅ 代码推送成功！" -ForegroundColor Green
}
Write-Host ""

# 显示完成信息
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ 完成！代码已成功推送到GitHub" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📦 仓库地址：" -ForegroundColor Cyan
Write-Host "   https://github.com/$githubUser/quiz-system" -ForegroundColor Blue
Write-Host ""
Write-Host "🚀 下一步：部署到免费云平台" -ForegroundColor Cyan
Write-Host "   1. 访问 https://render.com" -ForegroundColor White
Write-Host "   2. 用GitHub账号登录" -ForegroundColor White
Write-Host "   3. 点击 'New +' → 'Web Service'" -ForegroundColor White
Write-Host "   4. 选择 'quiz-system' 仓库" -ForegroundColor White
Write-Host "   5. 按照 '免费部署指南.md' 操作" -ForegroundColor White
Write-Host ""
Write-Host "📖 详细部署指南：" -ForegroundColor Cyan
Write-Host "   查看 '免费部署指南.md' 文件" -ForegroundColor Blue
Write-Host ""

Read-Host "按回车键退出"
