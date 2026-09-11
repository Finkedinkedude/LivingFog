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
  ui: { notifications: { error: message => { throw new Error(message); } } }
};

const moduleSource = fs.readFileSync("scripts/living-fog.mjs", "utf8");
vm.runInNewContext(moduleSource, context, { filename: "living-fog.mjs" });
hooks.once.init();

const normalFilter = VisibilityFilter.create({}, {});
assert.equal(normalFilter.uniforms.uLivingFogEnabled, 1);
assert.equal(normalFilter.uniforms.uLivingFogScale, 3.2);
assert.match(normalFilter.fragmentShader, /vec4 lfUnexploredFog = vec4\(lfUnexploredRgb, 1\.0\)/);
assert.match(normalFilter.fragmentShader, /vec4 lfExploredFog = vec4\(lfExploredRgb, 1\.0\)/);

const persistentFilter = VisibilityFilter.create({}, { persistentVision: true });
assert.equal(persistentFilter.uniforms.uLivingFogEnabled, 1);
assert.match(persistentFilter.fragmentShader, /vec4 lfLivingFow/);

const unsupportedFilter = VisibilityFilter.create({}, { unsupported: true });
assert.equal(unsupportedFilter.fragmentShader, "void main() {}");

hooks.on.canvasReady();
assert.equal(persistentFilter.uniforms.uLivingFogEnabled, 1);

console.log("Living Fog shader initialization tests passed.");
