# Living Fog

<<<<<<< HEAD
A small Foundry VTT v14 module that makes fog of war feel alive while leaving Foundry's walls, token vision, LOS, and fog exploration logic alone.

## v0.1.1

This release fixes the major rendering problem in v0.1.0: map detail could become visible through hidden areas because the first prototype modified Foundry's existing fog coloration.

v0.1.1 instead creates an **opaque animated fog material** for areas that are not currently visible.

- Currently visible areas remain normal Foundry vision.
- Unexplored areas are covered by opaque animated fog.
- Previously explored but currently unseen areas are also covered by opaque animated fog.
- Explored and unexplored fog can use different scene colors and different animation strengths.
- Tokens, walls, LOS, and fog exploration are not modified.
- Disabling Living Fog returns to Foundry's stock fog composition.

The module deliberately does **not** reveal map detail through the fog. Explored areas are distinguished by their fog color/texture rather than by showing the underlying map.

## Settings

- **Enable Living Fog**: toggles the custom fog material without changing fog data.
- **Fog Movement Speed**: controls drift speed.
- **Fog Scale**: controls the size of the procedural cloud forms.
- **Unexplored Fog Texture Strength**: controls animated contrast in unexplored fog.
- **Explored Fog Texture Strength**: controls animated contrast in explored-but-not-visible fog.

Recommended starting values:

- Movement Speed: `0.12`
- Fog Scale: `3.2`
- Unexplored Strength: `0.075`
- Explored Strength: `0.03`

## Testing

Test from the actual player/table client with Token Vision enabled. The GM view can differ from the player view.

A useful stress test is to place a token in one room, put another room behind a vision-blocking wall, and verify that:

1. the second room's map artwork is not visible;
2. tokens in that room remain hidden according to Foundry;
3. the fog pattern still animates;
4. opening a door immediately reveals the correct area.

## Implementation

Foundry v14 uses `foundry.canvas.rendering.filters.VisibilityFilter` to composite visible, explored, and unexplored regions. Living Fog wraps `_createFragmentShader` and replaces only the fog-color composition step.

The important difference from v0.1.0 is that Living Fog no longer modifies the RGB values of Foundry's already-composited fog. It builds two independent opaque colors from `unexploredColor` and `exploredColor`, applies procedural noise to those colors, and then lets Foundry's existing current-vision mask make visible areas transparent.

The procedural pattern is currently screen-space. World-space anchoring is planned for a later version.

### Fog of War image note

While Living Fog is enabled, its procedural material takes precedence over the scene's Fog of War Image in hidden regions. This is intentional for the current test build because the module's priority is guaranteeing that no map pixels bleed through the fog.

## Compatibility

Target: Foundry VTT 14.x, verified against the v14.365 API layout.

The module patches a shader source string. If Foundry changes that internal shader layout, Living Fog fails closed: it leaves the stock shader unchanged and logs a warning to the browser console.
=======
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
>>>>>>> origin/main
