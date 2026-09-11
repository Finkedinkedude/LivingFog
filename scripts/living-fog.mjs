const MODULE_ID = "living-fog";
const VERSION = "0.3.0";

const SETTINGS = {
  enabled: "enabled",
  speed: "speed",
  scale: "scale",
  strength: "strength",
  exploredStrength: "exploredStrength",
  edgeStrength: "edgeStrength"
};

const state = {
  installedShaderPatch: false,
  tickerInstalled: false,
  shaderPatchMatched: false,
  filter: null,
  reportedUniformFailure: false,
  enabled: true,
  speed: 0.12,
  scale: 3.2,
  strength: 0.075,
  exploredStrength: 0.03,
  edgeStrength: 0.65
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
  const initialized = applyUniforms();
  if (state.enabled && !initialized && !state.reportedUniformFailure) {
    state.reportedUniformFailure = true;
    ui.notifications.error("Living Fog could not initialize its visibility shader. Check the browser console.");
    console.error(`${MODULE_ID} | The active VisibilityFilter does not expose the Living Fog uniforms.`);
  }
});

Hooks.on("sightRefresh", () => {
  applyUniforms();
});

function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.enabled, {
    name: "Enable Living Fog",
    hint: "Add animated texture and flowing edges over Foundry's flat fog. Vision, walls, and fog exploration are unchanged.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true,
    onChange: value => {
      state.enabled = value;
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

  game.settings.register(MODULE_ID, SETTINGS.edgeStrength, {
    name: "Fog Edge Flow",
    hint: "Makes fog curl inward over the visible side of vision boundaries. This never retracts fog into hidden areas.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 1, step: 0.05 },
    default: 0.65,
    onChange: value => {
      state.edgeStrength = value;
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
  state.edgeStrength = game.settings.get(MODULE_ID, SETTINGS.edgeStrength);
}

function patchVisibilityShader() {
  if (state.installedShaderPatch) return;

  const VisibilityFilter = foundry?.canvas?.rendering?.filters?.VisibilityFilter;
  if (!VisibilityFilter?._createFragmentShader) {
    console.error(`${MODULE_ID} | Foundry v14 VisibilityFilter._createFragmentShader was not found.`);
    return;
  }

  const original = VisibilityFilter._createFragmentShader.bind(VisibilityFilter);
  const originalCreate = VisibilityFilter.create;

  VisibilityFilter._createFragmentShader = function(options = {}) {
    if (!state.enabled) return original(options);

    // Use Foundry's flat-color fog path as the base. The persistent-vision path
    // derives explored fog from the map, which an animated overlay must never do.
    let source = original({ ...options, persistentVision: false });
    const uniformMarker = "uniform vec3 unexploredColor;";
    const resolutionUniform = "uniform vec2 screenDimensions;";
    const compositionMarker = "vec4 fow = mix(unexplored, explored, max(r,v));";

    if ((countOccurrences(source, uniformMarker) !== 1) || (countOccurrences(source, compositionMarker) !== 1)) {
      console.warn(`${MODULE_ID} | Visibility shader layout was not recognized; Living Fog was not injected.`);
      return original(options);
    }

    const fogShaderCode = `
${uniformMarker}
${source.includes(resolutionUniform) ? "" : resolutionUniform}
uniform float uLivingFogTime;
uniform float uLivingFogScale;
uniform float uLivingFogStrength;
uniform float uLivingFogExploredStrength;
uniform float uLivingFogEdgeStrength;

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
vec2 lfResolution = max(screenDimensions, vec2(1.0));
vec2 lfUv = gl_FragCoord.xy / lfResolution;
vec2 lfPosition = lfUv * uLivingFogScale;
vec2 lfDrift = vec2(0.22, 0.11) * uLivingFogTime;

// Domain warping makes the fog continuously evolve instead of translating one
// static cloud image across the screen.
float lfWarpX = lfFbm((lfPosition * 0.55) + lfDrift + vec2(2.7, 8.1));
float lfWarpY = lfFbm((lfPosition * 0.55) - (lfDrift * 0.73) + vec2(9.4, 1.6));
vec2 lfWarp = (vec2(lfWarpX, lfWarpY) - vec2(0.5)) * 1.15;
float lfBase = lfFbm(lfPosition + lfDrift + lfWarp);
float lfDetail = lfFbm((lfPosition * 1.9) - (lfDrift * 0.68) - (lfWarp * 0.42) + vec2(4.2, 9.7));
float lfPulse = 0.5 + (0.5 * sin((uLivingFogTime * 0.85) + (lfBase * 3.14159)));
float lfPattern = smoothstep(0.18, 0.84, mix(lfBase, lfDetail, 0.32) + ((lfPulse - 0.5) * 0.12));

// Hidden fog is constructed from black plus procedural brightness only. Neither
// Foundry's explored/unexplored colors nor its baseColor/map sample participates.
float lfExploration = clamp(r, 0.0, 1.0);
float lfTextureStrength = mix(uLivingFogStrength, uLivingFogExploredStrength, lfExploration);
float lfFogBrightness = clamp(0.012 + (lfPattern * lfTextureStrength), 0.0, 0.32);
vec3 lfFogRgb = vec3(lfFogBrightness);
vec4 fow = vec4(lfFogRgb, 1.0);

// Foundry already softens v at vision boundaries. Raising its threshold with
// animated noise can only reduce v, pushing fog inward over visible pixels. It
// never increases v and therefore can never reveal a hidden map pixel.
float lfEdgeThreshold = uLivingFogEdgeStrength * mix(0.18, 0.58, lfPattern);
float lfFlowingVision = smoothstep(lfEdgeThreshold, min(lfEdgeThreshold + 0.28, 0.96), v);
v *= mix(1.0, lfFlowingVision, uLivingFogEdgeStrength);`;

    source = source.replace(compositionMarker, fogComposition);
    state.shaderPatchMatched = true;
    return source;
  };

  VisibilityFilter.create = function(uniforms = {}, options = {}) {
    const filter = originalCreate.call(this, {
      uLivingFogTime: (performance.now() / 1000) * state.speed,
      uLivingFogScale: state.scale,
      uLivingFogStrength: state.strength,
      uLivingFogExploredStrength: state.exploredStrength,
      uLivingFogEdgeStrength: state.edgeStrength,
      ...uniforms
    }, options);

    state.filter = filter;
    return filter;
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
  const filter = getVisibilityFilter();
  if (!filter?.uniforms) return;

  const t = performance.now() / 1000;
  filter.uniforms.uLivingFogTime = t * state.speed;
  filter.uniforms.uLivingFogScale = state.scale;
  filter.uniforms.uLivingFogStrength = state.enabled ? state.strength : 0;
  filter.uniforms.uLivingFogExploredStrength = state.enabled ? state.exploredStrength : 0;
  filter.uniforms.uLivingFogEdgeStrength = state.enabled ? state.edgeStrength : 0;
}

function applyUniforms() {
  const filter = getVisibilityFilter();
  if (!filter?.uniforms || !("uLivingFogEdgeStrength" in filter.uniforms)) return false;

  filter.uniforms.uLivingFogTime = (performance.now() / 1000) * state.speed;
  filter.uniforms.uLivingFogScale = state.scale;
  filter.uniforms.uLivingFogStrength = state.enabled ? state.strength : 0;
  filter.uniforms.uLivingFogExploredStrength = state.enabled ? state.exploredStrength : 0;
  filter.uniforms.uLivingFogEdgeStrength = state.enabled ? state.edgeStrength : 0;
  return true;
}

function getVisibilityFilter() {
  return state.filter ?? canvas?.visibility?.filter ?? null;
}
