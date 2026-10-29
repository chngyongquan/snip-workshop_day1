@echo off
setlocal
node "%~dp0cli.js" %*
exit /b %errorlevel%