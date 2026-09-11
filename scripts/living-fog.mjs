const MODULE_ID = "living-fog";
const VERSION = "0.1.2";

const SETTINGS = {
  enabled: "enabled",
  speed: "speed",
  scale: "scale",
  strength: "strength",
  exploredStrength: "exploredStrength"
};

const state = {
  installedShaderPatch: false,
  tickerInstalled: false,
  shaderPatchMatched: false,
  enabled: true,
  speed: 0.12,
  scale: 3.2,
  strength: 0.075,
  exploredStrength: 0.03
};

Hooks.once("init", () => {
  registerSettings();
  readSettings();
  patchVisibilityShader();
});

Hooks.once("ready", () => {
  readSettings();
  installTicker();
  console.info(`${MODULE_ID} | Living Fog v${VERSION} ready.`);
});

Hooks.on("canvasReady", () => {
  applyUniforms();
});

Hooks.on("sightRefresh", () => {
  applyUniforms();
});

function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.enabled, {
    name: "Enable Living Fog",
    hint: "Replace hidden fog areas with an opaque animated fog material. Vision, walls, and fog exploration are unchanged.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      state.enabled = value;
      applyUniforms();
    }
  });

  game.settings.register(MODULE_ID, SETTINGS.speed, {
    name: "Fog Movement Speed",
    hint: "How quickly the fog drifts. Low values are recommended for a tabletop display.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 1, step: 0.01 },
    default: 0.12,
    onChange: value => {
      state.speed = value;
      applyUniforms();
    }
  });

  game.settings.register(MODULE_ID, SETTINGS.scale, {
    name: "Fog Scale",
    hint: "Size of the moving fog forms. Lower values create broader clouds; higher values create finer detail.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0.5, max: 10, step: 0.1 },
    default: 3.2,
    onChange: value => {
      state.scale = value;
      applyUniforms();
    }
  });

  game.settings.register(MODULE_ID, SETTINGS.strength, {
    name: "Unexplored Fog Texture Strength",
    hint: "Brightness variation inside completely unexplored fog. The fog remains opaque; this only changes the animated texture.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 0.2, step: 0.005 },
    default: 0.075,
    onChange: value => {
      state.strength = value;
      applyUniforms();
    }
  });

  game.settings.register(MODULE_ID, SETTINGS.exploredStrength, {
    name: "Explored Fog Texture Strength",
    hint: "Brightness variation in previously explored areas which are not currently visible. These areas remain opaque while Living Fog is enabled.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 0.2, step: 0.005 },
    default: 0.03,
    onChange: value => {
      state.exploredStrength = value;
      applyUniforms();
    }
  });
}

function readSettings() {
  state.enabled = game.settings.get(MODULE_ID, SETTINGS.enabled);
  state.speed = game.settings.get(MODULE_ID, SETTINGS.speed);
  state.scale = game.settings.get(MODULE_ID, SETTINGS.scale);
  state.strength = game.settings.get(MODULE_ID, SETTINGS.strength);
  state.exploredStrength = game.settings.get(MODULE_ID, SETTINGS.exploredStrength);
}

function patchVisibilityShader() {
  if (state.installedShaderPatch) return;

  const VisibilityFilter = foundry?.canvas?.rendering?.filters?.VisibilityFilter;
  if (!VisibilityFilter?._createFragmentShader) {
    console.error(`${MODULE_ID} | Foundry v14 VisibilityFilter._createFragmentShader was not found.`);
    return;
  }

  const original = VisibilityFilter._createFragmentShader.bind(VisibilityFilter);

  VisibilityFilter._createFragmentShader = function(options = {}) {
    let source = original(options);
    const uniformMarker = "uniform vec3 unexploredColor;";
    const compositionMarker = "vec4 fow = mix(unexplored, explored, max(r,v));";

    if ((countOccurrences(source, uniformMarker) !== 1) || (countOccurrences(source, compositionMarker) !== 1)) {
      console.warn(`${MODULE_ID} | Visibility shader layout was not recognized; Living Fog was not injected.`);
      return source;
    }

    const fogShaderCode = `
${uniformMarker}
uniform float uLivingFogEnabled;
uniform float uLivingFogTime;
uniform float uLivingFogScale;
uniform float uLivingFogStrength;
uniform float uLivingFogExploredStrength;

float lfHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float lfNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = lfHash(i);
  float b = lfHash(i + vec2(1.0, 0.0));
  float c = lfHash(i + vec2(0.0, 1.0));
  float d = lfHash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float lfFbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.55;

  value += amplitude * lfNoise(p);
  p = p * 2.03 + vec2(11.7, 5.3);
  amplitude *= 0.5;

  value += amplitude * lfNoise(p);
  p = p * 2.01 + vec2(7.1, 13.9);
  amplitude *= 0.5;

  value += amplitude * lfNoise(p);
  return value;
}
`;

    source = source.replace(uniformMarker, fogShaderCode);

    const fogComposition = `
// Preserve Foundry's stock fog composition so disabling Living Fog restores the
// original appearance without requiring the visibility shader to be rebuilt.
vec4 lfStockFow = mix(unexplored, explored, max(r,v));

vec2 lfResolution = max(screenDimensions, vec2(1.0));
vec2 lfUv = gl_FragCoord.xy / lfResolution;
vec2 lfDrift = vec2(0.071, 0.037) * uLivingFogTime;

float lfBase = lfFbm((lfUv * uLivingFogScale) + lfDrift);
float lfDetail = lfFbm((lfUv * (uLivingFogScale * 1.85)) - (lfDrift * 0.63) + vec2(4.2, 9.7));
float lfPattern = smoothstep(0.20, 0.82, mix(lfBase, lfDetail, 0.35));
float lfCentered = (lfPattern - 0.50) * 2.0;

// Important: these colors are created independently from the map/primary texture.
// Both explored and unexplored fog are fully opaque. This prevents map detail from
// bleeding through walls while still allowing the fog material itself to move.
vec3 lfUnexploredRgb = clamp(unexploredColor + vec3(lfCentered * uLivingFogStrength), 0.0, 1.0);
vec3 lfExploredRgb = clamp(exploredColor + vec3(lfCentered * uLivingFogExploredStrength), 0.0, 1.0);
vec4 lfUnexploredFog = vec4(lfUnexploredRgb, 1.0);
vec4 lfExploredFog = vec4(lfExploredRgb, 1.0);
vec4 lfLivingFow = mix(lfUnexploredFog, lfExploredFog, max(r,v));

vec4 fow = mix(lfStockFow, lfLivingFow, step(0.5, uLivingFogEnabled));`;

    source = source.replace(compositionMarker, fogComposition);
    state.shaderPatchMatched = true;
    return source;
  };

  state.installedShaderPatch = true;
  console.info(`${MODULE_ID} | Visibility shader patch installed.`);
}

function countOccurrences(source, marker) {
  return source.split(marker).length - 1;
}

function installTicker() {
  if (state.tickerInstalled) return;
  if (!canvas?.app?.ticker) {
    console.error(`${MODULE_ID} | Canvas ticker is unavailable.`);
    return;
  }

  canvas.app.ticker.add(updateAnimation);
  state.tickerInstalled = true;
}

function updateAnimation() {
  const filter = canvas?.visibility?.filter;
  if (!filter?.uniforms) return;

  const t = performance.now() / 1000;
  filter.uniforms.uLivingFogEnabled = state.enabled ? 1 : 0;
  filter.uniforms.uLivingFogTime = t * state.speed;
  filter.uniforms.uLivingFogScale = state.scale;
  filter.uniforms.uLivingFogStrength = state.strength;
  filter.uniforms.uLivingFogExploredStrength = state.exploredStrength;
}

function applyUniforms() {
  const filter = canvas?.visibility?.filter;
  if (!filter?.uniforms) return;

  filter.uniforms.uLivingFogEnabled = state.enabled ? 1 : 0;
  filter.uniforms.uLivingFogTime = (performance.now() / 1000) * state.speed;
  filter.uniforms.uLivingFogScale = state.scale;
  filter.uniforms.uLivingFogStrength = state.strength;
  filter.uniforms.uLivingFogExploredStrength = state.exploredStrength;
}
