# Beatnik Hardware API: Uninstalling the Debian Package

Related guides: [Install](INSTALL_DEB.md) · [Update](UPDATING_DEB.md)

> **Note:** Uninstalling only removes the API. Changes the API made to your system (HAT overlay in `/boot/firmware/config.txt`, CamillaDSP configuration) are **not** reverted. See [Optional: Revert Hardware Changes](UNINSTALL.md#optional-revert-hardware-changes).

## Remove

```bash
sudo apt-get remove beatnik-hardware-api
```

The pre-removal script stops and disables the service, and the package files in `/opt/beatnik-hardware-api` are deleted. The service file in `/etc/systemd/system` is a configuration file, so `remove` keeps it. The same applies to `camilladsp.service`.

## Purge (remove including configuration)

```bash
sudo apt-get purge beatnik-hardware-api
sudo systemctl daemon-reload
sudo systemctl reset-failed
```

`purge` also deletes `/etc/systemd/system/beatnik-hardware.service` and `camilladsp.service`. Your CamillaDSP configs in `/var/lib/beatnik-hardware-api/camilladsp` are kept; delete that folder to remove them. Any drop-in overrides in `/etc/systemd/system/beatnik-hardware.service.d/` are not managed by the package, so delete them if you no longer want them:

```bash
sudo rm -rf /etc/systemd/system/beatnik-hardware.service.d
```

## Remove leftovers

The API advertises itself over Avahi. It normally removes this file on a clean stop; remove it manually to be sure:

```bash
sudo rm -f /etc/avahi/services/beatnik-hardware.service
```

## Verify

```bash
dpkg -l beatnik-hardware-api            # should report no matching packages, or state "rc" after remove
systemctl list-unit-files | grep beatnik-hardware   # should print nothing after purge
ls /opt/beatnik-hardware-api             # should not exist
curl http://localhost:3000/api/hardware/status       # should fail to connect
```

## Node.js

The package does not install Node.js. Other Beatnik components such as `beatnik-bleno` also use it, so only remove it if nothing else needs it:

```bash
sudo apt-get remove nodejs
```
