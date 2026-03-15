@echo off
REM HTTPS Setup Script for Windows (Batch version)
REM Run this as Administrator

echo ========================================
echo   HTTPS Setup for Vite + React App
echo ========================================
echo.

REM Check for mkcert
where mkcert >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] mkcert not found!
    echo.
    echo Please install mkcert first:
    echo   Option 1: choco install mkcert -y
    echo   Option 2: winget install FiloSottile.mkcert
    echo.
    pause
    exit /b 1
)

echo [OK] mkcert is installed
mkcert -version
echo.

REM Install local CA
echo Installing local Certificate Authority...
mkcert -install
echo.

REM Create certs directory
if not exist "certs" (
    echo Creating certs directory...
    mkdir certs
    echo [OK] Created certs/ directory
) else (
    echo [OK] certs/ directory already exists
)
echo.

REM Generate certificates
echo Generating SSL certificates...
mkcert -key-file certs/key.pem -cert-file certs/cert.pem 10.208.179.58 localhost 127.0.0.1
echo.

REM Verify files
if exist "certs\cert.pem" (
    if exist "certs\key.pem" (
        echo [OK] Certificates generated successfully!
        echo.
        dir certs\*.pem
    ) else (
        echo [ERROR] key.pem not found
        exit /b 1
    )
) else (
    echo [ERROR] cert.pem not found
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Configure Firebase: Add '10.208.179.58' to Authorized Domains
echo      https://console.firebase.google.com/project/qr-menu-19cd1/authentication/settings
echo.
echo   2. Configure Clerk: Add 'https://10.208.179.58:5174' to Allowed Origins
echo      https://dashboard.clerk.com/
echo.
echo   3. Start your dev server:
echo      npm run dev
echo.
echo   4. Access your app:
echo      https://10.208.179.58:5174/QRMENU/admin
echo.
echo For detailed instructions, see: COMPLETE_HTTPS_FIX.md
echo.
pause
