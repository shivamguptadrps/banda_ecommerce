# Network Setup for Mobile Testing

This guide will help you configure the backend and mobile app to work together on the same network.

## Step 1: Find Your Local IP Address

### On macOS/Linux:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### On Windows:
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x)

**Example:** `192.168.0.108`

## Step 2: Configure Mobile App

1. Create a `.env` file in the `mobile/` directory:
```bash
cd mobile
cp .env.example .env
```

2. Edit `.env` and replace `YOUR_LOCAL_IP` with your actual IP:
```env
EXPO_PUBLIC_API_URL=http://192.168.0.108:8000/api/v1
```

3. Restart the Expo development server:
```bash
npm start
# or
expo start
```

## Step 3: Run Backend on Network

The backend is already configured to listen on `0.0.0.0` (all network interfaces), so it will be accessible from your mobile device.

Start the backend:
```bash
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Step 4: Connect Mobile Device

1. Make sure your mobile device is on the **same Wi-Fi network** as your computer
2. Start the Expo app on your mobile device
3. Scan the QR code or enter the connection URL manually
4. The app should now connect to the backend API

## Troubleshooting

### Can't connect from mobile device?

1. **Check firewall:** Make sure port 8000 is not blocked by your firewall
   - macOS: System Preferences → Security & Privacy → Firewall
   - Windows: Windows Defender Firewall

2. **Verify IP address:** Make sure you're using the correct IP address
   ```bash
   # Check your IP again
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

3. **Test connection:** Try opening `http://YOUR_IP:8000/docs` in your mobile browser
   - If it works, the backend is accessible
   - If not, check firewall settings

4. **Check CORS:** The backend should allow all origins in development mode

### Still having issues?

- Make sure both devices are on the same Wi-Fi network
- Try disabling VPN if you're using one
- Check if your router has AP isolation enabled (disable it if possible)

