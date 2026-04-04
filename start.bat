@echo off
if "%GOTO_HOST%"=="" set GOTO_HOST=127.0.0.1
if "%GOTO_HTTP_PORT%"=="" set GOTO_HTTP_PORT=8080

echo ================================================
echo   goto-app — Local URL Shortener
echo ================================================
echo.
echo Starting server with current GOTO_* environment settings...
echo Default manual mode: http://127.0.0.1:8080/
echo.
echo Management UI: http://%GOTO_HOST%:%GOTO_HTTP_PORT%/
echo.
node "%~dp0server.js"
echo.
echo Server stopped.
pause
