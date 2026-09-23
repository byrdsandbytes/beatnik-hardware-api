# beatnik-hardware-api

Microservice for managing audio hardware, Snapcast, and system settings on a Raspberry Pi for the Beatnik Audio System.

- **Hardware:** Detects and configures Audio HATs (e.g. HiFiBerry) by writing `/boot/firmware/config.txt` and the active CamillaDSP config.
- **Snapcast:** Enable/disable/restart the Snapserver and Snapclient.
- **System:** Query system info and trigger reboots.

## Installation

See the [Installation & Updating Guide](INSTALL.md) for setup, updates, and systemd configuration.

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
| POST | `/reboot` | Reboot the Pi |

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
