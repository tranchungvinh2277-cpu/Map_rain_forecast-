@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  OBSERVED RAINFALL DAILY UPDATE
REM
REM  1. Copy QC JSON -> React public/data
REM  2. Check files
REM  3. Git add
REM  4. Git commit
REM  5. Git push
REM  6. Cloudflare Pages auto deploy
REM ============================================================

title Daily Observed Rainfall Update

echo.
echo ============================================================
echo       OBSERVED RAINFALL DAILY UPDATE
echo ============================================================
echo.

REM ============================================================
REM 1. PATH CONFIGURATION
REM ============================================================

REM --- React project ---
set "PROJECT_DIR=E:\H_down\Map\HTML\Rainfall\ban-do-Rain"

REM --- QC output ---
set "QC_LAST24=C:\Users\minh\OneDrive\NAWAPI\HYDROMET_DATA\Scrip\OBS\RainProcessing\QC\output\hourly\last24"
set "QC_LAST72=C:\Users\minh\OneDrive\NAWAPI\HYDROMET_DATA\Scrip\OBS\RainProcessing\QC\output\hourly\last72"

REM --- Source files ---
set "SRC24=%QC_LAST24%\metadata_observed_qc_last24.json"
set "SRC72=%QC_LAST72%\metadata_observed_qc_last72.json"

REM --- React destination ---
set "DATA_DIR=%PROJECT_DIR%\public\data"

set "DST24=%DATA_DIR%\metadata_observed_qc_last24.json"
set "DST72=%DATA_DIR%\metadata_observed_qc_last72.json"

REM ============================================================
REM 2. CHECK PROJECT DIRECTORY
REM ============================================================

echo [1/7] Checking React project...

if not exist "%PROJECT_DIR%" (
    echo.
    echo [ERROR] React project directory not found:
    echo %PROJECT_DIR%
    echo.
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"

echo [OK] Project:
echo %CD%
echo.

REM ============================================================
REM 3. CHECK SOURCE JSON FILES
REM ============================================================

echo [2/7] Checking QC output files...
echo.

if not exist "%SRC24%" (
    echo [ERROR] last24 JSON not found:
    echo %SRC24%
    echo.
    pause
    exit /b 1
)

if not exist "%SRC72%" (
    echo [ERROR] last72 JSON not found:
    echo %SRC72%
    echo.
    pause
    exit /b 1
)

echo [OK] Source last24:
echo      %SRC24%
echo.

echo [OK] Source last72:
echo      %SRC72%
echo.

REM ============================================================
REM 4. CREATE DESTINATION DIRECTORY
REM ============================================================

echo [3/7] Checking public\data directory...
echo.

if not exist "%DATA_DIR%" (
    echo [INFO] Creating:
    echo %DATA_DIR%
    echo.
    mkdir "%DATA_DIR%"
)

echo [OK] Destination:
echo      %DATA_DIR%
echo.

REM ============================================================
REM 5. COPY JSON FILES
REM ============================================================

echo [4/7] Copying observed rainfall JSON...
echo.

copy /Y "%SRC24%" "%DST24%" >nul
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to copy last24 JSON.
    echo.
    pause
    exit /b 1
)

echo [OK] Copied:
echo      metadata_observed_qc_last24.json
echo.

copy /Y "%SRC72%" "%DST72%" >nul

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to copy last72 JSON.
    echo.
    pause
    exit /b 1
)

echo [OK] Copied:
echo      metadata_observed_qc_last72.json
echo.

REM ============================================================
REM 6. SHOW FILE INFORMATION
REM ============================================================

echo ------------------------------------------------------------
echo UPDATED FILE INFORMATION
echo ------------------------------------------------------------
echo.

for %%F in ("%DST24%") do (
    echo last24
    echo   Size : %%~zF bytes
    echo   Date : %%~tF
)

echo.

for %%F in ("%DST72%") do (
    echo last72
    echo   Size : %%~zF bytes
    echo   Date : %%~tF
)

echo.

REM ============================================================
REM 7. CHECK GIT REPOSITORY
REM ============================================================

echo [5/7] Checking Git repository...
echo.

if not exist ".git" (
    echo [ERROR] This directory is not a Git repository.
    echo.
    pause
    exit /b 1
)

echo [OK] Git repository detected.
echo.

echo Current Git status:
echo ------------------------------------------------------------

git status --short

echo.

REM ============================================================
REM 8. STAGE ONLY THE TWO JSON FILES
REM ============================================================

echo [6/7] Staging observed rainfall data...
echo.

git add "public/data/metadata_observed_qc_last24.json"
git add "public/data/metadata_observed_qc_last72.json"

if errorlevel 1 (
    echo.
    echo [ERROR] Git add failed.
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM 9. CHECK WHETHER DATA ACTUALLY CHANGED
REM ============================================================

git diff --cached --quiet

if %errorlevel%==0 (
    echo.
    echo ============================================================
    echo [INFO] No changes detected.
    echo ============================================================
    echo.
    echo The two JSON files are identical to the Git version.
    echo No commit will be created.
    echo No push will be performed.
    echo.
    pause
    exit /b 0
)

REM ============================================================
REM 10. SHOW FILES THAT WILL BE COMMITTED
REM ============================================================

echo.
echo Files staged for commit:
echo ------------------------------------------------------------

git diff --cached --name-status

echo.

REM ============================================================
REM 11. GET DATE
REM ============================================================

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "DATE_NOW=%%i"
REM ============================================================
REM 12. COMMIT
REM ============================================================

echo ------------------------------------------------------------
echo Creating Git commit...
echo ------------------------------------------------------------
echo.

git commit -m "Update observed rainfall data %DATE_NOW%"

if errorlevel 1 (
    echo.
    echo [ERROR] Git commit failed.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Commit created.
echo.

REM ============================================================
REM 13. PUSH TO GITHUB
REM ============================================================

echo [7/7] Pushing to GitHub...
echo.

git push origin main

if errorlevel 1 (
    echo.
    echo ============================================================
    echo [ERROR] Git push failed.
    echo ============================================================
    echo.
    echo The commit exists locally but was NOT pushed to GitHub.
    echo.
    echo You can retry with:
    echo.
    echo     git push origin main
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM 14. SUCCESS
REM ============================================================

echo.
echo ============================================================
echo              UPDATE SUCCESSFUL
echo ============================================================
echo.
echo [OK] QC JSON copied
echo [OK] Git commit created
echo [OK] Pushed to GitHub
echo.
echo Cloudflare Pages should now start deployment automatically.
echo.
echo Website:
echo     map-forecast-gfs.pages.dev
echo.
echo ============================================================
echo.

pause
exit /b 0