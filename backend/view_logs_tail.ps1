# Quick script to tail the last N lines of the log file
# Usage: .\view_logs_tail.ps1 [number_of_lines]

param(
    [int]$Lines = 50
)

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$LOG_FILE = Join-Path $PROJECT_ROOT "backend\logs\backend.log"

if (Test-Path $LOG_FILE) {
    Write-Host "Last $Lines lines of backend.log:" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Get-Content $LOG_FILE -Tail $Lines
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Log file: $LOG_FILE" -ForegroundColor Yellow
    Write-Host "For live logs, run: .\view_logs.ps1" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Log file not found: $LOG_FILE" -ForegroundColor Red
    Write-Host "Start the backend first: .\scripts\dev.ps1 backend" -ForegroundColor Yellow
}
