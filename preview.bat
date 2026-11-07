@echo off
chcp 65001 > nul
echo ===================================================
echo [KidsPick] 웹사이트 빌드 및 로컬 미리보기를 시작합니다...
echo ===================================================
echo.
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [오류] 빌드에 실패했습니다.
    pause
    exit /b %errorlevel%
)
echo.
echo [성공] 빌드가 완료되었습니다! 브라우저를 엽니다...
start http://localhost:4173
call npm.cmd run preview -- --port 4173
pause
