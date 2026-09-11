# Changelog

## 0.3.0

- Removed Foundry's map-derived `explored`, `unexplored`, `fogColor`, and `baseColor` values from the Living Fog output.
- Hidden output is now always an independent black procedural color with alpha `1.0`; only Foundry's current-vision mask can make it transparent.
- Replaced simple cloud translation with animated domain-warped FBM and time-based evolution so the fog visibly moves and changes shape.
- Retained flowing boundaries that only push fog inward and cannot expose hidden pixels.

## 0.2.1

- Fixed the v0.2.0 fragment shader compile failure by explicitly declaring its `screenDimensions` uniform when Foundry's flat-color shader does not declare it.
- Removed the premature success notification which appeared before the GPU compiled the shader.
- Updated the regression fixture to match the actual flat-color shader and cover the missing declaration.

## 0.2.0

- Replaced the opaque replacement-material approach with Foundry's stock flat-color fog plus an independent procedural brightness overlay.
- Force the non-persistent, flat-color fog shader while Living Fog is enabled so explored fog never derives its appearance from map pixels.
- Added animated flowing fog edges which only push fog inward over visible pixels and can never reveal hidden pixels.
- Added the **Fog Edge Flow** world setting.

## 0.1.3

- Initialize the custom shader uniforms when Foundry creates `VisibilityFilter`, preventing WebGL's zero defaults from silently selecting stock explored fog.
- Keep a direct reference to the created filter instead of relying only on a canvas property lookup.
- Show an explicit error when the active filter does not contain the Living Fog uniforms.

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
