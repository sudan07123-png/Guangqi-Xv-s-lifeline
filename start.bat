@echo off
chcp 65001 >nul
echo.
echo   🎋 光启时光
echo   ==================
echo.
echo   正在启动本地服务器...
echo   打开浏览器访问: http://localhost:8080
echo   按 Ctrl+C 停止服务器
echo.

:: 尝试 Python
python -m http.server 8080 2>nul
if %errorlevel% neq 0 (
    :: 尝试 npx
    echo Python 不可用，尝试 npx serve...
    npx serve . -l 8080
)

pause
