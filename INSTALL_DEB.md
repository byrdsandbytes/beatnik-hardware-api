# Beatnik Hardware API: Debian Package Install

Each GitHub release ships a `beatnik-hardware-api_<version>_all.deb` package. It installs the API with its production dependencies, registers the systemd service, and starts it. No `npm`, NVM, or `setup.sh` is needed on the Pi.

Related guides: [Updating](UPDATING_DEB.md) · [Uninstalling](UNINSTALL_DEB.md) · [Script-based install](INSTALL.md)

## What the package installs

| Path | Content |
|------|---------|
| `/opt/beatnik-hardware-api/` | `dist/`, `node_modules/`, `package.json` |
| `/opt/beatnik-hardware-api/camilladsp/` | Bundled CamillaDSP configs; copied on start to `/var/lib/beatnik-hardware-api/camilladsp` (existing files are kept) |
| `/etc/systemd/system/beatnik-hardware.service` | systemd unit (runs `/usr/bin/node dist/server.js` as root) |
| `/etc/systemd/system/camilladsp.service` | CamillaDSP unit, using `/usr/local/bin/camilladsp` and the config in `/var/lib/beatnik-hardware-api/camilladsp/configs/client_config.yml` |

CamillaDSP itself must be installed at `/usr/local/bin/camilladsp`; the package only provides its service and configs. Without the binary, `camilladsp.service` keeps restarting but the API still works.

## Prerequisites

- Raspberry Pi OS (Bookworm or newer recommended) with `sudo` access.
- A **system** Node.js 22 or newer at `/usr/bin/node`. The package depends on `nodejs (>= 22.0.0)`; a Node.js installed through NVM does not satisfy this.

Check what you have:
```bash
node --version
which node   # must be /usr/bin/node
```

If Node.js 22 is missing, install it from NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Install

1. Download the latest `.deb` from the [releases page](https://github.com/byrdsandbytes/beatnik-hardware-api/releases/latest), for example:
   ```bash
   VERSION=0.7.2   # replace with the latest version
   wget https://github.com/byrdsandbytes/beatnik-hardware-api/releases/download/v${VERSION}/beatnik-hardware-api_${VERSION}_all.deb
   ```
2. Install it with `apt` so dependencies are resolved:
   ```bash
   sudo apt-get install ./beatnik-hardware-api_${VERSION}_all.deb
   ```

The post-install script reloads systemd, enables the service on boot, and starts it.

## Coming from the script install?

The script install (`setup.sh`) and the package use the same service name. Remove the old install first so the two do not conflict:

```bash
sudo systemctl stop beatnik-hardware.service
rm -rf ~/beatnik-hardware-api
```

Then install the package as above; it replaces the old service file.

## Verify

```bash
sudo systemctl status beatnik-hardware.service
curl http://localhost:3000/api/hardware/status
```

Logs:
```bash
journalctl -u beatnik-hardware.service -f
```

## Notes

- The in-app update routes (`/api/update/api`) run `setup.sh` and are meant for the script install. On a package install, update with the steps in the [Updating guide](UPDATING_DEB.md).
- Edit the service (for example to set `CONFIG_PATH`) with `sudo systemctl edit beatnik-hardware.service`; overrides survive package upgrades.
