@echo off
cd /d "%~dp0"

echo =========================
echo Sharon Portal Git Push
echo =========================
echo.

if exist .git\index.lock (
  echo Removing locked Git index...
  del /f /q .git\index.lock
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: This folder is not a Git repository.
  echo Make sure push.bat is inside your Sharon-Portal-Clean project folder.
  pause
  exit /b 1
)

echo Checking remote...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo Setting origin remote...
  git remote add origin https://github.com/SharonOgier/Sharon-Portal-Clean.git
) else (
  echo Origin remote already exists.
)

echo.
echo Adding files...
git add .

git diff --cached --quiet
if %errorlevel%==0 (
  echo No changes to commit.
  pause
  exit /b 0
)

echo.
echo Committing changes...
git commit -m "update"
if errorlevel 1 (
  echo Commit failed.
  pause
  exit /b 1
)

echo.
echo Switching branch to master...
git branch -M master

echo.
echo Pushing to GitHub...
git push -u origin master
if errorlevel 1 (
  echo Push failed.
  echo Run these manually and check the message:
  echo git status
  echo git remote -v
  echo git branch
  pause
  exit /b 1
)

echo.
echo Push complete.
pause