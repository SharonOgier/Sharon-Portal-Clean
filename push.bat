@echo off
cd /d "%~dp0"
git add .
git commit -m "update" 2>nul
git pull origin master --rebase
git push origin master
pause