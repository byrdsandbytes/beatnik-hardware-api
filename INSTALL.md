# Beatnik Hardware API: Installation & Updating Guide

This guide covers the necessary steps to install, configure, and maintain the Beatnik Hardware API on your Raspberry Pi. 

There are two primary ways to install the service. **Method 1 (Production Release)** is the most robust and professional choice, as it keeps your Raspberry Pi free of development dependencies and compiling overhead. **Method 2 (Source Script)** is better suited for active development.

---

## 📋 Prerequisites

Before you begin, ensure your Raspberry Pi meets the following requirements:
- **OS:** Raspberry Pi OS (Bookworm or newer recommended)
- **Privileges:** Root access (`sudo`) is required to modify system configuration files and manage systemd services.
- **Node.js:** Version 20 is required.

### Installing Node.js (via NVM)
If you don't have Node.js installed, we recommend using NVM (Node Version Manager):

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc

# Install and activate Node.js 20
nvm install 20
nvm use 20
```

---

## 🚀 Installation

### Method 1: Production Installation (Recommended)
This method uses pre-built release artifacts configured via GitHub Actions. It is the cleanest way to run the service in production.

**1. Create the Application Directory**
```bash
sudo mkdir -p /opt/beatnik-hardware-api
sudo chown -R $USER:$USER /opt/beatnik-hardware-api
cd /opt/beatnik-hardware-api
```

**2. Download and Extract the Latest Release**
Find the latest `beatnik-hardware-api.tar.gz` from the [GitHub Releases page](https://github.com/byrdsandbytes/beatnik-hardware-api/releases) and download it:
```bash
# Replace with the actual URL from the latest release
wget -O beatnik-hardware-api.tar.gz https://github.com/byrdsandbytes/beatnik-hardware-api/releases/latest/download/beatnik-hardware-api.tar.gz
tar -xzvf beatnik-hardware-api.tar.gz
rm beatnik-hardware-api.tar.gz
```

**3. Install Production Dependencies**
```bash
npm install --omit=dev
```

**4. Set up the System Service**
```bash
# Copy the service file
sudo cp beatnik-hardware.service /etc/systemd/system/

# IMPORTANT: Edit the service file to ensure ExecStart points to your Node.js executable
# You can find your node path by running: which node
sudo nano /etc/systemd/system/beatnik-hardware.service

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable beatnik-hardware.service
sudo systemctl start beatnik-hardware.service
```

*(Note: Ensure `WorkingDirectory` in the service file points to `/opt/beatnik-hardware-api`.)*

---

### Method 2: Quick Source Installation (Development)
If you want to build the project directly from source on the Pi itself, use our automated setup script.

**1. Run the Setup Script**
```bash
wget https://raw.githubusercontent.com/byrdsandbytes/beatnik-hardware-api/master/setup.sh
chmod +x setup.sh
./setup.sh
```

**What the script does:**
1. Installs Node.js v20 via NVM.
2. Clones the repository (if not already present).
3. Installs all NPM dependencies (including dev tools).
4. Compiles the TypeScript project into the `dist/` folder.
5. Automatically patches and installs `beatnik-hardware.service` to systemd based on your current installation directory.

---

## 🔄 Updating the Service

To make future updates completely seamless for production environments (Method 1), the repository includes an `update.sh` script. 

Whenever a new version (`vX.X.X`) is tagged and pushed to GitHub, an automated CI/CD pipeline (GitHub Actions) instantly builds a new release artifact. You can easily pull this update onto your Raspberry Pi.

**How to Update:**
Simply run the included update script from your Pi:
```bash
# Assuming the script is in your installation directory
cd /opt/beatnik-hardware-api
./update.sh
```

**What the update script does:**
1. Queries the GitHub API for the latest release of `byrdsandbytes/beatnik-hardware-api`.
2. Downloads the new `beatnik-hardware-api.tar.gz` artifact.
3. Automatically stops the `beatnik-hardware.service`.
4. Extracts the new files over the existing installation.
5. Runs `npm install --omit=dev` to sync any new dependencies.
6. Restarts the system service and cleans up the downloaded archive.



---

## 🛠 Checking Service Status

Regardless of which method you chose, you can always check if the API is running smoothly via:
```bash
sudo systemctl status beatnik-hardware.service
```

You can also test the hardware status endpoint:
```bash
curl http://localhost:3000/api/hardware/status
```