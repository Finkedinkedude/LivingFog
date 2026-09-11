# Changelog

## 0.1.2

- Fixed committed merge-conflict markers which prevented the module manifest and script from loading.
- Applied the opaque Living Fog material to Foundry's persistent-vision shader variant instead of falling back to map-derived explored fog.
- Tightened shader-source validation so injection only occurs when each supported marker occurs exactly once.

## 0.1.1

- Fixed map artwork bleeding through fogged areas.
- Reworked fog rendering so explored and unexplored hidden regions use independent opaque fog colors.
- Added a shader enable uniform so disabling the module restores Foundry's stock fog composition immediately.
- Updated setting labels and documentation to reflect opaque fog behavior.
- Added a guard for Foundry's persistent-vision shader path.

## 0.1.0

- Initial prototype.
- Added procedural animated variation to Foundry's fog coloration.
