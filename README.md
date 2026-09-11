# Living Fog

A small Foundry VTT v14 module that adds subtle procedural motion to fog of war while leaving Foundry's vision, walls, and fog exploration behavior untouched.

## Current scope

Version 0.1.0 intentionally does one thing only: it modifies the coloration stage of Foundry's v14 `VisibilityFilter`.

It does **not**:

- change line of sight;
- change wall collision;
- reveal or hide areas;
- write to fog exploration;
- automate any game rules;
- add weather across visible parts of the map.

## Installation for local testing

Copy or symlink this repository into your Foundry user-data modules directory as:

```text
Data/modules/living-fog
```

The folder name must match the module id in `module.json`.

Restart Foundry, enable **Living Fog** in the world, then open **Configure Settings > Module Settings**.

## Recommended first settings

- Enable Living Fog: on
- Fog Movement Speed: `0.12`
- Fog Scale: `3.2`
- Unexplored Fog Strength: `0.075`
- Explored Fog Strength: `0.03`

For an in-person table, keep the movement slow. The intention is that the darkness feels alive when you notice it, not that the fog calls attention to itself.

## Important testing note

Foundry GMs do not always see the same fog presentation as a player. Test the effect from the same player/table client you actually use during a session, with Token Vision enabled and a token that has vision.

## How it works

Foundry v14 uses `foundry.canvas.rendering.filters.VisibilityFilter` to composite visible, explored, and unexplored areas. Living Fog wraps the filter's fragment-shader factory before the canvas is drawn and injects a lightweight procedural noise function.

The generated noise only changes the RGB value used for Foundry's fog coloration. Foundry's own visibility mask remains responsible for deciding where fog exists.

The animation is screen-space in v0.1.0. This is deliberate for the first test build because it avoids interfering with scene transforms, levels, and LOS. A later version can anchor the noise to scene/world coordinates if the screen-space motion is noticeable while panning.

## Compatibility

Target: Foundry VTT 14.x.

This module patches a shader source string. That keeps the module extremely small, but it also means a Foundry update that changes the internal shader source can make the patch stop matching. If that happens, Living Fog fails closed: Foundry's normal fog remains and a warning is written to the browser console.

## Publishing

For local development, `module.json` intentionally has no `url`, `manifest`, or `download` fields.

When the repository URL is known, add release URLs such as:

```json
"url": "https://github.com/OWNER/REPOSITORY",
"manifest": "https://github.com/OWNER/REPOSITORY/releases/latest/download/module.json",
"download": "https://github.com/OWNER/REPOSITORY/releases/download/v0.1.0/living-fog.zip"
```

A release zip should contain `module.json`, `README.md`, and the `scripts` folder at the root of the archive.
