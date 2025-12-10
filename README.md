# beatnik-hardware-api

A lightweight microservice that manages audio hardware configuration on a Raspberry Pi for the Beatnik Audio System.

This service allows you to configure Audio HATs (like HiFiBerry DACs/Amps) via a simple HTTP API. It automatically handles:

- **System Overlays:** Adjusting `/boot/firmware/config.txt` (or `/boot/config.txt`) to load the correct drivers.
- **Audio Engine Routing:** Adjusting `/etc/camilladsp/default.yml` so CamillaDSP uses the correct output device.
- **Hardware Detection:** Automatically reading HAT EEPROMs to identify connected hardware.

## 📋 Prerequisites

Before you begin, ensure the following software is installed on your Raspberry Pi:

- Raspberry Pi OS (Bookworm or newer recommended)
- Node.js (Version 18 or newer)
- Root Privileges (`sudo`), as system files need to be edited.

### Node.js Installation (via NVM recommended)

We recommend installation via `nvm` (Node Version Manager) as it offers more flexibility than system packages.

**Install NVM:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
```

**Install Node.js:**
```bash
nvm install 20
nvm use 20
```

## 🚀 Quick Installation (Recommended)

You can install the entire service (including Node.js, dependencies, and systemd setup) with a single script.

```bash
wget https://raw.githubusercontent.com/byrdsandbytes/beatnik-hardware-api/master/setup.sh
chmod +x setup.sh
./setup.sh
```

Follow the prompts on the screen. The script will ask for your `sudo` password to install the system service.

## 🛠 Manual Installation

If you prefer to install everything manually, follow these steps:

### 1. Clone Repository
We recommend installing in the `/opt/` directory.

```bash
cd /opt
sudo git clone https://github.com/byrdsandbytes/beatnik-hardware-api.git
cd beatnik-hardware-api
```

### 2. Install Dependencies
Since we are using `nvm`, run `npm` without `sudo`.

```bash
npm install
```

### 3. Build Project
```bash
npm run build
```

## ⚙️ Setup as System Service (Manual)

If you didn't use the setup script:

### 1. Copy Service File
```bash
sudo cp beatnik-hardware.service /etc/systemd/system/
```
**Important:** Adjust the `ExecStart` path in `/etc/systemd/system/beatnik-hardware.service` to point to your Node.js executable (find it with `which node`).

### 2. Enable and Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable beatnik-hardware.service
sudo systemctl start beatnik-hardware.service
```

### 3. Check Status
```bash
sudo systemctl status beatnik-hardware.service
```
If everything is green (`active (running)`), the server is running on port 3000.

## 🧪 Testing the API

You can test the service directly from the Pi or from another computer on the network.

### Detect Hardware & Get Status
Shows the currently configured card and (if present) the automatically detected hardware.

```bash
curl http://localhost:3000/api/hardware/status
```

**Example Response:**
```json
{
  "currentConfig": { "id": "none", "name": "No HAT..." },
  "detectedHardware": { "id": "hifiberry-amp", "name": "HiFiBerry Amp2..." },
  "isMatch": false
}
```

### List All Supported HATs
```bash
curl http://localhost:3000/api/hardware/hats
```

### Apply a New HAT (Write Configuration)
This rewrites `config.txt` and `camilladsp.yml`.

```bash
curl -X POST http://localhost:3000/api/hardware/apply \
     -H "Content-Type: application/json" \
     -d '{"hatId": "hifiberry-amp"}'
```

**Response:**
```json
{
  "status": "success",
  "message": "Configuration applied. Reboot required.",
  "rebootRequired": true
}
```

### System Reboot
A reboot is required to make changes to `config.txt` effective.

```bash
curl -X POST http://localhost:3000/api/hardware/reboot
```

## 🛠️ Development & Local Testing

You can test the service on your laptop without a Pi. The service uses environment variables to override paths to system files.

**Create dummy files for testing:**
```bash
touch test-config.txt
touch test-camilla.yml
```

**Start the server in dev mode with environment variables:**
```bash
# Linux / Mac
CONFIG_PATH=./test-config.txt CAMILLA_CONFIG_PATH=./test-camilla.yml npm run dev
```
The server is now running and writes changes to your local test files instead of `/boot/config.txt`.

## ⚠️ Important Notes

- **Overwriting Configurations:** This service overwrites parts of `/boot/firmware/config.txt` and `/etc/camilladsp/default.yml`. Manual changes to audio settings in these files may be lost.
- **Backup:** The service tries to be "gentle", but it is always advisable to have backups of your working configuration files.
