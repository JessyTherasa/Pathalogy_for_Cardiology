@echo off
title CardioEvidence - Multidisciplinary Clinical Evidence Timeline
echo ========================================================
echo   CardioEvidence - Starting Server
echo   Synthetic Data Demonstration Prototype
echo ========================================================
echo.
set "PATH=C:\Users\jessy\AppData\Local\Programs\Python\Python313\Scripts;C:\Users\jessy\AppData\Local\Programs\nodejs;%PATH%"
cd /d "d:\c28__project"

echo Opening browser to http://127.0.0.1:8000 ...
start "" "http://127.0.0.1:8000"

echo Starting FastAPI server on port 8000...
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pause
