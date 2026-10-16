# Beatnik Hardware API: Updating the Debian Package

Related guides: [Install](INSTALL_DEB.md) · [Uninstall](UNINSTALL_DEB.md)

## Update

1. Check the installed version:
   ```bash
   dpkg-query -W beatnik-hardware-api
   ```
2. Download the new `.deb` from the [releases page](https://github.com/byrdsandbytes/beatnik-hardware-api/releases/latest):
   ```bash
   VERSION=0.7.3   # replace with the new version
   wget https://github.com/byrdsandbytes/beatnik-hardware-api/releases/download/v${VERSION}/beatnik-hardware-api_${VERSION}_all.deb
   ```
3. Install it over the existing version:
   ```bash
   sudo apt-get install ./beatnik-hardware-api_${VERSION}_all.deb
   ```

dpkg replaces the files in `/opt/beatnik-hardware-api`, and the post-install script reloads systemd and restarts the service. No manual stop or start is needed.

## Verify

```bash
dpkg-query -W beatnik-hardware-api
sudo systemctl status beatnik-hardware.service
curl http://localhost:3000/api/hardware/status
```

## Your service file changes

The service file in `/etc/systemd/system` is treated by dpkg as a configuration file. If you edited it directly, dpkg asks whether to keep your version or install the new one. To avoid this, put customisations in a drop-in instead:

```bash
sudo systemctl edit beatnik-hardware.service
```

To skip the prompt and keep your edited file during an update, use:
```bash
sudo apt-get install -o Dpkg::Options::="--force-confold" ./beatnik-hardware-api_${VERSION}_all.deb
```

## Downgrade

Install an older `.deb` the same way. Add `--allow-downgrades`:
```bash
sudo apt-get install --allow-downgrades ./beatnik-hardware-api_<older-version>_all.deb
```

## Notes

- Updates are manual; the package does not add an apt repository.
- The in-app update route (`/api/update/api`) runs `setup.sh`, which belongs to the script install. Do not use it on a package install.
