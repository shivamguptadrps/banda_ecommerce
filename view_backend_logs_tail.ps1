# Quick access script to view last N lines of backend logs from project root
# Usage: .\view_backend_logs_tail.ps1 [number_of_lines]

param(
    [int]$Lines = 50
)

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$SCRIPT_DIR\backend\view_logs_tail.ps1" -Lines $Lines
