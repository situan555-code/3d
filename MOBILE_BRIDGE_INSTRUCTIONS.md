# Antigravity Mobile Bridge - Quick Start

## Quick Launch (After Setup)

Just run:
```bash
agy-mobile
```

This alias automatically:
- Changes to your `~/Documents/Configure` folder
- Launches Antigravity with the debug port enabled
- Keeps the terminal window open (required!)

## Manual Command (If alias doesn't work)

```bash
cd ~/Documents/Configure
"/Applications/Antigravity.app/Contents/MacOS/Electron" . --remote-debugging-port=9000
```

## Connection Details

**URL:** `https://unpresiding-remy-semineurotically.ngrok-free.dev`  
**Current Passcode:** `163642` (changes each time you restart the bridge)

## Important Notes

1. **Keep the terminal window open** - Closing it kills the app
2. **The bridge runs separately** - It's already started in the background
3. **To check the passcode** - Run: `tail -n 100 ~/Documents/Configure/.remote_bridge/server_log.txt | grep "Passcode"`

## Troubleshooting

**Phone says "offline"?**
- Make sure the terminal with `agy-mobile` is still open
- Check if port 9000 is listening: `lsof -i :9000`

**Bridge not running?**
```bash
cd ~/Documents/Configure/.remote_bridge
/opt/homebrew/bin/python3.13 launcher.py --mode web
```
