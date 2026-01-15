# CORS Debugging Guide

## How to See Backend Logs

**All backend logs are now saved to a file!** You can view them anytime.

### Log File Location
```
backend/logs/backend.log
```

### Option 1: View Live Logs (Recommended)
```powershell
# From project root:
.\view_backend_logs.ps1

# Or from backend directory:
.\backend\view_logs.ps1
```
This shows the last 50 lines and then follows new logs in real-time (like `tail -f`).

### Option 2: View Last N Lines
```powershell
# From project root:
.\view_backend_logs_tail.ps1 100

# Or from backend directory:
.\backend\view_logs_tail.ps1 100
```

### Option 3: Open in Editor
```powershell
# Open in VS Code
code backend/logs/backend.log

# Or open in Notepad
notepad backend/logs/backend.log
```

### Option 4: Check the Backend Window
The backend still runs in a **separate PowerShell window** when you use `dev.ps1`. 
This window shows all backend logs including:
   - CORS configuration on startup
   - Every incoming request
   - Origin headers
   - CORS response headers
   - Response status codes

### Option 2: Test CORS Directly
Visit these URLs in your browser or use curl:

```bash
# Test CORS endpoint
curl http://localhost:8000/cors-test

# Test with origin header (simulating browser)
curl -H "Origin: http://localhost:3000" http://localhost:8000/cors-test
```

### Option 3: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try the segment creation request
4. Check the request/response headers
5. Look for CORS error messages

## What the Logs Show

When you make a request, you'll see:
```
[REQUEST] POST /api/v1/admin/categories/.../segments
  Origin: http://localhost:3000
  Headers: ['origin', 'content-type', 'authorization', ...]
  [CORS Response Headers]: {'access-control-allow-origin': '*', ...}
  [RESPONSE] 201
```

## Common CORS Issues

1. **Missing Origin Header**: If Origin is "No Origin", the request might be from the same origin (Next.js proxy)
2. **OPTIONS Preflight**: Browser sends OPTIONS first, check if it's handled
3. **Credentials**: If using cookies, `allow_credentials` must be `True` and origins can't be `["*"]`

## Current Configuration

- **Debug Mode**: `True` (from .env)
- **Allow All Origins**: `True` (because DEBUG=True)
- **CORS Origins**: `["*"]`
- **Allow Credentials**: `False` (required when using `["*"]`)

## Next Steps

1. **Restart the backend** to see the new logging:
   ```powershell
   # Stop current backend (Ctrl+C in backend window)
   # Then restart:
   .\scripts\dev.ps1 backend
   ```

2. **Check the backend window** for detailed request logs

3. **Try the segment creation again** and watch the logs

4. **Share the log output** if the error persists
