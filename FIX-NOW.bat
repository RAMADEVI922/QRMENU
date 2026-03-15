@echo off
echo ========================================
echo   QUICK FIX - Generate Certificates
echo ========================================
echo.

REM Check if mkcert is installed
where mkcert >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] mkcert is not installed!
    echo.
    echo Please install mkcert first by running ONE of these commands:
    echo.
    echo   Option 1 - Using Chocolatey:
    echo     choco install mkcert -y
    echo.
    echo   Option 2 - Using winget:
    echo     winget install FiloSottile.mkcert
    echo.
    echo After installing, close this window and run this script again.
    echo.
    pause
    exit /b 1
)

echo [OK] mkcert is installed
echo.

REM Create certs directory
echo Creating certs directory...
if not exist "certs" (
    mkdir certs
    echo [OK] Created certs directory
) else (
    echo [OK] certs directory already exists
)
echo.

REM Generate certificates
echo Generating SSL certificates for:
echo   - 10.208.179.58
echo   - localhost
echo   - 127.0.0.1
echo.

mkcert -key-file certs/key.pem -cert-file certs/cert.pem 10.208.179.58 localhost 127.0.0.1

echo.

REM Verify files
if exist "certs\cert.pem" (
    if exist "certs\key.pem" (
        echo ========================================
        echo   SUCCESS! Certificates Generated
        echo ========================================
        echo.
        echo Files created:
        dir certs\*.pem
        echo.
        echo ========================================
        echo   NEXT STEPS:
        echo ========================================
        echo.
        echo 1. Start your dev server:
        echo    npm run dev
        echo.
        echo 2. You should see HTTPS URLs in the terminal:
        echo    https://localhost:5174/QRMENU/
        echo    https://10.208.179.58:5174/QRMENU/
        echo.
        echo 3. Configure Firebase and Clerk (see COMPLETE_HTTPS_FIX.md)
        echo.
    ) else (
        echo [ERROR] key.pem was not created
        exit /b 1
    )
) else (
    echo [ERROR] cert.pem was not created
    exit /b 1
)

pause
