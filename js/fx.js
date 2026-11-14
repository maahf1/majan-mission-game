// Post-processing: HDR render with MSAA, soft bloom, tone mapping, then a final
// pass with slight chromatic aberration, vignette and film grain.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.045 },
    uVignette: { value: 0.42 },
    uCA: { value: 0.0016 },
    uFlash: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVignette, uCA, uFlash;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + d * uCA).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - d * uCA).b;
      col += (hash(vUv * 1000.0 + fract(uTime) * 61.0) - 0.5) * uGrain;
      col *= 1.0 - uVignette * r2 * 1.7;
      col += vec3(0.55, 0.85, 1.0) * uFlash; // whip-transition flash (video only)
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

export class FX {
  constructor(renderer, { samples = 4 } = {}) {   // samples: 0 on phones, where 4x anti-aliasing costs too much
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x || 1, size.y || 1, { type: THREE.HalfFloatType, samples });
    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    // Only bright highlights glow (flames, lenses, holograms)
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.4, 0.92);
    this.final = new ShaderPass(FinalShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.final);
  }

  setSize(w, h) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
  }

  render(scene, camera, time) {
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    this.final.uniforms.uTime.value = time;
    this.composer.render();
  }
}
