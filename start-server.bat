@echo off
chcp 65001 > nul
echo ===================================================
echo [KidsPick] 풀스택 보안 백엔드 + 프론트엔드 서버 실행
echo ===================================================
echo.
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [오류] 빌드에 실패했습니다.
    pause
    exit /b %errorlevel%
)
echo.
echo [성공] 서버를 포트 3001에서 실행합니다...
start http://localhost:3001
node --experimental-strip-types server.js
pause
