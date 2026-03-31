@echo off
REM ========================================================
REM 源代码打包脚本（Windows 版本）
REM 使用方法: scripts\package-source.bat [版本号]
REM ========================================================

set VERSION=%1
if "%VERSION%"=="" set VERSION=v1.0
set NAME=example-embedded-pi-source-%VERSION%
set TEMP_DIR=%TEMP%\pi-agent-packaging-%RANDOM%

echo ========================================
echo   源代码打包
echo ========================================
echo.
echo 版本: %VERSION%
echo 包名: %NAME%.zip
echo.

REM 检查是否在项目根目录
if not exist "package.json" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    exit /b 1
)

REM 创建临时目录
echo 创建临时目录...
mkdir "%TEMP_DIR%\%NAME%" 2>nul

REM 复制文件
echo 复制项目文件...

REM 主要目录
xcopy /E /I /Y src "%TEMP_DIR%\%NAME%\src" >nul 2>&1
xcopy /E /I /Y public "%TEMP_DIR%\%NAME%\public" >nul 2>&1
xcopy /E /I /Y scripts "%TEMP_DIR%\%NAME%\scripts" >nul 2>&1

REM 配置文件
copy /Y package.json "%TEMP_DIR%\%NAME\" >nul
if exist "package-lock.json" copy /Y package-lock.json "%TEMP_DIR%\%NAME\" >nul
if exist "tsconfig.json" copy /Y tsconfig.json "%TEMP_DIR%\%NAME\" >nul

REM 文档
if exist "README.md" copy /Y README.md "%TEMP_DIR%\%NAME\" >nul
if exist "DEPLOYMENT_GUIDE.md" copy /Y DEPLOYMENT_GUIDE.md "%TEMP_DIR%\%NAME\" >nul
if exist "QUICK_START_DOCKER.md" copy /Y QUICK_START_DOCKER.md "%TEMP_DIR%\%NAME\" >nul
if exist "DOCKER_README.md" copy /Y DOCKER_README.md "%TEMP_DIR%\%NAME\" >nul
if exist "PACKAGING_GUIDE.md" copy /Y PACKAGING_GUIDE.md "%TEMP_DIR%\%NAME\" >nul

REM Docker 相关
if exist "Dockerfile" copy /Y Dockerfile "%TEMP_DIR%\%NAME\" >nul
if exist "docker-compose.yml" copy /Y docker-compose.yml "%TEMP_DIR%\%NAME\" >nul
if exist ".dockerignore" copy /Y .dockerignore "%TEMP_DIR%\%NAME\" >nul
if exist ".env.example" copy /Y .env.example "%TEMP_DIR%\%NAME\" >nul

REM Git
if exist ".gitignore" copy /Y .gitignore "%TEMP_DIR%\%NAME\" >nul

REM 创建压缩包
echo 创建压缩包...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\%NAME%' -DestinationPath '%NAME%.zip' -Force"

REM 清理临时目录
echo 清理临时文件...
rmdir /S /Q "%TEMP_DIR%" 2>nul

echo.
echo ========================================
echo ✅ 打包完成！
echo ========================================
echo.
echo 文件: %NAME%.zip
echo.
echo 使用方法:
echo   1. 解压 %NAME%.zip
echo   2. 进入目录: cd %NAME%
echo   3. 安装依赖: npm install
echo   4. 配置: 复制 .env.example 为 .env 并编辑
echo   5. 运行: npm start
echo.
pause
