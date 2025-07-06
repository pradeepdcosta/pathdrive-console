#!/bin/bash

echo "🚀 Starting PathDrive Console..."
echo "📍 Your WSL IP: $(hostname -I | cut -d' ' -f1)"
echo "🌐 Windows should access via: http://$(hostname -I | cut -d' ' -f1):3001"
echo "🔧 WSL can access via: http://localhost:3001"
echo ""
echo "🎯 Try these URLs in Windows browser:"
echo "   1. http://$(hostname -I | cut -d' ' -f1):3001"
echo "   2. http://localhost:3001 (after port forwarding)"
echo ""
echo "💡 To set up Windows port forwarding, run in PowerShell as Admin:"
echo "   netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$(hostname -I | cut -d' ' -f1)"
echo ""
echo "Starting server now..."

npm run dev -- --hostname 0.0.0.0 --port 3001