#!/bin/bash
REPO="byrdsandbytes/beatnik-hardware-api"
ARTIFACT="beatnik-hardware-api.tar.gz"
INSTALL_DIR="/opt/beatnik-hardware-api"
SERVICE="beatnik-hardware.service"

echo "🔍 Finding latest release on GitHub..."
DOWNLOAD_URL=$(curl -s https://api.github.com/repos/$REPO/releases/latest | grep "browser_download_url" | grep "$ARTIFACT" | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
  echo "❌ Could not find the latest release. Check your repo name or internet connection."
  exit 1
fi

echo "⬇️ Downloading update..."
wget -q -O ~/$ARTIFACT "$DOWNLOAD_URL"

echo "🛑 Stopping service..."
sudo systemctl stop $SERVICE

echo "📦 Extracting new release..."
tar -xzvf ~/$ARTIFACT -C $INSTALL_DIR

echo "📥 Installing production dependencies..."
cd $INSTALL_DIR
npm install --omit=dev

echo "🚀 Restarting service..."
sudo systemctl start $SERVICE

echo "🧹 Cleaning up..."
rm ~/$ARTIFACT

echo "✅ Update complete!
