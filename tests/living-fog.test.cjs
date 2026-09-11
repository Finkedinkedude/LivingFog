const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const hooks = { once: {}, on: {} };
const shaderSource = `
uniform vec3 unexploredColor;
void main() {
  float r = 0.0;
  float v = 0.0;
  vec4 unexplored = vec4(0.0);
  vec4 explored = vec4(0.0);
  vec4 fow = mix(unexplored, explored, max(r,v));
  gl_FragColor = mix(fow, vec4(0.0), v);
  gl_FragColor.rgb *= gl_FragColor.a;
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
assert.equal(normalFilter.fragmentShader.match(/uniform vec2 screenDimensions;/g)?.length, 1);
assert.match(normalFilter.fragmentShader, /vec4 fow = vec4\(lfFogRgb, 1\.0\)/);
assert.match(normalFilter.fragmentShader, /float lfWarpX = lfFbm/);
assert.match(normalFilter.fragmentShader, /float lfPulse = .+uLivingFogTime/);
assert.match(normalFilter.fragmentShader, /v \*= mix\(1\.0, lfFlowingVision, uLivingFogEdgeStrength\)/);
assert.match(normalFilter.fragmentShader, /gl_FragColor = mix\(fow, vec4\(0\.0\), v\)/);
assert.doesNotMatch(normalFilter.fragmentShader, /vec4 fow = mix\(unexplored, explored|lfStockFow|lfLivingFow|lfUnexploredFog/);

const persistentFilter = VisibilityFilter.create({}, { persistentVision: true });
assert.equal(persistentFilter.uniforms.uLivingFogEdgeStrength, 0.65);
assert.equal(VisibilityFilter.lastShaderOptions.persistentVision, false);
assert.match(persistentFilter.fragmentShader, /vec4 fow = vec4\(lfFogRgb, 1\.0\)/);

const unsupportedFilter = VisibilityFilter.create({}, { unsupported: true });
assert.equal(unsupportedFilter.fragmentShader, "void main() {}");

hooks.on.canvasReady();
assert.equal(persistentFilter.uniforms.uLivingFogEdgeStrength, 0.65);

console.log("Living Fog shader initialization tests passed.");
