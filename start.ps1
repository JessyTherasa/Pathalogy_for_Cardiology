Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  CardioEvidence - Multidisciplinary Evidence Timeline" -ForegroundColor Cyan
Write-Host "  Synthetic Data Demonstration Prototype" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

$env:PATH = "C:\Users\jessy\AppData\Local\Programs\Python\Python313\Scripts;C:\Users\jessy\AppData\Local\Programs\nodejs;" + $env:PATH
Set-Location "d:\c28__project"

Start-Process "http://127.0.0.1:8000"
Write-Host "Server running at http://127.0.0.1:8000 (Press Ctrl+C to stop)..." -ForegroundColor Green
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
