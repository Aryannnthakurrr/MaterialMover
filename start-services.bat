@echo off
REM Start MaterialMover Services
echo Starting MaterialMover services...

REM Start Node.js backend
echo Starting backend on port 3000...
start "MaterialMover Backend" /D "%~dp0services\backend" cmd /c "node api/index.js"

REM Start Python search service
echo Starting search on port 8000...
start "MaterialMover Search" /D "%~dp0services\search" cmd /c ".venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo.
echo Services started! 
echo - Backend: http://localhost:3000
echo - Search:  http://localhost:8000 (wait ~60s for model to load)
echo.
echo Close the terminal windows to stop the services.
