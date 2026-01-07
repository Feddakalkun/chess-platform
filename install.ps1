# Advanced Chess Platform - Installation Script
# This script handles all installation and setup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Advanced Chess Platform - Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if Node.js is installed
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Host "[OK] Node.js is installed: $nodeVersion" -ForegroundColor Green
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

# Function to check if npm is installed
function Test-NPM {
    try {
        $npmVersion = npm --version 2>$null
        if ($npmVersion) {
            Write-Host "[OK] npm is installed: $npmVersion" -ForegroundColor Green
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

# Function to install Node.js
function Install-NodeJS {
    Write-Host ""
    Write-Host "Node.js is not installed!" -ForegroundColor Yellow
    Write-Host "Downloading Node.js installer..." -ForegroundColor Cyan
    
    $nodeInstaller = "$env:TEMP\node-installer.msi"
    $nodeUrl = "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"
    
    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        Write-Host "[OK] Download complete!" -ForegroundColor Green
        
        Write-Host "Installing Node.js..." -ForegroundColor Cyan
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait -NoNewWindow
        
        Write-Host "[OK] Node.js installation complete!" -ForegroundColor Green
        Remove-Item $nodeInstaller -Force
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        return $true
    }
    catch {
        Write-Host "[ERROR] Failed to install Node.js: $_" -ForegroundColor Red
        return $false
    }
}

# Main installation process
Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Test-NodeJS)) {
    $install = Read-Host "Would you like to install Node.js now? (Y/N)"
    if ($install -eq "Y" -or $install -eq "y") {
        if (-not (Install-NodeJS)) {
            Write-Host ""
            Write-Host "Installation failed. Please install Node.js manually from https://nodejs.org" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
    else {
        Write-Host "Please install Node.js manually from https://nodejs.org" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check npm
if (-not (Test-NPM)) {
    Write-Host "[ERROR] npm is not installed. Please reinstall Node.js." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 2: Installing dependencies..." -ForegroundColor Cyan
Write-Host ""

# Install npm packages
try {
    Write-Host "Running: npm install" -ForegroundColor Gray
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Dependencies installed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
catch {
    Write-Host "[ERROR] Failed to install dependencies: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the server, you can:" -ForegroundColor Cyan
Write-Host "  1. Double-click 'start.bat'" -ForegroundColor White
Write-Host "  2. Run 'npm start' in this directory" -ForegroundColor White
Write-Host ""
Write-Host "The chess platform will be available at:" -ForegroundColor Cyan
Write-Host "  http://localhost:3001" -ForegroundColor Yellow
Write-Host ""

$startNow = Read-Host "Would you like to start the server now? (Y/N)"
if ($startNow -eq "Y" -or $startNow -eq "y") {
    Write-Host ""
    Write-Host "Starting server..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    Start-Sleep -Seconds 2
    npm start
}
else {
    Write-Host ""
    Write-Host "Installation complete! Run start.bat when ready." -ForegroundColor Green
    Read-Host "Press Enter to exit"
}
