# beatnik-hardware-api

Microservice for managing audio hardware, Snapcast, and system settings on a Raspberry Pi for the Beatnik Audio System.

- **Hardware:** Detects and configures Audio HATs (e.g. HiFiBerry) by writing `/boot/firmware/config.txt` and the active CamillaDSP config.
- **Snapcast:** Enable/disable/restart the Snapserver and Snapclient.
- **System:** Query system info and trigger reboots.

## Installation

See the [Installation & Updating Guide](INSTALL.md) for setup, updates, and systemd configuration. To remove the service, see the [Uninstall Guide](UNINSTALL.md). Prefer `apt`? See the Debian package guides: [Install](INSTALL_DEB.md), [Update](UPDATING_DEB.md), [Uninstall](UNINSTALL_DEB.md). Developers: see [Build from Source](BUILD_FROM_SOURCE.md).

## API

Base URL: `http://localhost:3000`

### Hardware (`/api/hardware`)
| Method | Path | Description |
|---|---|---|
| GET | `/status` | Current & detected HAT, active CamillaDSP config |
| GET | `/hats` | List supported HATs |
| POST | `/apply` | Apply a HAT: `{ "hatId": "hifiberry-amp" }` |
| GET | `/camilla/configs` | List CamillaDSP config files |
| GET | `/camilla/configs/default` | Get the active CamillaDSP config |
| PUT | `/camilla/configs/default` | Set the active config: `{ "fileName": "..." }` |
| GET | `/camilla/preamp/configs` | List preamp CamillaDSP config files (`~/camilladsp/preamp`) |
| GET | `/camilla/preamp/configs/default` | Get the active preamp config |
| PUT | `/camilla/preamp/configs/default` | Set the active preamp config and restart the preamp service: `{ "fileName": "vinyl.yml" }` |
| POST | `/reboot` | Reboot the Pi |

`/status` also returns `preampConfigFile` (`null` if no preamp instance is set up). The preamp instance works like the main one: the active config is the symlink `client_config.yml` in its config folder, which the preamp service must use as its config file. HAT settings are not applied to it.

### System (`/api/system`)
| Method | Path | Description |
|---|---|---|
| GET | `/info` | System information |
| POST | `/reboot` | Reboot the Pi |

### Snapcast (`/api/snapcast`)
| Method | Path | Description |
|---|---|---|
| GET | `/status` | Snapserver/Snapclient status |
| POST | `/enable` | Enable Snapserver |
| POST | `/disable` | Disable Snapserver |
| POST | `/restart-server` | Restart Snapserver |
| POST | `/restart-client` | Restart Snapclient |

### Update (`/api/update`)
Updates run in the background (`202 Accepted`); poll `/status`. Only one update runs at a time (`409` otherwise). `bleno` and `api` require the Debian package to be installed (`404` otherwise); the controller and CamillaDSP repositories are expected in `$BEATNIK_HOME` (default `/home/beatnik`).

| Method | Path | Description |
|---|---|---|
| GET | `/status` | `{ busy, targets[] }` – state and log tail of the last update per target |
| POST | `/bleno` | Install the latest `beatnik-bleno` `.deb` release with apt (skipped if already up to date) |
| POST | `/controller` | `docker compose pull` + `docker compose up -d` in `~/beatnik-controller` (recreates the container if the image changed). Without a `docker-compose.yml` it only runs `docker pull` on the image of the `beatnik-controller` container |
| POST | `/camilladsp` | `git pull --ff-only origin master` in `~/camilladsp` |
| POST | `/api` | Install the latest `beatnik-hardware-api` `.deb` release with apt in a transient systemd unit (the service restarts) |
| POST | `/all` | All of the above in order, API last |

Optional env vars: `BEATNIK_USER`, `BEATNIK_HOME`, `CONTROLLER_CONTAINER`, `CONTROLLER_IMAGE`. See `examples/update.service.ts` for an Angular client.

Example:
```bash
curl -X POST http://localhost:3000/api/hardware/apply \
  -H "Content-Type: application/json" \
  -d '{"hatId": "hifiberry-amp"}'
```

Applying a HAT or reboot requires a subsequent reboot to take effect on `config.txt` changes.

## Local Development

Test without a Pi by pointing the service at local files:

```bash
touch test-config.txt
mkdir -p test-camilla-configs
touch test-camilla-configs/profile-a.yml
ln -sf ./test-camilla-configs/profile-a.yml test-camilla.yml

CONFIG_PATH=./test-config.txt CAMILLA_CONFIG_DIR=./test-camilla-configs CAMILLA_CONFIG_PATH=./test-camilla.yml npm run dev
```

## Notes

- Applying a HAT overwrites `config.txt` and the active CamillaDSP config; back up existing configs before use.
- Release artifacts are built automatically via GitHub Actions on version tags (see [Releases](https://github.com/byrdsandbytes/beatnik-hardware-api/releases)).
