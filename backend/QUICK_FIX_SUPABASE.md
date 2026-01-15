# Quick Fix: Supabase Connection Issue

## The Problem
Your Supabase database only resolves to IPv6, but your Windows machine can't connect via IPv6.

## ⭐ EASIEST SOLUTION: Use Connection Pooler (5 minutes)

**This is the recommended solution - no IPv6 needed!**

1. Go to https://app.supabase.com
2. Select your project: `bqhvwefbmlubevuifswo`
3. Click **Settings** → **Database**
4. Scroll to **Connection string** section
5. Click the **Connection Pooler** tab (NOT "URI")
6. Copy the connection string (looks like):
   ```
   postgresql://postgres.bqhvwefbmlubevuifswo:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
7. Update your `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres.bqhvwefbmlubevuifswo:ZxUYl1wzKQK0tg73@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   (Replace `[REGION]` with your actual region from the pooler URL)

8. Test the connection:
   ```powershell
   cd backend
   python test_supabase_connection.py
   ```

**Done!** This uses IPv4 and works immediately.

---

## Alternative: Enable IPv6 (More Complex)

### Option A: GUI Method (Easiest)

1. Press `Win + R`
2. Type `ncpa.cpl` and press Enter
3. Right-click your active network adapter (Wi-Fi or Ethernet)
4. Select **Properties**
5. Check the box: **Internet Protocol Version 6 (TCP/IPv6)**
6. Click **OK**
7. Restart your computer
8. Test: `python test_supabase_connection.py`

### Option B: PowerShell (Admin Required)

1. **Open PowerShell as Administrator:**
   - Press `Win + X` → Select "Terminal (Admin)" or "PowerShell (Admin)"
   - Or: Search "PowerShell" → Right-click → "Run as administrator"

2. **Run this command:**
   ```powershell
   Get-NetAdapter | ForEach-Object { Enable-NetAdapterBinding -Name $_.Name -ComponentID ms_tcpip6 }
   ```

3. **Verify:**
   ```powershell
   Get-NetAdapterBinding -ComponentID ms_tcpip6 | Select-Object Name, Enabled
   ```

4. **Restart your computer**

5. **Test:**
   ```powershell
   cd backend
   python test_supabase_connection.py
   ```

---

## Why the commands you tried didn't work:

- `netsh interface ipv6 install` - Not needed on Windows 10/11 (IPv6 is built-in)
- `netsh interface ipv6 set global...` - These commands require admin privileges and may not work on all Windows versions
- `sudo` - This is a Linux command, doesn't exist in PowerShell

**Recommendation:** Use the Connection Pooler - it's faster and easier!
