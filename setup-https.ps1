# HTTPS Setup Script for Windows
# Run this in PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HTTPS Setup for Vite + React App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  WARNING: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "   Some steps may fail. Right-click PowerShell and 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Check if mkcert is installed
Write-Host "Step 1: Checking for mkcert..." -ForegroundColor Green
$mkcertInstalled = Get-Command mkcert -ErrorAction SilentlyContinue

if ($mkcertInstalled) {
    Write-Host "✅ mkcert is already installed" -ForegroundColor Green
    mkcert -version
} else {
    Write-Host "❌ mkcert not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing mkcert using Chocolatey..." -ForegroundColor Yellow
    
    # Check if Chocolatey is installed
    $chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
    
    if (-not $chocoInstalled) {
        Write-Host "Installing Chocolatey first..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    choco install mkcert -y
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Host ""

# Step 2: Install local CA
Write-Host "Step 2: Installing local Certificate Authority..." -ForegroundColor Green

if ($isAdmin) {
    mkcert -install
    Write-Host "✅ Local CA installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Skipping CA install (requires Administrator)" -ForegroundColor Yellow
    Write-Host "   Run this manually as Admin: mkcert -install" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Create certs directory
Write-Host "Step 3: Creating certs directory..." -ForegroundColor Green

if (-not (Test-Path "certs")) {
    New-Item -ItemType Directory -Path "certs" | Out-Null
    Write-Host "✅ Created certs/ directory" -ForegroundColor Green
} else {
    Write-Host "✅ certs/ directory already exists" -ForegroundColor Green
}

Write-Host ""

# Step 4: Generate certificates
Write-Host "Step 4: Generating SSL certificates..." -ForegroundColor Green

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*","Ethernet*" | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1).IPAddress

if (-not $localIP) {
    $localIP = "10.208.179.58"  # Fallback to your known IP
    Write-Host "⚠️  Could not auto-detect IP, using: $localIP" -ForegroundColor Yellow
} else {
    Write-Host "🌐 Detected local IP: $localIP" -ForegroundColor Cyan
}

mkcert -key-file certs/key.pem -cert-file certs/cert.pem $localIP localhost 127.0.0.1

if (Test-Path "certs/cert.pem" -and Test-Path "certs/key.pem") {
    Write-Host "✅ Certificates generated successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Certificate generation failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 5: Verify files
Write-Host "Step 5: Verifying certificate files..." -ForegroundColor Green
Get-ChildItem certs/*.pem | ForEach-Object {
    Write-Host "  ✓ $($_.Name)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ HTTPS Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Configure Firebase: Add '$localIP' to Authorized Domains" -ForegroundColor White
Write-Host "     https://console.firebase.google.com/project/qr-menu-19cd1/authentication/settings" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Configure Clerk: Add 'https://${localIP}:5174' to Allowed Origins" -ForegroundColor White
Write-Host "     https://dashboard.clerk.com/" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Start your dev server:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  4. Access your app:" -ForegroundColor White
Write-Host "     https://${localIP}:5174/QRMENU/admin" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 For detailed instructions, see: COMPLETE_HTTPS_FIX.md" -ForegroundColor Gray
Write-Host ""
