# Start MaterialMover Services
Write-Host "Starting MaterialMover services..." -ForegroundColor Green

# Stop any existing Node.js and Python processes
Get-Process | Where-Object {$_.Name -like "*node*" -or $_.Name -like "*python*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Start Node.js backend
Write-Host "Starting backend on port 3000..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "api/index.js" -WorkingDirectory "$PSScriptRoot\services\backend" -WindowStyle Minimized

# Start Python search service  
Write-Host "Starting search on port 8000..." -ForegroundColor Cyan
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
Start-Process -FilePath "python" -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory "$PSScriptRoot\services\search" -WindowStyle Minimized

Write-Host ""
Write-Host "Services started!" -ForegroundColor Green
Write-Host "- Backend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "- Search:  http://localhost:8000 (wait ~60s for model to load)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Use Task Manager to find and stop the processes when done."
