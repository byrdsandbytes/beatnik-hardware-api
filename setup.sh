#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Beatnik Hardware API Setup..."

# Check if we are in the repo, if not clone it
if [ ! -f "package.json" ] || [ ! -f "beatnik-hardware.service" ]; then
    echo "📂 Not in project directory. Cloning repository..."
    if [ -d "beatnik-hardware-api" ]; then
        echo "   Directory 'beatnik-hardware-api' already exists. Entering..."
        cd beatnik-hardware-api
    else
        git clone https://github.com/byrdsandbytes/beatnik-hardware-api.git
        cd beatnik-hardware-api
    fi
fi

# Get current directory
INSTALL_DIR="$(pwd)"
echo "📂 Installation directory: $INSTALL_DIR"

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
echo "🟢 Installing NPM Dependencies..."
npm install

# 3. Build Project
echo "🟢 Building TypeScript Project..."
npm run build

# 4. Configure Systemd Service
echo "🟢 Configuring Systemd Service..."

# Get absolute path to node executable
NODE_EXEC=$(nvm which 20)
echo "   Node executable found at: $NODE_EXEC"

# Create a temporary service file
SERVICE_FILE="beatnik-hardware.service"
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
