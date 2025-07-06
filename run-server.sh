#!/bin/bash

# Function to handle cleanup
cleanup() {
    echo "🛑 Stopping server..."
    pkill -f "next dev"
    exit 0
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

echo "🚀 Starting PathDrive Console (Persistent Mode)..."
echo "📍 Your WSL IP: $(hostname -I | cut -d' ' -f1)"
echo "🌐 Windows access: http://$(hostname -I | cut -d' ' -f1):3001"
echo "🔧 WSL access: http://localhost:3001"
echo ""
echo "💡 Server will restart automatically if it crashes"
echo "💡 Press Ctrl+C to stop the server"
echo ""

# Make sure we're in the right directory
cd /home/pradeepdcosta/Projects/PathDriveConsole

# Keep restarting the server if it crashes
while true; do
    echo "⚡ Starting/Restarting Next.js server..."
    npm run dev -- --hostname 0.0.0.0 --port 3001
    
    echo "💥 Server stopped unexpectedly. Restarting in 3 seconds..."
    sleep 3
done