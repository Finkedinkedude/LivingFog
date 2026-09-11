# Living Fog - Agent Handoff

Read this file before changing the module.

## Project goal

Living Fog is a very small Foundry VTT v14 module for an in-person tabletop setup. The table uses Foundry for maps, tokens, vision, walls, fog, HP, initiative, and visual reminders, but deliberately avoids rules automation and digital dice workflows.

The purpose of this module is purely visual: make hidden fog-of-war areas feel alive instead of being dead flat black.

Repository: https://github.com/Finkedinkedude/LivingFog
Module id: `living-fog`
Current local development version in this project: `0.1.1`
Target Foundry version: v14, currently verified against the v14.365 API layout.

## Non-negotiable behavior

Do not change Foundry's game logic.

Living Fog must not:

- change line of sight;
- change wall collision;
- reveal or hide tokens itself;
- alter token vision ranges;
- write or reset fog exploration data;
- automate D&D rules;
- place a global weather overlay across currently visible areas.

Foundry remains authoritative for where vision exists. Living Fog only changes how hidden regions are rendered.

## Critical bug history

### v0.1.0 - wrong rendering approach

The first prototype injected procedural noise by brightening Foundry's existing fog coloration. On the user's real map this made the underlying map artwork visible through vision-blocking walls. Tokens behind walls remained hidden, but rooms, floors, and other scene artwork bled through. That was unacceptable.

Do not return to an implementation that makes hidden fog partially transparent or derives the animated pattern from underlying map pixels.

### v0.1.1 - current approach

The current code builds independent explored and unexplored fog colors with alpha `1.0`, applies procedural noise to those colors, and uses Foundry's existing visibility mask to cut out currently visible regions.

The intended composition is:

1. Foundry determines visible/explored/unexplored regions.
2. Hidden regions get an opaque procedural fog material.
3. Visible regions remain the normal map.
4. Hidden map artwork must contribute zero visible detail to the fog material.

The user should be able to put a room behind a vision-blocking wall and see no floor, wall art, props, or other map texture from that room until Foundry vision reveals it.

## Current implementation

Main code: `scripts/living-fog.mjs`

The module patches:

`foundry.canvas.rendering.filters.VisibilityFilter._createFragmentShader`

It looks for known shader-source markers and injects a small procedural FBM/noise function and custom fog composition.

Important implementation requirements:

- Fail closed. If the expected Foundry shader source changes, leave the stock shader untouched and log a warning.
- Keep the module dependency-free unless there is a strong reason not to.
- Do not monkey-patch unrelated Foundry systems.
- Prefer one narrow rendering hook over a pile of hooks.
- Persistent-vision mode is currently bypassed deliberately because it uses a different composition path. Do not casually remove that guard without testing that path.

## Current settings

World settings:

- Enable Living Fog
- Fog Movement Speed
- Fog Scale
- Unexplored Fog Texture Strength
- Explored Fog Texture Strength

Defaults are intentionally subtle because this is displayed on a physical gaming table.

## Known limitations / likely next work

The procedural pattern is currently screen-space. Panning the scene can make the fog feel attached to the monitor instead of existing in the dungeon.

The most likely next feature is world-space anchoring so the player pans through the fog rather than dragging the map underneath a screen-space texture.

Before implementing that, preserve all visibility guarantees from v0.1.1. World-space coordinates must never weaken masking or allow scene artwork to bleed through hidden regions.

Other possible later improvements:

- directional drift;
- softness/contrast controls;
- better differentiation between explored and never-explored fog while remaining opaque;
- per-scene overrides instead of only world settings;
- several restrained fog presets.

Avoid turning the module into a general weather-effects package.

## How to test changes

Testing from the GM view alone is not sufficient. Foundry can present fog differently to a GM and a player.

Use the actual player/table client with Token Vision enabled.

Minimum stress test:

1. Put a player-owned token in room A.
2. Put room B behind a vision-blocking wall or closed door.
3. Place obvious artwork and a token in room B.
4. Confirm room B's map artwork is completely hidden by opaque animated fog.
5. Confirm the room-B token is hidden according to Foundry.
6. Open the door or move into LOS.
7. Confirm Foundry immediately reveals the correct area.
8. Close/move away and verify the configured explored-fog behavior.
9. Pan and zoom to look for coordinate or mask artifacts.
10. Watch GPU/FPS behavior on the actual table machine.

Any visual evidence from the hidden map is a regression even if hidden tokens remain hidden.

## Versioning and publishing

When bumping versions, update all relevant places together:

- `module.json` -> `version`
- `module.json` -> version inside the `download` release URL
- `scripts/living-fog.mjs` -> `VERSION`
- `CHANGELOG.md`

Manifest URL is stable:

`https://raw.githubusercontent.com/Finkedinkedude/LivingFog/main/module.json`

Release asset convention:

- Git tag: `vX.Y.Z`
- Release asset filename: `living-fog.zip`
- Download URL: `https://github.com/Finkedinkedude/LivingFog/releases/download/vX.Y.Z/living-fog.zip`

The release ZIP must have `module.json` at the archive root, not inside an extra parent directory.

The VS Code task **Living Fog: Build release ZIP from HEAD** creates `dist/living-fog.zip` from the committed `HEAD`. Commit first, then build the release ZIP.

## Git setup in this bundle

This downloadable project intentionally does not contain another machine's `.git` directory.

Run the VS Code task **Living Fog: Connect GitHub repository** once. It initializes Git if necessary, fetches `origin/main`, and attaches the current working tree to the actual GitHub history without overwriting the local v0.1.1 files. After that, VS Code Source Control can commit and push normally.

## User preferences for this project

Keep solutions practical and minimal. The user wants the visual result to work at a physical table, not an elaborate framework. Do not propose rules automation as a workaround. When a rendering bug is visible in screenshots, fix the rendering method rather than hiding it with weaker default settings.
