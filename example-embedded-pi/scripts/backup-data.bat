@echo off
REM Windows 数据备份脚本

set BACKUP_DIR=backups
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_NAME=pi-agent-backup-%TIMESTAMP%.tar.gz

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo 正在检查 Docker...
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo 使用 Docker 备份...
    docker volume ls | findstr pi-agent-data >nul
    if %errorlevel% equ 0 (
        docker run --rm -v pi-agent-data:/data -v "%cd%\%BACKUP_DIR%":/backup alpine tar czf "/backup/%BACKUP_NAME%" /data
        echo 备份完成: %BACKUP_DIR%\%BACKUP_NAME%
    ) else (
        echo 未找到 Docker volume
    )
)

if exist "workspace" (
    echo 备份本地 workspace 目录...
    tar czf "%BACKUP_DIR%\%BACKUP_NAME%" workspace/ 2>nul || powershell Compress-Archive -Path workspace -DestinationPath "%BACKUP_DIR%\%BACKUP_NAME%" -Force
    echo 备份完成: %BACKUP_DIR%\%BACKUP_NAME%
)

pause
