@echo off
REM ========================================================
REM Docker 镜像打包脚本（Windows 版本）
REM 使用方法: scripts\package-docker.bat [版本号]
REM ========================================================

set VERSION=%1
if "%VERSION%"=="" set VERSION=v1.0
set IMAGE_NAME=pi-agent
set IMAGE_TAG=%IMAGE_NAME%:%VERSION%
set TAR_FILE=%IMAGE_NAME%-%VERSION%.tar

echo ========================================
echo   Docker 镜像打包
echo ========================================
echo.
echo 版本: %VERSION%
echo 镜像: %IMAGE_TAG%
echo.

REM 检查 Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: Docker 未安装或未启动
    pause
    exit /b 1
)

REM 检查 Dockerfile
if not exist "Dockerfile" (
    echo ❌ 错误: 找不到 Dockerfile，请在项目根目录运行
    pause
    exit /b 1
)

REM 步骤 1: 构建镜像
echo [1/3] 构建 Docker 镜像...
docker build -t %IMAGE_TAG% .
if errorlevel 1 (
    echo ❌ 镜像构建失败
    pause
    exit /b 1
)

REM 步骤 2: 导出镜像
echo.
echo [2/3] 导出镜像...
echo 这可能需要几分钟，请稍候...
docker save -o %TAR_FILE% %IMAGE_TAG%
if errorlevel 1 (
    echo ❌ 镜像导出失败
    pause
    exit /b 1
)

REM 步骤 3: 压缩（可选）
echo.
echo [3/3] 压缩文件...
powershell -Command "Compress-Archive -Path '%TAR_FILE%' -DestinationPath '%TAR_FILE%.zip' -Force"

echo.
echo ========================================
echo ✅ Docker 镜像打包完成
echo ========================================
echo.
echo 文件:
echo   - 未压缩: %TAR_FILE%
echo   - 压缩后: %TAR_FILE%.zip
echo.
echo 在另一台机器上使用:
echo   1. 解压 %TAR_FILE%.zip（如果使用了压缩）
echo   2. 导入镜像: docker load -i %TAR_FILE%
echo   3. 创建数据卷: docker volume create pi-agent-data
echo   4. 运行容器:
echo      docker run -d ^
echo        --name pi-agent ^
echo        -p 7187:7187 ^
echo        -v pi-agent-data:/app/workspace ^
echo        -e ANTHROPIC_API_KEY=你的key ^
echo        --restart unless-stopped ^
echo        %IMAGE_TAG%
echo.
pause
