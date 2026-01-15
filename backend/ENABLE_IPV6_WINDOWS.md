# Enable IPv6 on Windows to Connect to Supabase

If you're getting "could not translate host name" errors when connecting to Supabase, it's likely because your Windows machine doesn't have IPv6 enabled or configured properly.

## Method 1: Enable IPv6 via Network Settings

1. Press `Win + R` and type `ncpa.cpl` and press Enter
2. Right-click on your active network adapter (Wi-Fi or Ethernet)
3. Select "Properties"
4. Check the box next to "Internet Protocol Version 6 (TCP/IPv6)"
5. Click "OK"
6. Restart your computer

## Method 2: Enable IPv6 via PowerShell (Admin) - RECOMMENDED

**Note:** On modern Windows (Windows 10/11), IPv6 is already installed. You just need to enable it on your network adapter.

1. **Open PowerShell as Administrator:**
   - Press `Win + X` and select "Windows PowerShell (Admin)" or "Terminal (Admin)"
   - Or search for "PowerShell" in Start menu, right-click and select "Run as administrator"

2. **Check current IPv6 status:**
   ```powershell
   Get-NetAdapterBinding -ComponentID ms_tcpip6 | Select-Object Name, Enabled
   ```

3. **Enable IPv6 on all adapters:**
   ```powershell
   Get-NetAdapter | ForEach-Object { Enable-NetAdapterBinding -Name $_.Name -ComponentID ms_tcpip6 }
   ```

4. **Verify it's enabled:**
   ```powershell
   Get-NetAdapterBinding -ComponentID ms_tcpip6 | Where-Object {$_.Enabled -eq $true}
   ```

5. **Restart your computer** (recommended but not always required)

## Method 3: Check IPv6 Status

To check if IPv6 is enabled:

```powershell
Get-NetAdapterBinding -ComponentID ms_tcpip6
```

If it shows "Enabled: False", you need to enable it.

## After Enabling IPv6

1. Restart your computer
2. Test the connection again:
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   python -c "from app.database import check_database_connection; check_database_connection()"
   ```

## ⭐ EASIEST SOLUTION: Use Connection Pooler (RECOMMENDED)

**Instead of dealing with IPv6, use Supabase's Connection Pooler which uses IPv4:**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Click on the **Connection Pooler** tab (not "URI")
6. Copy the connection string (it will have port `6543` instead of `5432`)
7. Update your `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
8. Test the connection:
   ```powershell
   cd backend
   python test_supabase_connection.py
   ```

**This is the easiest solution and avoids all IPv6 issues!**
