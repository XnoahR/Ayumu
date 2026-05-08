# Ayumu Desktop Bridge

This add-on exposes a small localhost bridge so the Ayumu web app can inspect your local Anki deck metadata while Anki is running.

## Install

1. Copy or symlink this `anki-addon` folder into your Anki `addons21` directory as `ayumu_bridge`.
2. Restart Anki.
3. Open Ayumu in the browser and go to your profile page.
4. Use the Desktop Anki panel to test the bridge.

## Notes

- The bridge binds to `127.0.0.1` only.
- Only origins listed in `config.json` are allowed.
- The bridge is read-only in this prototype.
- If Ayumu runs from a different origin, update `allowed_origins` in the add-on config and restart Anki.
