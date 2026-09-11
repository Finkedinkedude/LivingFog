const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const hooks = { once: {}, on: {} };
const shaderSource = `
uniform vec2 screenDimensions;
uniform vec3 unexploredColor;
void main() {
  float r = 0.0;
  float v = 0.0;
  vec4 unexplored = vec4(0.0);
  vec4 explored = vec4(0.0);
  vec4 fow = mix(unexplored, explored, max(r,v));
}
`;

class VisibilityFilter {
  static _createFragmentShader(options = {}) {
    this.lastShaderOptions = options;
    return options.unsupported ? "void main() {}" : shaderSource;
  }

  static create(uniforms = {}, options = {}) {
    return {
      uniforms: { ...uniforms },
      fragmentShader: this._createFragmentShader(options)
    };
  }
}

const settings = new Map();
const context = {
  console,
  performance: { now: () => 1000 },
  Hooks: {
    once: (name, callback) => { hooks.once[name] = callback; },
    on: (name, callback) => { hooks.on[name] = callback; }
  },
  game: {
    settings: {
      register: (_module, key, config) => settings.set(key, config.default),
      get: (_module, key) => settings.get(key)
    }
  },
  foundry: { canvas: { rendering: { filters: { VisibilityFilter } } } },
  canvas: { app: { ticker: { add: () => {} } }, visibility: {} },
  ui: {
    notifications: {
      error: message => { throw new Error(message); },
      info: () => {}
    }
  }
};

const moduleSource = fs.readFileSync("scripts/living-fog.mjs", "utf8");
vm.runInNewContext(moduleSource, context, { filename: "living-fog.mjs" });
hooks.once.init();

const normalFilter = VisibilityFilter.create({}, {});
assert.equal(normalFilter.uniforms.uLivingFogScale, 3.2);
assert.equal(normalFilter.uniforms.uLivingFogEdgeStrength, 0.65);
assert.equal(VisibilityFilter.lastShaderOptions.persistentVision, false);
assert.match(normalFilter.fragmentShader, /vec4 fow = mix\(unexplored, explored, lfExploration\)/);
assert.match(normalFilter.fragmentShader, /fow\.rgb = clamp/);
assert.match(normalFilter.fragmentShader, /v \*= mix\(1\.0, lfFlowingVision, uLivingFogEdgeStrength\)/);
assert.doesNotMatch(normalFilter.fragmentShader, /lfStockFow|lfLivingFow|lfUnexploredFog/);

const persistentFilter = VisibilityFilter.create({}, { persistentVision: true });
assert.equal(persistentFilter.uniforms.uLivingFogEdgeStrength, 0.65);
assert.equal(VisibilityFilter.lastShaderOptions.persistentVision, false);
assert.match(persistentFilter.fragmentShader, /fow\.rgb = clamp/);

const unsupportedFilter = VisibilityFilter.create({}, { unsupported: true });
assert.equal(unsupportedFilter.fragmentShader, "void main() {}");

hooks.on.canvasReady();
assert.equal(persistentFilter.uniforms.uLivingFogEdgeStrength, 0.65);

console.log("Living Fog shader initialization tests passed.");
