# ==============================================
# Banda E-Commerce Development Startup Script (PowerShell)
# ==============================================
# This script starts backend, frontend, and mobile app
# Usage: .\scripts\dev.ps1 [backend|frontend|mobile|both|all]
# ==============================================

param(
    [string]$Command = "all"
)

$ErrorActionPreference = "Stop"

# Project root directory
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot

# ==============================================
# Helper Functions
# ==============================================

function Print-Header {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Banda E-Commerce Development" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Print-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Print-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

# Check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Kill process on port
function Stop-Port {
    param([int]$Port)
    if (Test-Port -Port $Port) {
        Print-Warning "Killing process on port $Port"
        $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
}

# Ensure Node.js is available
function Ensure-Node {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Print-Error "Node.js not found! Please install Node.js"
        exit 1
    }
}

# ==============================================
# Backend Functions
# ==============================================

function Start-Backend {
    Print-Info "Starting Backend (FastAPI)..."
    
    Push-Location "$PROJECT_ROOT\backend"
    
    # Check if virtual environment exists
    if (-not (Test-Path "venv")) {
        Print-Warning "Creating Python virtual environment..."
        python -m venv venv
    }
    
    # Activate virtual environment
    & "$PROJECT_ROOT\backend\venv\Scripts\Activate.ps1"
    
    # Ensure .env exists with DEBUG=True for CORS
    if (-not (Test-Path ".env")) {
        Print-Info "Creating .env file with development settings..."
        @"
DEBUG=True
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-key-change-in-production
"@ | Out-File ".env" -Encoding utf8
    } else {
        # Ensure DEBUG is set to True
        $envContent = Get-Content ".env" -Raw
        if ($envContent -notmatch "DEBUG\s*=\s*True") {
            Print-Info "Adding DEBUG=True to .env for CORS..."
            Add-Content ".env" "`nDEBUG=True"
        }
    }
    
    # Install dependencies if needed
    if (-not (Test-Path "venv\.deps_installed")) {
        Print-Info "Installing Python dependencies..."
        pip install -r requirements.txt --quiet
        New-Item -ItemType File -Path "venv\.deps_installed" -Force | Out-Null
    }
    
    # Kill existing process on port 8000
    Stop-Port -Port 8000
    
    # Get network IP for display
    $networkIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
    if (-not $networkIP) {
        $networkIP = "192.168.0.116"
    }
    
    # Start the backend server
    Print-Success "Backend starting on http://0.0.0.0:8000"
    Print-Info "API Docs: http://localhost:8000/docs"
    Print-Info "Network API: http://${networkIP}:8000/api/v1"
    
    # Ensure logs directory exists
    $logsDir = Join-Path "$PROJECT_ROOT\backend" "logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }
    
    # Start backend in a new window so we can see errors
    $logFile = Join-Path "$PROJECT_ROOT\backend" "logs\backend.log"
    $backendCommand = "cd '$PROJECT_ROOT\backend'; `$env:DEBUG='True'; & '$PROJECT_ROOT\backend\venv\Scripts\Activate.ps1'; Write-Host '========================================' -ForegroundColor Cyan; Write-Host 'Starting Backend Server...' -ForegroundColor Cyan; Write-Host 'API: http://localhost:8000' -ForegroundColor Green; Write-Host 'Network API: http://${networkIP}:8000' -ForegroundColor Green; Write-Host 'API Docs: http://localhost:8000/docs' -ForegroundColor Cyan; Write-Host 'CORS Test: http://localhost:8000/cors-test' -ForegroundColor Yellow; Write-Host 'Log File: $logFile' -ForegroundColor Magenta; Write-Host 'View logs: .\backend\view_logs.ps1' -ForegroundColor Magenta; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'All requests and CORS headers will be logged below:' -ForegroundColor Yellow; Write-Host 'Logs are also saved to: $logFile' -ForegroundColor Yellow; Write-Host ''; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level info"
    
    $backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand -PassThru
    $backendJob.Id | Out-File "$PROJECT_ROOT\.backend.pid"
    
    # Wait a bit and verify backend is running
    Start-Sleep -Seconds 5
    
    # Test if backend is accessible
    $maxRetries = 5
    $retryCount = 0
    $backendRunning = $false
    
    while ($retryCount -lt $maxRetries -and -not $backendRunning) {
        Start-Sleep -Seconds 2
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $backendRunning = $true
                Print-Success "Backend is running and accessible!"
            }
        } catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Print-Info "Waiting for backend to start... (attempt $retryCount/$maxRetries)"
            }
        }
    }
    
    if (-not $backendRunning) {
        Print-Warning "Backend might not have started properly. Check the backend window for errors."
        Print-Info "You can test manually: http://localhost:8000/health"
    } else {
        # Test network accessibility
        try {
            $networkResponse = Invoke-WebRequest -Uri "http://${networkIP}:8000/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
            Print-Success "Backend is accessible on network: http://${networkIP}:8000"
        } catch {
            Print-Warning "Backend might not be accessible on network IP $networkIP"
            Print-Info "This could be a firewall issue. Check Windows Firewall settings."
        }
    }
    
    Pop-Location
}

# ==============================================
# Frontend Functions
# ==============================================

function Start-Frontend {
    Print-Info "Starting Frontend (Next.js)..."
    
    # Ensure Node.js is available
    Ensure-Node
    
    Push-Location "$PROJECT_ROOT\frontend"
    
    # Check Node version
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Print-Info "Node.js version: $nodeVersion"
    }
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Print-Info "Installing Node dependencies..."
        npm install
    }
    
    # Create .env.local if not exists
    if (-not (Test-Path ".env.local")) {
        "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" | Out-File ".env.local"
        Print-Success "Created .env.local"
    }
    
    # Kill existing process on port 3000
    Stop-Port -Port 3000
    
    # Get network IP for frontend display
    $networkIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
    if (-not $networkIP) {
        $networkIP = "localhost"
    }
    
    # Start the frontend server in a new window
    Print-Success "Frontend starting on http://localhost:3000"
    Print-Info "Network access: http://${networkIP}:3000"
    Print-Info "Opening frontend in a new PowerShell window..."
    
    $frontendCommand = "cd '$PROJECT_ROOT\frontend'; Write-Host '========================================' -ForegroundColor Cyan; Write-Host 'Starting Next.js Frontend' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Write-Host 'Local:    http://localhost:3000' -ForegroundColor Green; Write-Host 'Network:  http://${networkIP}:3000' -ForegroundColor Green; Write-Host ''; npm run dev"
    
    $frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand -PassThru
    $frontendJob.Id | Out-File "$PROJECT_ROOT\.frontend.pid"
    
    Pop-Location
}

# ==============================================
# Mobile Functions
# ==============================================

function Start-Mobile {
    Print-Info "Starting Mobile App (React Native/Expo)..."
    
    # Ensure Node.js is available
    Ensure-Node
    
    Push-Location "$PROJECT_ROOT\mobile"
    
    # Check Node version
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Print-Info "Node.js version: $nodeVersion"
    }
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Print-Info "Installing Node dependencies..."
        npm install --legacy-peer-deps
    }
    
    # Get local IP for API URL - try to find the specific IP or use detected one
    $localIP = $null
    
    # Priority 1: Use environment variable if set
    if ($env:MOBILE_IP) {
        $localIP = $env:MOBILE_IP
        Print-Info "Using specified IP from environment: $localIP"
    } else {
        # Priority 2: Try to auto-detect
        $detectedIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
        if ($detectedIP) {
            $localIP = $detectedIP
            Print-Success "Auto-detected network IP: $localIP"
        } else {
            # Priority 3: Use default IP
            $localIP = "192.168.0.116"
            Print-Warning "Could not auto-detect IP, using default: $localIP"
        }
    }
    
    # Validate IP is not empty
    if ([string]::IsNullOrWhiteSpace($localIP)) {
        $localIP = "192.168.0.116"
        Print-Warning "IP was empty, using default: $localIP"
    }
    
    Print-Info "Final IP address: $localIP"
    
    # Update .env with network IP (ensure proper format, no trailing newline)
    # Validate IP again before creating URL
    if ([string]::IsNullOrWhiteSpace($localIP)) {
        Print-Error "IP address is empty! Cannot create .env file"
        Pop-Location
        return
    }
    
    # Define apiUrl ONCE using braces to avoid interpolation bugs with colons
    $apiUrl = "http://${localIP}:8000/api/v1"
    
    # Remove any existing .env file and create fresh one
    if (Test-Path ".env") {
        Remove-Item ".env" -Force
        Print-Info "Removed old .env file"
    }
    
    # Create .env file with correct format (no spaces, no quotes, no trailing newline)
    $envLine = "EXPO_PUBLIC_API_URL=$apiUrl"
    $envFilePath = Join-Path $PWD ".env"
    
    try {
        [System.IO.File]::WriteAllText($envFilePath, $envLine, [System.Text.Encoding]::UTF8)
        Print-Success "Created .env file with API URL: $apiUrl"
    } catch {
        Print-Error "Failed to write .env file: $_"
        Pop-Location
        return
    }
    
    # Verify .env file was created correctly
    if (Test-Path ".env") {
        try {
            $envContent = [System.IO.File]::ReadAllText($envFilePath, [System.Text.Encoding]::UTF8).Trim()
            Print-Info "Verified .env content: $envContent"
            
            # Verify it matches expected format
            if ($envContent -eq $envLine) {
                Print-Success ".env file is correctly configured"
            } else {
                Print-Warning ".env file format mismatch!"
                Print-Warning "Expected: $envLine"
                Print-Warning "Got: $envContent"
                Print-Info "Attempting to fix..."
                [System.IO.File]::WriteAllText($envFilePath, $envLine, [System.Text.Encoding]::UTF8)
                Print-Success "Fixed .env file"
            }
        } catch {
            Print-Warning "Could not verify .env file: $_"
        }
    } else {
        Print-Error ".env file was not created!"
    }
    
    # Kill existing process on port 8081 (Metro bundler)
    Stop-Port -Port 8081
    Stop-Port -Port 19000  # Expo default port
    Stop-Port -Port 19001  # Expo alternative port
    
    # Check Windows Firewall for both ports
    Print-Info "Checking Windows Firewall..."
    
    # Check port 8000 (Backend)
    $firewallRule8000 = Get-NetFirewallRule -DisplayName "*Backend*8000*" -ErrorAction SilentlyContinue
    if (-not $firewallRule8000) {
        Print-Warning "Firewall rule for port 8000 (Backend) not found"
        Print-Info "You may need to allow port 8000 in Windows Firewall for mobile devices to access the API"
    }
    
    # Check port 8081 (Metro)
    $firewallRule8081 = Get-NetFirewallRule -DisplayName "*Metro*8081*" -ErrorAction SilentlyContinue
    if (-not $firewallRule8081) {
        Print-Warning "Firewall rule for port 8081 (Metro) not found"
        Print-Info "You may need to allow port 8081 in Windows Firewall"
    }
    
    Print-Info "To setup firewall rules, run as Administrator: .\scripts\setup_firewall.ps1"
    
    # Start the mobile app with network access
    Print-Success "Mobile app starting (Expo Metro bundler)"
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "MOBILE APP ACCESS INFORMATION" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "Network IP Address: " -NoNewline -ForegroundColor Cyan
    Write-Host "$localIP" -ForegroundColor Green
    Write-Host "Metro Bundler:     " -NoNewline -ForegroundColor Cyan
    Write-Host "http://${localIP}:8081" -ForegroundColor Green
    Write-Host "API Endpoint:     " -NoNewline -ForegroundColor Cyan
    Write-Host "$apiUrl" -ForegroundColor Green
    Write-Host "Scan QR Code:     Use Expo Go app to scan QR code" -ForegroundColor Cyan
    Write-Host "Keyboard Shortcuts:" -ForegroundColor Cyan
    Write-Host "   Press 'i' for iOS Simulator" -ForegroundColor Yellow
    Write-Host "   Press 'a' for Android Emulator" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Print-Info "Make sure your mobile device is on the same Wi-Fi network"
    Print-Info "If you can't access, check Windows Firewall settings"
    Write-Host ""
    
    # Start Expo with LAN access enabled (--lan flag enables network access)
    # Note: $apiUrl is already defined above - DO NOT reassign it!
    # Use --clear to ensure .env is reloaded and cache is cleared
    Print-Info "Opening Expo in a new PowerShell window..."
    Print-Info "Using --clear flag to reload environment variables from .env"
    Print-Info "API URL configured: $apiUrl"
    Print-Warning "IMPORTANT: Make sure the mobile app shows this API URL in console logs!"
    
    # Set environment variables for the Expo process
    # IMPORTANT: Expo reads .env at build time, and app.config.js also reads it
    # We set it as environment variable AND ensure .env file is correct
    # Escape variables properly in the here-string
    # Ensure variables are set before creating here-string
    if ([string]::IsNullOrWhiteSpace($localIP) -or [string]::IsNullOrWhiteSpace($apiUrl)) {
        Print-Error "IP address or API URL is empty! Cannot start mobile app"
        Print-Error "localIP: '$localIP', apiUrl: '$apiUrl'"
        Pop-Location
        return
    }
    
    # Create the .env file BEFORE starting Expo to ensure it's correct
    # Validate apiUrl format before writing
    if ($apiUrl -notmatch '^http://\d+\.\d+\.\d+\.\d+:\d+/api/v1$') {
        Print-Error "API URL format is invalid: '$apiUrl'"
        Print-Error "Expected format: http://192.168.0.116:8000/api/v1"
        Print-Error "localIP: '$localIP', apiUrl: '$apiUrl'"
        Pop-Location
        return
    }
    
    $mobileEnvPath = Join-Path "$PROJECT_ROOT\mobile" ".env"
    $envLine = "EXPO_PUBLIC_API_URL=$apiUrl"
    
    try {
        [System.IO.File]::WriteAllText($mobileEnvPath, $envLine, [System.Text.Encoding]::UTF8)
        Print-Success "Pre-created .env file with: $envLine"
        
        # Verify it was written correctly
        $verifyContent = [System.IO.File]::ReadAllText($mobileEnvPath, [System.Text.Encoding]::UTF8).Trim()
        if ($verifyContent -ne $envLine) {
            Print-Error ".env file was not written correctly!"
            Print-Error "Expected: $envLine"
            Print-Error "Got: $verifyContent"
            Pop-Location
            return
        }
    } catch {
        Print-Error "Failed to write .env file: $_"
        Pop-Location
        return
    }
    
    # Verify apiUrl is set correctly before creating here-string
    if ([string]::IsNullOrWhiteSpace($apiUrl) -or $apiUrl -notmatch '^http://\d+\.\d+\.\d+\.\d+:\d+') {
        Print-Error "API URL is invalid: '$apiUrl'. Cannot start mobile app."
        Print-Error "Expected format: http://192.168.0.116:8000/api/v1"
        Pop-Location
        return
    }
    
    $expoCommand = @"
cd '$PROJECT_ROOT\mobile'
`$env:REACT_NATIVE_PACKAGER_HOSTNAME='${localIP}'
`$env:EXPO_PUBLIC_API_URL='${apiUrl}'
`$expectedApiUrl = '${apiUrl}'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Starting Expo Metro Bundler' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Network IP: ${localIP}' -ForegroundColor Green
Write-Host 'Metro Bundler: http://${localIP}:8081' -ForegroundColor Green
Write-Host 'API URL: ${apiUrl}' -ForegroundColor Green
Write-Host ''
Write-Host 'Checking configuration...' -ForegroundColor Yellow
if (Test-Path '.env') {
    `$envFilePath = Join-Path (Get-Location) '.env'
    `$envContent = [System.IO.File]::ReadAllText(`$envFilePath, [System.Text.Encoding]::UTF8).Trim()
    Write-Host '  [OK] .env file exists' -ForegroundColor Green
    Write-Host "  Content: `$envContent" -ForegroundColor White
    `$expectedContent = 'EXPO_PUBLIC_API_URL=' + `$expectedApiUrl
    if (`$envContent -ne `$expectedContent) {
        Write-Host '  [WARNING] .env does not match expected value!' -ForegroundColor Red
        Write-Host "  Expected: `$expectedContent" -ForegroundColor Yellow
        Write-Host "  Got: `$envContent" -ForegroundColor Yellow
        Write-Host '  Fixing .env file...' -ForegroundColor Yellow
        [System.IO.File]::WriteAllText(`$envFilePath, `$expectedContent, [System.Text.Encoding]::UTF8)
        Write-Host '  [OK] Fixed .env file' -ForegroundColor Green
        Write-Host "  New content: `$expectedContent" -ForegroundColor White
    } else {
        Write-Host '  [OK] .env file is correct' -ForegroundColor Green
    }
} else {
    Write-Host '  [WARNING] .env file not found!' -ForegroundColor Red
    Write-Host '  Creating .env file...' -ForegroundColor Yellow
    `$envFilePath = Join-Path (Get-Location) '.env'
    `$expectedContent = 'EXPO_PUBLIC_API_URL=' + `$expectedApiUrl
    [System.IO.File]::WriteAllText(`$envFilePath, `$expectedContent, [System.Text.Encoding]::UTF8)
    Write-Host '  [OK] Created .env file' -ForegroundColor Green
    Write-Host "  Content: `$expectedContent" -ForegroundColor White
}
if (Test-Path 'app.config.js') {
    Write-Host '  [OK] app.config.js exists and will read from .env' -ForegroundColor Green
} else {
    Write-Host '  [WARNING] app.config.js not found!' -ForegroundColor Yellow
}
Write-Host ''
Write-Host 'Environment Variables:' -ForegroundColor Yellow
Write-Host "  EXPO_PUBLIC_API_URL: `$env:EXPO_PUBLIC_API_URL" -ForegroundColor White
Write-Host "  REACT_NATIVE_PACKAGER_HOSTNAME: `$env:REACT_NATIVE_PACKAGER_HOSTNAME" -ForegroundColor White
Write-Host ''
Write-Host 'Starting Expo with --clear to reload environment...' -ForegroundColor Cyan
Write-Host "IMPORTANT: Check mobile app console for: ✅ API_URL: `$expectedApiUrl" -ForegroundColor Yellow
Write-Host 'If you see localhost:8000 or an error, the configuration is wrong!' -ForegroundColor Red
Write-Host ''
Write-Host 'Clearing Metro cache and restarting...' -ForegroundColor Cyan
Write-Host ''
npx expo start --lan --clear
"@
    
    $mobileJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", $expoCommand -PassThru
    $mobileJob.Id | Out-File "$PROJECT_ROOT\.mobile.pid"
    Start-Sleep -Seconds 5
    Print-Success "Expo Metro Bundler should be starting in the new window"
    Print-Info "If Metro bundler doesn't start, check the new PowerShell window for errors"
    
    Pop-Location
}

# ==============================================
# Stop Functions
# ==============================================

function Stop-Servers {
    Print-Info "Stopping servers..."
    
    # Stop backend
    if (Test-Path "$PROJECT_ROOT\.backend.pid") {
        $pid = Get-Content "$PROJECT_ROOT\.backend.pid"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Remove-Item "$PROJECT_ROOT\.backend.pid" -ErrorAction SilentlyContinue
    }
    Stop-Port -Port 8000
    
    # Stop frontend
    if (Test-Path "$PROJECT_ROOT\.frontend.pid") {
        $pid = Get-Content "$PROJECT_ROOT\.frontend.pid"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Remove-Item "$PROJECT_ROOT\.frontend.pid" -ErrorAction SilentlyContinue
    }
    Stop-Port -Port 3000
    
    # Stop mobile
    if (Test-Path "$PROJECT_ROOT\.mobile.pid") {
        $pid = Get-Content "$PROJECT_ROOT\.mobile.pid"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Remove-Item "$PROJECT_ROOT\.mobile.pid" -ErrorAction SilentlyContinue
    }
    Stop-Port -Port 8081
    
    Print-Success "All servers stopped"
}

# ==============================================
# Main Script
# ==============================================

Print-Header

# Handle command line arguments
switch ($Command.ToLower()) {
    "backend" {
        Start-Backend
        Print-Success "Backend is running!"
        Write-Host "Press Ctrl+C to stop the server"
        try {
            Wait-Process -Id (Get-Content "$PROJECT_ROOT\.backend.pid")
        } catch {
            # Process already stopped
        }
    }
    "frontend" {
        Start-Frontend
        Print-Success "Frontend is running!"
        Write-Host "Press Ctrl+C to stop the server"
        try {
            Wait-Process -Id (Get-Content "$PROJECT_ROOT\.frontend.pid")
        } catch {
            # Process already stopped
        }
    }
    "mobile" {
        Start-Mobile
        Print-Success "Mobile app is running!"
        Write-Host "Press Ctrl+C to stop the server"
        try {
            Wait-Process -Id (Get-Content "$PROJECT_ROOT\.mobile.pid")
        } catch {
            # Process already stopped
        }
    }
    "both" {
        Start-Backend
        Start-Sleep -Seconds 2
        Start-Frontend
        
        # Get network IP for display
        $networkIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
        if (-not $networkIP) {
            $networkIP = "localhost"
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  🚀 Both servers are running!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "            http://${networkIP}:3000 (Network)" -ForegroundColor Cyan
        Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
        Write-Host "            http://${networkIP}:8000 (Network)" -ForegroundColor Cyan
        Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
        Write-Host "            http://${networkIP}:8000/docs (Network)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
        Write-Host ""
        
        # Wait for Ctrl+C
        try {
            while ($true) {
                Start-Sleep -Seconds 1
            }
        } catch {
            Stop-Servers
        }
    }
    "all" {
        Print-Info "Starting all services (Backend, Frontend, Mobile)..."
        Write-Host ""
        
        Start-Backend
        Start-Sleep -Seconds 3
        Print-Success "Backend started"
        
        Start-Frontend
        Start-Sleep -Seconds 3
        Print-Success "Frontend started"
        
        Start-Mobile
        Start-Sleep -Seconds 3
        Print-Success "Mobile app started"
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  [RUNNING] All services are running!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        
        # Get IP for mobile display
        $mobileIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
        if ($env:MOBILE_IP) {
            $mobileIP = $env:MOBILE_IP
        } elseif (-not $mobileIP) {
            $mobileIP = "192.168.0.116"
        }
        
        Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "            http://${mobileIP}:3000 (Network)" -ForegroundColor Cyan
        Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
        Write-Host "            http://${mobileIP}:8000 (Network)" -ForegroundColor Cyan
        Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
        Write-Host "            http://${mobileIP}:8000/docs (Network)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "📱 MOBILE APP ACCESS INFORMATION" -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "  🌐 Network IP Address: $mobileIP" -ForegroundColor Green
        Write-Host "  📡 Metro Bundler:      http://${mobileIP}:8081" -ForegroundColor Green
        Write-Host "  🔌 API Endpoint:       http://${mobileIP}:8000/api/v1" -ForegroundColor Green
        Write-Host "  📲 Scan QR Code:       Use Expo Go app to scan QR code" -ForegroundColor Cyan
        Write-Host "  ⌨️  Keyboard Shortcuts:" -ForegroundColor Cyan
        Write-Host "     Press 'i' for iOS Simulator" -ForegroundColor Yellow
        Write-Host "     Press 'a' for Android Emulator" -ForegroundColor Yellow
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Testing from Mobile Device:" -ForegroundColor Yellow
        Write-Host "  - Backend Health: http://${mobileIP}:8000/health" -ForegroundColor White
        Write-Host "  - Backend Docs:   http://${mobileIP}:8000/docs" -ForegroundColor White
        Write-Host "  - Frontend:       http://${mobileIP}:3000" -ForegroundColor White
        Write-Host "  - Metro Bundler:  http://${mobileIP}:8081" -ForegroundColor White
        Write-Host ""
        Write-Host "  Troubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Test backend: .\scripts\test_backend.ps1 $mobileIP" -ForegroundColor White
        Write-Host "  2. Setup firewall: .\scripts\setup_firewall.ps1 (Run as Administrator)" -ForegroundColor White
        Write-Host "  2. Setup firewall (Admin): .\scripts\setup_firewall.ps1" -ForegroundColor White
        Write-Host "  3. Check backend window for errors" -ForegroundColor White
        Write-Host "  4. Verify mobile .env: Get-Content mobile\.env" -ForegroundColor White
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
        Write-Host ""
        
        # Wait for Ctrl+C
        try {
            while ($true) {
                Start-Sleep -Seconds 1
            }
        } catch {
            Stop-Servers
        }
    }
    "stop" {
        Stop-Servers
    }
    default {
        Write-Host "Usage: .\scripts\dev.ps1 [backend|frontend|mobile|both|all|stop]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  backend   - Start only the backend server"
        Write-Host "  frontend  - Start only the frontend server"
        Write-Host "  mobile    - Start only the mobile app (Expo)"
        Write-Host "  both      - Start backend + frontend (default)"
        Write-Host "  all       - Start backend + frontend + mobile"
        Write-Host "  stop      - Stop all running servers"
        Write-Host ""
        Write-Host "Environment Variables:"
        Write-Host "  MOBILE_IP - Set custom IP for mobile (e.g., `$env:MOBILE_IP='192.168.0.116')"
        exit 1
    }
}
