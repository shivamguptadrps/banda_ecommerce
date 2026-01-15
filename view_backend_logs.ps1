# Quick access script to view backend logs from project root
# Usage: .\view_backend_logs.ps1

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$SCRIPT_DIR\backend\view_logs.ps1"
