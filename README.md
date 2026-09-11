# Living Fog

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
