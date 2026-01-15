# View Backend Logs in Real-Time
# This script shows the backend logs from the log file

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$LOG_FILE = Join-Path $PROJECT_ROOT "backend\logs\backend.log"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend Log Viewer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Log file: $LOG_FILE" -ForegroundColor Yellow
Write-Host ""

if (Test-Path $LOG_FILE) {
    Write-Host "Showing last 50 lines, then following new logs..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    
    # Show last 50 lines
    Get-Content $LOG_FILE -Tail 50
    
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "Following new logs (live updates)..." -ForegroundColor Cyan
    Write-Host ""
    
    # Follow new logs (like tail -f)
    Get-Content $LOG_FILE -Wait -Tail 10
} else {
    Write-Host "[ERROR] Log file not found: $LOG_FILE" -ForegroundColor Red
    Write-Host ""
    Write-Host "The backend might not be running or hasn't created logs yet." -ForegroundColor Yellow
    Write-Host "Start the backend with: .\scripts\dev.ps1 backend" -ForegroundColor White
}
