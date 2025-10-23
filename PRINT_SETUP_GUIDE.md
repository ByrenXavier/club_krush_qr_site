# TM-T82X Print Setup Guide

## Overview
This guide helps you set up QR code printing for your Club Krush ordering system using an Epson TM-T82X thermal printer.

## Option 1: Print Relay Server (Recommended for iPad deployment)

### Step 1: Set up the Print Relay Server

1. **Install Node.js** on a computer that's on the same network as your printer
2. **Navigate to the project folder**:
   ```bash
   cd club_krush_qr_website
   ```

3. **Install dependencies**:
   ```bash
   npm install express cors
   ```

4. **Start the print relay server**:
   ```bash
   node print-relay-server.js
   ```

5. **Note your computer's IP address** (you'll need this for the web app)

### Step 2: Configure the Web App

1. **Find your computer's local IP address**:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Update the web app** with your IP address:
   - Open `app/page.tsx`
   - Find line 124: `const RELAY_SERVER_IP = '192.168.31.1'`
   - Replace `192.168.31.1` with your actual IP address

3. **Deploy to Vercel** with the updated IP address

### Step 3: Test the Setup

1. **Test the relay server**:
   - Open browser and go to: `http://[YOUR_IP]:3001/test-printer`
   - This should send a test print to your TM-T82X

2. **Test from your web app**:
   - Open your QR website on iPad
   - Click any table → Generate QR code
   - Click "Direct Print" button
   - Should print successfully!

## Option 2: iPad Print Dialog (Alternative)

If you prefer not to run a relay server:

1. **Set up AirPrint on TM-T82X**:
   - Enable AirPrint in printer settings
   - Or use a print server app on your computer

2. **Add printer to iPad**:
   - Settings → Printers & Scanners
   - Add the TM-T82X printer

3. **Use "Print (Recommended)" button** in the web app

## Troubleshooting

### Print Relay Server Issues

1. **"Connection refused" error**:
   - Make sure the relay server is running
   - Check that port 3001 is not blocked by firewall
   - Verify the IP address is correct

2. **"Printer connection error"**:
   - Check that TM-T82X is on and connected to WiFi
   - Verify printer IP is 192.168.31.20
   - Test with: `telnet 192.168.31.20 9100`

3. **"Mixed content" error**:
   - This is expected - use the relay server instead

### Printer Issues

1. **Printer not found**:
   - Check WiFi connection
   - Verify IP address in printer settings
   - Restart printer if needed

2. **QR code not printing**:
   - Check paper is loaded
   - Verify ESC/POS commands are correct
   - Try a simple text print first

## Network Configuration

### TM-T82X Settings
- **IP Address**: 192.168.31.20
- **Port**: 9100 (for raw printing)
- **Protocol**: TCP/IP
- **Raw Printing**: Enabled

### Relay Server Settings
- **Port**: 3001
- **Protocol**: HTTP
- **CORS**: Enabled for all origins

## Security Notes

- The relay server runs on your local network only
- No sensitive data is stored or logged
- Printer communication is direct and secure
- Web app communicates via HTTPS to Vercel, HTTP to local relay

## Support

If you encounter issues:
1. Check the console logs in your browser
2. Check the relay server logs in terminal
3. Verify network connectivity between all devices
4. Test with the `/test-printer` endpoint first
