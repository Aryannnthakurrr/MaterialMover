@echo off
echo Stopping MaterialMover services...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
echo Services stopped!
pause
