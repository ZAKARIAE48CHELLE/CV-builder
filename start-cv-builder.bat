@echo off
title CV Builder Launcher
cd /d "d:\PROJECTS\CV-builder"

echo ===================================================
echo             Launching CV Builder...
echo ===================================================
echo.
echo Starting development server on http://localhost:3000
echo Your default web browser will open shortly...
echo.

:: Launch browser in background after 3 seconds
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000'"

:: Start the Next.js app via pnpm
call pnpm dev

