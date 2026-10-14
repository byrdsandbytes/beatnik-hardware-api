# Beatnik Hardware API: Uninstall Guide

This guide reverses the steps in the [Installation & Updating Guide](INSTALL.md) and removes the Beatnik Hardware API from your Raspberry Pi. It applies to both installation methods (production setup script and manual source install), since both use the same install directory and systemd service.

> **Note:** Uninstalling only removes the API. Changes the API previously made to your system (see [Optional: Revert Hardware Changes](#optional-revert-hardware-changes)) are **not** reverted automatically.

---

## 1. Stop and Disable the Service

```bash
sudo systemctl stop beatnik-hardware.service
sudo systemctl disable beatnik-hardware.service
```

## 2. Remove the systemd Service File

```bash
sudo rm /etc/systemd/system/beatnik-hardware.service
sudo systemctl daemon-reload
sudo systemctl reset-failed
```

Verify the service is gone (this should report `could not be found`):
```bash
sudo systemctl status beatnik-hardware.service
```

## 3. Remove the mDNS (Avahi) Advertisement

The API advertises itself as `_beatnik._tcp` through an Avahi service file. It is normally removed when the service stops cleanly, but remove it manually to be sure:

```bash
sudo rm -f /etc/avahi/services/beatnik-hardware.service
```

Avahi picks up the change automatically; no restart is needed.

## 4. Delete the Installation Directory

This removes the API, its `node_modules`, and `setup.sh`:

```bash
rm -rf ~/beatnik-hardware-api
```

Also remove any leftover temporary files from the in-app updater (only present if you used the update routes):
```bash
rm -f /tmp/beatnik-api-update.sh
```

## 5. Verify the Removal

```bash
# Should print nothing
systemctl list-unit-files | grep beatnik-hardware

# Should fail to connect
curl http://localhost:3000/api/hardware/status
```

---

## Optional: Remove Node.js and NVM

The setup script installs NVM and Node.js 22 if they were missing. **Only remove them if nothing else on the Pi uses them** — other Beatnik components such as `beatnik-bleno` also run on Node.js.

Remove only Node.js 22 (keeps NVM):
```bash
source ~/.nvm/nvm.sh
nvm deactivate
nvm uninstall 22
```

Remove NVM completely:
```bash
rm -rf ~/.nvm
```
Then delete the NVM lines (`NVM_DIR` and `nvm.sh` / `bash_completion`) from `~/.bashrc` (and `~/.profile` / `~/.zshrc` if present), and open a new shell.

---

## Optional: Revert Hardware Changes

If you applied an audio HAT through the API, it modified these files. Uninstalling does not undo that:

- **`/boot/firmware/config.txt`** – HAT overlay settings (e.g. `dtoverlay=hifiberry-...`). Edit it and remove or restore the lines you no longer want, then reboot:
  ```bash
  sudo nano /boot/firmware/config.txt
  sudo reboot
  ```
- **CamillaDSP configuration** – the output device in `camilladsp.yml` and the default config symlink (`~/camilladsp/configs/client_config.yml`) were changed to match the HAT. Restore your own backup, or reset the repository if it was untouched otherwise:
  ```bash
  cd ~/camilladsp
  git status
  git checkout -- .   # discards local changes; only run this if you have no changes to keep
  sudo systemctl restart camilladsp
  ```

Other Beatnik components (`beatnik-bleno`, `beatnik-controller`, `camilladsp`) are **not** touched by the uninstall and keep working independently.
