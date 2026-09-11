# Living Fog

A small Foundry VTT v14 module that makes fog of war feel alive while leaving Foundry's walls, token vision, LOS, and fog exploration logic alone.

## v0.2.0

Living Fog keeps Foundry's normal flat-color fog as the base and draws procedural brightness variation over that fog. While enabled, it does not use Foundry's map-derived persistent-vision rendering path.

- Currently visible areas remain normal Foundry vision.
- Unexplored areas are covered by opaque animated fog.
- Previously explored but currently unseen areas are also covered by opaque animated fog.
- Explored and unexplored fog can use different scene colors and different animation strengths.
- Tokens, walls, LOS, and fog exploration are not modified.
- Disabling Living Fog returns to Foundry's stock fog composition.

The module deliberately does not reveal map detail through the fog. Explored areas are distinguished by their fog color and texture rather than by showing the underlying map.

## Settings

- **Enable Living Fog**: toggles the custom fog material without changing fog data.
- **Fog Movement Speed**: controls drift speed.
- **Fog Scale**: controls the size of the procedural cloud forms.
- **Unexplored Fog Texture Strength**: controls animated contrast in unexplored fog.
- **Explored Fog Texture Strength**: controls animated contrast in explored-but-not-visible fog.
- **Fog Edge Flow**: controls animated curls extending inward onto the visible side of fog boundaries. It never retracts fog into hidden space.

Recommended starting values:

- Movement Speed: `0.12`
- Fog Scale: `3.2`
- Unexplored Strength: `0.075`
- Explored Strength: `0.03`
- Fog Edge Flow: `0.65`

## Installation for local testing

Copy or symlink this repository into your Foundry user-data modules directory as:

```text
Data/modules/living-fog
```

The folder name must match the module id in `module.json`. Restart Foundry, enable **Living Fog** in the world, and reload the player/table browser client.

## Testing

Test from the actual player/table client with Token Vision enabled. The GM view can differ from the player view.

A useful stress test is to place a token in one room, put another room behind a vision-blocking wall, and verify that:

1. the second room's map artwork is not visible;
2. tokens in that room remain hidden according to Foundry;
3. the fog pattern still animates;
4. opening a door immediately reveals the correct area;
5. closing the door or moving away restores opaque fog.

## Implementation

Foundry v14 uses `foundry.canvas.rendering.filters.VisibilityFilter` to composite visible, explored, and unexplored regions. Living Fog wraps `_createFragmentShader` and replaces only the fog-color composition step.

The module forces Foundry's normal flat-color fog shader while enabled and adds procedural brightness only after Foundry has constructed that fog color. The generated texture never samples the underlying map or primary texture.

For flowing boundaries, Living Fog only reduces Foundry's softened current-vision value near the edge. This allows fog to curl inward over a narrow strip of visible pixels but mathematically cannot increase visibility or expose hidden pixels.

Living Fog supplies its custom uniform values when Foundry creates the visibility filter. If those uniforms are unavailable on the active filter, the module displays an error instead of silently falling back to stock explored fog.

The procedural pattern is currently screen-space. World-space anchoring is planned for a later version.

### Fog of War image note

While Living Fog is enabled, its procedural material takes precedence over the scene's Fog of War Image in hidden regions. This is intentional because the module's priority is guaranteeing that no map pixels bleed through the fog.

## Compatibility

Target: Foundry VTT 14.x, verified against the v14.365 API layout.

## Publishing

The release ZIP must contain `module.json`, `README.md`, and the `scripts` folder at the archive root. See `AGENTS.md` for the complete versioning and release procedure.
