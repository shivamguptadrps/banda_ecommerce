# Quick script to check backend logs
# This helps you see what's happening with CORS requests

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$LOG_FILE = Join-Path $PROJECT_ROOT "backend\logs\backend.log"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend Log Checker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if log file exists
if (Test-Path $LOG_FILE) {
    $fileInfo = Get-Item $LOG_FILE
    $fileSize = [math]::Round($fileInfo.Length / 1KB, 2)
    $lastModified = $fileInfo.LastWriteTime
    
    Write-Host "[INFO] Log file found!" -ForegroundColor Green
    Write-Host "  Location: $LOG_FILE" -ForegroundColor White
    Write-Host "  Size: $fileSize KB" -ForegroundColor White
    Write-Host "  Last updated: $lastModified" -ForegroundColor White
    Write-Host ""
    Write-Host "To view logs:" -ForegroundColor Yellow
    Write-Host "  1. View last 50 lines: .\backend\view_logs_tail.ps1" -ForegroundColor Cyan
    Write-Host "  2. View live logs: .\backend\view_logs.ps1" -ForegroundColor Cyan
    Write-Host "  3. Open in editor: code $LOG_FILE" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Last 10 lines:" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Get-Content $LOG_FILE -Tail 10
    Write-Host "----------------------------------------" -ForegroundColor Gray
} else {
    Write-Host "[WARNING] Log file not found: $LOG_FILE" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The backend might not be running or hasn't created logs yet." -ForegroundColor White
    Write-Host "Start the backend using: .\scripts\dev.ps1 backend" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Test endpoints:" -ForegroundColor Yellow
Write-Host "  CORS Test: http://localhost:8000/cors-test" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
