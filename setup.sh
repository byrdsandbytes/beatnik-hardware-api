#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Beatnik Hardware API Production Setup..."

REPO="byrdsandbytes/beatnik-hardware-api"
ARTIFACT="beatnik-hardware-api.tar.gz"
INSTALL_DIR="/opt/beatnik-hardware-api"
SERVICE_FILE="beatnik-hardware.service"

if systemctl is-active --quiet "$SERVICE_FILE"; then
    echo "🛑 Stopping existing service for update..."
    sudo systemctl stop "$SERVICE_FILE"
fi

echo "📂 Creating installation directory at $INSTALL_DIR..."
sudo mkdir -p $INSTALL_DIR
sudo chown -R $USER:$USER $INSTALL_DIR
cd $INSTALL_DIR

echo "🔍 Finding latest release on GitHub..."
DOWNLOAD_URL=$(curl -s https://api.github.com/repos/$REPO/releases/latest | grep "browser_download_url" | grep "$ARTIFACT" | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
  echo "❌ Could not find the latest release. Check your internet connection or repository name."
  exit 1
fi

echo "⬇️ Downloading release..."
wget -q -O $ARTIFACT "$DOWNLOAD_URL"

echo "📦 Extracting release..."
tar -xzvf $ARTIFACT
rm $ARTIFACT

# 1.5 Setup Node.js via NVM
echo "🟢 Setting up Node.js (NVM)..."

# Define NVM_DIR (robust method from README/nvm docs)
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"

# Install NVM if not found or incomplete
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "   Installing NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# Load NVM
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # Use '.' instead of '\.' for script compatibility, and add --no-use
  . "$NVM_DIR/nvm.sh" --no-use
else
  echo "❌ Failed to locate nvm.sh"
  exit 1
fi

# Install and use Node.js 20
echo "   Installing/Using Node.js 20..."
nvm install 20
nvm use 20

# 2. Install Dependencies
echo "🟢 Installing Production Dependencies..."
npm install --omit=dev

# 4. Configure Systemd Service
echo "🟢 Configuring Systemd Service..."

# Get absolute path to node executable
NODE_EXEC=$(nvm which 20)
echo "   Node executable found at: $NODE_EXEC"

# Create a temporary service file
TEMP_SERVICE_FILE="${SERVICE_FILE}.tmp"

cp "$SERVICE_FILE" "$TEMP_SERVICE_FILE"

# Update WorkingDirectory
# Escape slashes for sed
ESCAPED_INSTALL_DIR=$(echo "$INSTALL_DIR" | sed 's/\//\\\//g')
sed -i "s/^WorkingDirectory=.*/WorkingDirectory=$ESCAPED_INSTALL_DIR/" "$TEMP_SERVICE_FILE"

# Update ExecStart
# We want: ExecStart=/path/to/node dist/server.js
# Escape slashes for sed
ESCAPED_NODE_EXEC=$(echo "$NODE_EXEC" | sed 's/\//\\\//g')
sed -i "s/^ExecStart=.*/ExecStart=$ESCAPED_NODE_EXEC dist\/server.js/" "$TEMP_SERVICE_FILE"

echo "   Service file patched with local paths."

# 5. Install Service (requires sudo)
echo "🟢 Installing Service to /etc/systemd/system/ (requires sudo)..."
sudo cp "$TEMP_SERVICE_FILE" "/etc/systemd/system/$SERVICE_FILE"
rm "$TEMP_SERVICE_FILE"

echo "   Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "   Enabling service..."
sudo systemctl enable "$SERVICE_FILE"

echo "   Restarting service..."
sudo systemctl restart "$SERVICE_FILE"

echo "✅ Setup Complete!"
echo "   Checking service status..."
sudo systemctl status "$SERVICE_FILE" --no-pager
