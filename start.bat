@echo off
echo ================================================
echo   goto-app — Local URL Shortener
echo ================================================
echo.
echo Starting server on port 80...
echo This requires Administrator privileges.
echo.
echo Management UI: http://goto/
echo.
node "%~dp0server.js"
echo.
echo Server stopped.
pause
