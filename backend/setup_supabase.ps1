# Supabase Setup Helper Script
# This script helps you configure your backend to use Supabase

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Supabase Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
$envPath = Join-Path $PSScriptRoot ".env"
$envExamplePath = Join-Path $PSScriptRoot ".env.example"

if (Test-Path $envPath) {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Setup cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Please provide your Supabase connection details:" -ForegroundColor Cyan
Write-Host ""

# Get Supabase connection details
$supabaseUrl = Read-Host "Enter your Supabase database URL (e.g., db.xxxxx.supabase.co)"
$supabasePassword = Read-Host "Enter your database password" -AsSecureString
$supabasePasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($supabasePassword)
)

# Construct connection string
$databaseUrl = "postgresql://postgres:$supabasePasswordPlain@$supabaseUrl:5432/postgres?sslmode=require"

Write-Host ""
Write-Host "Generating .env file..." -ForegroundColor Green

# Create .env file content
$envContent = @"
# Database Configuration (Supabase)
DATABASE_URL=$databaseUrl

# Application Settings
DEBUG=True
SECRET_KEY=$(New-Guid)
JWT_SECRET_KEY=$(New-Guid)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis (optional - for caching)
REDIS_URL=redis://localhost:6379/0

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Razorpay (for payments)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
"@

# Write .env file
$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run database migrations: alembic upgrade head" -ForegroundColor White
Write-Host "2. Create an admin user: python scripts/create_admin.py" -ForegroundColor White
Write-Host "3. Start the backend: uvicorn app.main:app --reload" -ForegroundColor White
Write-Host ""
