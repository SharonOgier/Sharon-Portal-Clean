@echo off
cd /d "%~dp0"

if exist .git\index.lock del /f /q .git\index.lock

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo This folder is not a Git repository.
  pause
  exit /b 1
)

git add .

git diff --cached --quiet
if not errorlevel 1 (
  echo No changes to commit.
  pause
  exit /b 0
)

git commit -m "update"

git branch -M main

git push -u origin main

pause