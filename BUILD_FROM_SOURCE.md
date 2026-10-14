# Beatnik Hardware API: Build from Source

This guide is for developers who want to build, run, and modify the Beatnik Hardware API from source. For a regular production install, use the [Installation & Updating Guide](INSTALL.md) instead.

---

## Prerequisites

- **Node.js 22** and npm (see [INSTALL.md](INSTALL.md#installing-nodejs-via-nvm) for installing via NVM)
- **Git**
- Optional: a Raspberry Pi running Raspberry Pi OS (Bookworm or newer) for testing against real hardware. The API can also run on macOS/Linux with test files (see [Run Locally Without a Pi](#run-locally-without-a-pi)).

## 1. Get the Source

```bash
git clone https://github.com/byrdsandbytes/beatnik-hardware-api.git
cd beatnik-hardware-api
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Project Layout

```text
src/
  server.ts          Fastify entry point (port 3000), route registration, mDNS start/stop
  routes/            HTTP routes: audio (/api/hardware), system, snapcast, update
  services/          Business logic: config.txt, CamillaDSP, HAT detection, mDNS, updates
  types/hats.ts      Supported audio HATs
examples/            Angular client examples for the API
setup.sh             Production installer/updater (downloads the release artifact)
beatnik-hardware.service   systemd unit template
```

## 4. Run in Development Mode

```bash
npm run dev
```

This starts the server with `ts-node-dev` (auto-restart on file changes, type checking skipped) on `http://0.0.0.0:3000`.

Check that it is running:
```bash
curl http://localhost:3000/api/system/info
```

### Run Locally Without a Pi

By default the API reads and writes system files such as `/boot/firmware/config.txt` and `/home/beatnik/camilladsp/configs`. To develop on any machine, point it at local files:

```bash
touch test-config.txt
mkdir -p test-camilla-configs
touch test-camilla-configs/profile-a.yml
ln -sf ./test-camilla-configs/profile-a.yml test-camilla.yml

CONFIG_PATH=./test-config.txt \
CAMILLA_CONFIG_DIR=./test-camilla-configs \
CAMILLA_CONFIG_PATH=./test-camilla.yml \
npm run dev
```

Anything that needs `systemctl`, `docker`, or Avahi (Snapcast, update routes, mDNS) will fail or log errors on a machine without them; this is expected. Never run the update routes on a development machine, as they run `setup.sh`, `git pull`, and `docker pull` against `$HOME`.

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `CONFIG_PATH` | `/boot/firmware/config.txt` | Raspberry Pi boot config |
| `CAMILLA_CONFIG_DIR` | `/home/beatnik/camilladsp/configs` | CamillaDSP config directory |
| `CAMILLA_CONFIG_PATH` | `<CAMILLA_CONFIG_DIR>/client_config.yml` | Active CamillaDSP config (symlink) |
| `CAMILLA_SERVICE_NAME` | `camilladsp` | systemd service restarted after config changes |
| `CAMILLA_PREAMP_CONFIG_DIR` | `/home/beatnik/camilladsp/preamp` | Preamp CamillaDSP config directory |
| `CAMILLA_PREAMP_CONFIG_PATH` | `<CAMILLA_PREAMP_CONFIG_DIR>/client_config.yml` | Active preamp config (symlink) |
| `CAMILLA_PREAMP_SERVICE_NAME` | `camilladsp-preamp` | systemd service restarted after preamp config changes |
| `AVAHI_SERVICE_DIR` | `/etc/avahi/services` | Where the mDNS service file is written |
| `BEATNIK_USER` | `beatnik` | User that owns the Beatnik repositories (update routes) |
| `BEATNIK_HOME` | `/home/<BEATNIK_USER>` | Directory containing the Beatnik repositories (update routes) |
| `CONTROLLER_CONTAINER` | `beatnik-controller` | Docker container name (update routes) |
| `CONTROLLER_IMAGE` | read from container | Docker image to pull (update routes) |

## 5. Build

Compile TypeScript to `dist/`:

```bash
npm run build
```

Run the compiled build:
```bash
npm start
```

To only type-check without emitting files:
```bash
npx tsc --noEmit
```

## 6. Install the Build as a Service on a Pi

Build on the Pi (or copy the project there), then:

```bash
npm install
npm run build

# Copy the service file
sudo cp beatnik-hardware.service /etc/systemd/system/

# IMPORTANT: Edit the service file so WorkingDirectory points to your project
# directory and ExecStart points to your Node.js executable (find it with: which node)
sudo nano /etc/systemd/system/beatnik-hardware.service

sudo systemctl daemon-reload
sudo systemctl enable beatnik-hardware.service
sudo systemctl start beatnik-hardware.service
```

The service runs as `root` because it writes to `/boot/firmware/config.txt`. Follow the logs with:
```bash
sudo journalctl -u beatnik-hardware.service -f
```

> **Note:** Running `./setup.sh` replaces your source build with the latest GitHub release. Don't use it (or the `/api/update/api` route) on a development install.

## 7. Create a Release Package

`npm run pack-pi` builds the project and creates `beatnik-hardware-api.tar.gz` containing `dist`, `package.json`, `package-lock.json`, `beatnik-hardware.service`, and `setup.sh`. This is the artifact that `setup.sh` installs on devices.

```bash
npm run pack-pi
```

To try the package on a Pi without publishing a release, copy it over and extract it:
```bash
scp beatnik-hardware-api.tar.gz beatnik@<pi-hostname>:~/
ssh beatnik@<pi-hostname>
mkdir -p ~/beatnik-hardware-api && tar -xzf ~/beatnik-hardware-api.tar.gz -C ~/beatnik-hardware-api
cd ~/beatnik-hardware-api && npm install --omit=dev
```
Then set up the systemd service as in step 6.

### Publishing a Release

Releases are built by GitHub Actions (`.github/workflows/release.yml`) whenever a tag starting with `v` is pushed. The workflow runs `npm ci` and `npm run pack-pi`, then attaches `beatnik-hardware-api.tar.gz` to the GitHub release.

```bash
# 1. Bump the version in package.json (also shown via mDNS)
npm version patch   # or minor / major; creates a commit and a vX.Y.Z tag

# 2. Push the commit and the tag
git push && git push --tags
```

Devices pick up the new release the next time they run `setup.sh` (or the update route).

## Uninstalling

See the [Uninstall Guide](UNINSTALL.md).
