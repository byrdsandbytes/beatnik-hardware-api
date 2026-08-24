# beatnik-hardware-api

A lightweight microservice that manages audio hardware configuration on a Raspberry Pi for the Beatnik Audio System.

This service allows you to configure Audio HATs (like HiFiBerry DACs/Amps) via a simple HTTP API. It automatically handles:

- **System Overlays:** Adjusting `/boot/firmware/config.txt` (or `/boot/config.txt`) to load the correct drivers.
- **Audio Engine Routing:** Adjusting CamillaDSP config files in `/home/beatnik/camilladsp/configs/`.
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

## 🚀 Installation & Updating

To quickly install the production service on a Raspberry Pi:

```bash
wget https://raw.githubusercontent.com/byrdsandbytes/beatnik-hardware-api/master/setup.sh
chmod +x setup.sh
./setup.sh
```

To view the full guide for installing the service (both Production & Source workflows) and how to run automated updates, please check out the **[Installation & Updating Guide](INSTALL.md)**.

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
  "isMatch": false,
  "camillaConfigFile": "profile-a.yml"
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
  "message": "Configuration applied. CamillaDSP restarted. Reboot required.",
  "camillaRestarted": true,
  "rebootRequired": true
}
```

### List Available CamillaDSP Configs
Lists selectable config files from `/home/beatnik/camilladsp/configs/`.

```bash
curl http://localhost:3000/api/hardware/camilla/configs
```

### Get Current Default CamillaDSP Config
Returns the active default file (usually the symlink target of `client_config.yml`).

```bash
curl http://localhost:3000/api/hardware/camilla/configs/default
```

### Set Default CamillaDSP Config
Switches `client_config.yml` to another config file in `/home/beatnik/camilladsp/configs/`.
The service restarts CamillaDSP automatically after switching.

```bash
curl -X PUT http://localhost:3000/api/hardware/camilla/configs/default \
  -H "Content-Type: application/json" \
  -d '{"fileName": "my_profile.yml"}'
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
mkdir -p test-camilla-configs
touch test-camilla-configs/profile-a.yml
touch test-camilla-configs/profile-b.yml
ln -sf ./test-camilla-configs/profile-a.yml test-camilla.yml
```

**Start the server in dev mode with environment variables:**
```bash
# Linux / Mac
CONFIG_PATH=./test-config.txt CAMILLA_CONFIG_DIR=./test-camilla-configs CAMILLA_CONFIG_PATH=./test-camilla.yml npm run dev
```
The server is now running and writes changes to your local test files instead of `/boot/config.txt`.

## 📦 Automated Releases (CI/CD)

This repository is configured with GitHub Actions to automatically generate pre-built release artifacts. Whenever a new version tag (e.g., `v0.6.0`) is pushed:

1. The project is built from source.
2. A `beatnik-hardware-api.tar.gz` archive is created (containing the compiled `dist/` directory, `package.json`, and `package-lock.json`).
3. The archive is uploaded automatically to the [GitHub Releases](https://github.com/byrdsandbytes/beatnik-hardware-api/releases) page.

This allows you to bypass the build step on the Raspberry Pi. You can simply download the release artifact, extract it to `/opt/beatnik-hardware-api`, run `npm ci --omit=dev` to install production dependencies, and start the service.

## ⚠️ Important Notes

- **Overwriting Configurations:** This service overwrites parts of `/boot/firmware/config.txt` and the active CamillaDSP config (default: `/home/beatnik/camilladsp/configs/client_config.yml`). Manual changes to audio settings in these files may be lost.
- **Backup:** The service tries to be "gentle", but it is always advisable to have backups of your working configuration files.
