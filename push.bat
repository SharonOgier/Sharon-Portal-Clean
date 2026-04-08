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
  echo ERROR: Not a Git repo
  pause
  exit /b 1
)

echo Checking remote...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin https://github.com/SharonOgier/Sharon-Portal-Clean.git
)

echo.
echo Switching to master...
git branch -M master

echo.
echo Pulling latest from GitHub...
git pull origin master --rebase
if errorlevel 1 (
  echo.
  echo ERROR during pull.
  echo You likely have a merge conflict.
  echo Run: git status
  pause
  exit /b 1
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
echo Committing...
git commit -m "update"
<<<<<<< HEAD

echo.
echo Pushing...
git push -u origin master

echo.
echo Done.
=======
git pull origin master --rebase
git push origin master
>>>>>>> 9e6d6efacaa1c837b3163321d8b7c31c0693b533
pause