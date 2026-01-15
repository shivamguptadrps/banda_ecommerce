# Network Setup for Mobile Testing

## Quick Setup Guide

### Step 1: Find Your Computer's IP Address

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
```

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" (usually 192.168.x.x)
```

**Example Output:** `192.168.0.108`

### Step 2: Create .env File

Create a `.env` file in the `mobile/` directory:

```bash
cd mobile
echo "EXPO_PUBLIC_API_URL=http://192.168.0.108:8000/api/v1" > .env
```

**Replace `192.168.0.108` with your actual IP address!**

### Step 3: Start Backend Server

**Option A: Use the startup script (recommended)**
```bash
cd backend
./start_network.sh
```

**Option B: Manual start**
```bash
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be accessible at: `http://YOUR_IP:8000`

### Step 4: Start Mobile App

```bash
cd mobile
npm start
# or
expo start
```

**Important:** After creating/updating `.env`, you need to restart Expo:
1. Stop the Expo server (Ctrl+C)
2. Clear cache: `expo start -c` or `npm start -- --clear`
3. Start again: `npm start`

### Step 5: Connect Your Mobile Device

1. Make sure your phone is on the **same Wi-Fi network** as your computer
2. Open Expo Go app on your phone
3. Scan the QR code or enter the connection URL
4. The app should now connect to your backend!

## Testing Connection

Test if your backend is accessible from your phone's browser:
- Open: `http://YOUR_IP:8000/docs`
- If you see the API docs, the backend is accessible ✅
- If not, check firewall settings

## Troubleshooting

### Can't connect from mobile?

1. **Firewall:** Allow port 8000
   - macOS: System Preferences → Security → Firewall → Firewall Options
   - Add Python or allow incoming connections on port 8000

2. **Same Network:** Both devices must be on the same Wi-Fi

3. **IP Changed?** If your IP changes, update `.env` and restart Expo

4. **CORS Error?** Backend should allow all origins in dev mode (already configured)

### Still having issues?

- Try disabling VPN
- Check router AP isolation settings
- Use `http://` not `https://` for local network

