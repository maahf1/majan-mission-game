// Orbit scene in a holographic style: a globe of glowing dots (land from NASA's
// Earth map), Oman in amber, the satellite on its orbit with a trail, a camera
// beam and data packets streaming down to Oman. Game logic lives in sim.js.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MissionSim } from './missionsim.js';

// NASA Visible Earth ocean mask (bright = water), as shipped with the three.js examples (saved copy)
const LAND_MASK = 'assets/earth_specular_2048.jpg';
const R = 10;
const OMAN = { lat: 21, lon: 57 };
const HOURS_PER_SEC = 0.6; // simulated hours per second at normal speed
// How each orbit looks: radius (exaggerated), and the tilt of its plane.
// tilt 0 = over the poles (sun-synchronous is nearly polar); larger = closer to the equator.
const ORBIT_LOOK = {
  leo: { r: 12.3, tilt: 0.67 },   // like the ISS, 51.6 degrees
  sso: { r: 13.4, tilt: -0.14 },  // 98 degrees, over the poles
  high: { r: 15.4, tilt: 0.4 },
};
const AMBER = new THREE.Color(1.0, 0.71, 0.28);

// Rough outline of mainland Oman (lon, lat), good enough to colour the dots
const OMAN_POLY = [[56.3, 26.4], [56.4, 24.9], [57.1, 23.9], [58.7, 23.6], [59.8, 22.5], [59.3, 21.3], [58.6, 20.4],
  [57.8, 19.9], [57.7, 18.9], [56.6, 18.6], [55.4, 17.9], [53.1, 16.6], [52.0, 19.0], [55.0, 20.0], [55.6, 22.0],
  [55.2, 22.7], [56.0, 24.0], [55.9, 24.9], [56.1, 26.1]];

function inOman(lat, lon) {
  let inside = false;
  for (let i = 0, j = OMAN_POLY.length - 1; i < OMAN_POLY.length; j = i++) {
    const [xi, yi] = OMAN_POLY[i];
    const [xj, yj] = OMAN_POLY[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function latLonToVector(lat, lon, r) {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
}

const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));

export class OrbitScene {
  constructor(renderer) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x01040b);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 3000);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, enablePan: false, minDistance: 18, maxDistance: 70, enabled: false });
    this.speed = 1;
    this.time = 0;

    this.theta0 = Math.PI * 0.3;
    this._stars();
    this.sunUniform = { value: new THREE.Vector3(1, 0.3, 0.5).normalize() };
    this.globe = new THREE.Group();
    const om = latLonToVector(OMAN.lat, OMAN.lon, 1);
    this.globe.rotation.y = Math.atan2(-om.x, om.z); // Oman faces the starting camera
    this.scene.add(this.globe);
    this._ocean();
    this._grid();
    this._atmosphere();
    this._beacon();
    this.dotsReady = this._dots();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(8, 10, 14);
    this.sun = key;
    const rim = new THREE.DirectionalLight(0x4de8ff, 1.6);
    rim.position.set(-10, 2, -6);
    this.scene.add(key, rim);

    this._orbit();
    this._packets();
  }

  // -- Globe ------------------------------------------------------------------
  _stars() {
    const n = 3000;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(500 + Math.random() * 400);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfd8ff, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.8 })));
  }

  _ocean() {
    this.globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.995, 96, 64),
      new THREE.ShaderMaterial({
        uniforms: { uSun: this.sunUniform },
        vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
            vW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW; uniform vec3 uSun;
          void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
            float day = smoothstep(-0.15, 0.25, dot(vW, uSun));
            vec3 core = mix(vec3(0.002, 0.005, 0.014), vec3(0.03, 0.10, 0.19), day); vec3 rim = vec3(0.15, 0.75, 1.0);
            gl_FragColor = vec4(core + rim * f * (0.06 + 0.44 * day), 1.0); }`,
      })
    ));
  }

  _grid() {
    this.globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.003, 96, 64),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV;
          void main(){ vP = normalize(position); vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV;
          void main(){
            float lat = degrees(asin(clamp(vP.y,-1.0,1.0)));
            float lon = degrees(atan(-vP.z, vP.x));
            vec2 c = vec2(lat, lon) / 15.0;
            vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
            float line = 1.0 - min(min(g.x, g.y), 1.0);
            float facing = max(dot(vN, vV), 0.0);
            float a = line * 0.16 * smoothstep(0.0, 0.4, facing);
            gl_FragColor = vec4(vec3(0.3, 0.85, 1.0) * a, a);
          }`,
      })
    ));
  }

  _atmosphere() {
    this.scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.12, 64, 48),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uSun: this.sunUniform },
        vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
          void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
            vW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW; uniform vec3 uSun;
          void main(){ float k = pow(max(0.0, 0.62 - dot(vN, vV)), 3.0) * mix(0.18, 1.0, smoothstep(-0.35, 0.45, dot(vW, uSun)));
            gl_FragColor = vec4(vec3(0.12, 0.45, 0.9) * k, k); }`,
      })
    ));
  }

  async _dots() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = LAND_MASK;
    await img.decode();
    const W = 1024;
    const H = 512;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    const px = g.getImageData(0, 0, W, H).data;

    const N = 42000;
    const pos = [];
    const col = [];
    const sweep = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const cyan = new THREE.Color(0.35, 0.92, 1.0);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      const th = golden * i;
      const x = Math.cos(th) * rr;
      const z = Math.sin(th) * rr;
      const lat = THREE.MathUtils.radToDeg(Math.asin(y));
      const lon = THREE.MathUtils.radToDeg(Math.atan2(-z, x));
      const u = Math.floor(((lon + 180) / 360) * (W - 1));
      const v = Math.floor(((90 - lat) / 180) * (H - 1));
      if (px[(v * W + u) * 4] > 90) continue; // bright = ocean
      pos.push(x * R * 1.004, y * R * 1.004, z * R * 1.004);
      const c = inOman(lat, lon) ? AMBER : cyan;
      col.push(c.r, c.g, c.b);
      sweep.push((lon + 180) / 360);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aSweep', new THREE.Float32BufferAttribute(sweep, 1));
    this.dotMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uReveal: { value: 0 }, uSize: { value: 0.42 }, uTime: { value: 0 }, uSun: this.sunUniform },
      vertexShader: `
        attribute float aSweep; attribute vec3 color;
        uniform float uReveal, uSize; uniform vec3 uSun;
        varying vec3 vC; varying float vA;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * normalize(position));
          float facing = dot(n, normalize(-mv.xyz));
          float shown = smoothstep(uReveal - 0.04, uReveal - 0.005, aSweep) ;
          float edge = exp(-pow((aSweep - uReveal) * 60.0, 2.0));
          vA = (1.0 - shown) * smoothstep(-0.15, 0.35, facing) + edge * 1.5;
          float day = smoothstep(-0.2, 0.2, dot(normalize(mat3(modelMatrix) * position), uSun));
          vC = color * (1.0 + edge * 2.0) * mix(0.1, 1.0, day);
          gl_PointSize = uSize * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.1, d) * vA; gl_FragColor = vec4(vC * a, a); }`,
    });
    this.globe.add(new THREE.Points(geo, this.dotMat));
  }

  _beacon() {
    const p = latLonToVector(OMAN.lat, OMAN.lon, R * 1.01);
    const n = p.clone().normalize();
    this.omanLocal = p;
    this.beacon = new THREE.Group();
    this.beacon.position.copy(p);
    this.beacon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    this.globe.add(this.beacon);
    this.beaconRings = [0, 1, 2].map((i) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 48),
        new THREE.MeshBasicMaterial({ color: AMBER.clone().multiplyScalar(2.2), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      m.userData.phase = i / 3;
      this.beacon.add(m);
      return m;
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: AMBER.clone().multiplyScalar(3) }));
    this.beacon.add(core);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8),
      new THREE.MeshBasicMaterial({ color: AMBER.clone().multiplyScalar(2), transparent: true, opacity: 0.7 }));
    beam.rotation.x = Math.PI / 2;
    beam.position.z = 1.1;
    this.beacon.add(beam);
  }

  // -- Orbit, satellite, trail, packets ----------------------------------------
  _orbit() {
    this.plane = new THREE.Group();
    this.scene.add(this.plane);
    this.holder = new THREE.Group();
    this.plane.add(this.holder);
    this.beam = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 1.0), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.holder.add(this.beam);
    this._setOrbit('sso');

    // Trail behind the satellite
    this.trailN = 80;
    this.trailPos = new Float32Array(this.trailN * 3);
    const tcol = new Float32Array(this.trailN * 3);
    for (let i = 0; i < this.trailN; i++) {
      const k = 1 - i / this.trailN;
      tcol.set([0.3 * k * 2, 0.9 * k * 2, 1.0 * k * 2], i * 3);
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
    this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending }));
    this.scene.add(this.trail);
  }

  /** Ring radius and plane tilt for the chosen orbit; the shadowed part of the ring is drawn dimmer. */
  _setOrbit(id, sunFrac = 0.65) {
    const look = ORBIT_LOOK[id] || ORBIT_LOOK.sso;
    this.orbitR = look.r;
    this.plane.rotation.set(look.tilt, 0.72, 0);
    this.plane.updateMatrixWorld(true);
    // The sun must lie in the orbit plane so the shadow arc matches the simulation; pick the
    // in-plane direction closest to front-right of the camera, so the day/night line shows.
    const want = new THREE.Vector3(0.85, 0.3, 0.45).normalize().applyQuaternion(this.plane.quaternion.clone().invert());
    this.theta0 = Math.atan2(want.y, want.x) - Math.PI * sunFrac;
    if (this.ring) { this.plane.remove(this.ring); this.ring.geometry.dispose(); }
    const pts = [];
    const cols = [];
    for (let i = 0; i <= 240; i++) {
      const ph = i / 240;
      const a = this.theta0 + ph * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * look.r, Math.sin(a) * look.r, 0));
      const lit = ph < sunFrac ? 1 : 0.28;
      cols.push(0.3 * lit, 0.9 * lit, 1.0 * lit);
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.ring = new THREE.Line(g, new THREE.LineDashedMaterial({ vertexColors: true, dashSize: 0.5, gapSize: 0.35, transparent: true, opacity: 0.6 }));
    this.ring.computeLineDistances();
    this.plane.add(this.ring);
    const len = look.r - R;
    this.beam.geometry.dispose();
    this.beam.geometry = new THREE.ConeGeometry(1.0, len, 32, 1, true);
    this.beam.position.y = -len / 2;
    // The sun sits in the middle of the sunlit arc, so the satellite is in Earth's shadow
    // exactly when the simulation says so
    const ts = this.theta0 + Math.PI * sunFrac;
    const sunLocal = new THREE.Vector3(Math.cos(ts), Math.sin(ts), 0);
    this.sunUniform.value.copy(sunLocal.transformDirection(this.plane.matrixWorld));
    this.sun.position.copy(this.sunUniform.value).multiplyScalar(40);
  }

  _packets() {
    this.packets = [];
    const geo = new THREE.SphereGeometry(0.08, 10, 8);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: AMBER.clone().multiplyScalar(3) }));
      m.visible = false;
      this.scene.add(m);
      this.packets.push({ mesh: m, t: 1, from: new THREE.Vector3(), mid: new THREE.Vector3() });
    }
    this.packetTimer = 0;
  }

  // -- Mission flow ------------------------------------------------------------
  /** d: computeDesign(); mission; satModel: copy of the built satellite; cb: { onEvent, onDone } */
  start(d, mission, satModel, cb) {
    this.stop();
    this.sim = new MissionSim(d, mission);
    this.cb = cb;
    this.running = true;
    this.paused = false;
    this.finished = false;
    this.speed = 1;
    this._setOrbit(d.orb.id, d.orb.sun);
    this.intro = 0;
    satModel.scale.setScalar(0.3);
    this.satModel = satModel;
    this.holder.add(satModel);
    this.controls.enabled = true;
    this._placeCamera(0);
  }

  _placeCamera(k) {
    const lat = THREE.MathUtils.degToRad(OMAN.lat);
    const dist = 70 - (70 - 36) * easeOutExpo(k);
    this.camera.position.set(0, Math.sin(lat) * dist, Math.cos(lat) * dist);
    this.controls.target.set(0, 0, 0);
  }

  stop() {
    this.running = false;
    this.controls.enabled = false;
    if (this.satModel) this.holder.remove(this.satModel);
    this.satModel = null;
    this.packets.forEach((p) => { p.mesh.visible = false; p.t = 1; });
  }

  choose(choice) {
    const outcome = this.sim.choose(choice);
    this.paused = false;
    return outcome;
  }

  resize(w, h) {
    const a = w / h;
    this.camera.aspect = a;
    // Tall phone screens: widen the view so the whole orbit fits across, and move the
    // globe down so the HUD at the top does not cover it
    this.camera.fov = a < 1 ? Math.min(100, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(25)) / a))) : 42;
    if (a < 1) this.camera.setViewOffset(w, h, 0, -0.13 * h, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    this.time += dt;
    if (this.dotMat) {
      this.dotMat.uniforms.uReveal.value = Math.min(1.05, this.dotMat.uniforms.uReveal.value + dt * 0.45);
      this.dotMat.uniforms.uTime.value = this.time;
    }
    for (const r of this.beaconRings) {
      const k = (this.time * 0.6 + r.userData.phase) % 1;
      r.scale.setScalar(1 + k * 3);
      r.material.opacity = 1 - k;
    }
    if (!this.sim) return;
    const s = this.sim;

    // Intro fly-in
    if (this.intro < 1) {
      this.intro = Math.min(1, this.intro + dt / 2.2);
      this._placeCamera(this.intro);
    }

    if (this.running && !this.paused && !this.finished && this.intro > 0.6) {
      const hours = dt * this.speed * HOURS_PER_SEC;
      s.advance(hours);
      if (s.alive) this.globe.rotation.y += hours * 0.02;
      const e = s.pendingEvent;
      if (e) { this.paused = true; this.cb.onEvent?.(e); }
      else if (s.done) { this.finished = true; this.cb.onDone?.(s.results()); }
    }

    // Satellite on its orbit at the simulation's orbit phase, camera pointing down at Earth
    const angle = this.theta0 + s.phase * Math.PI * 2;
    const pos = new THREE.Vector3(Math.cos(angle) * this.orbitR, Math.sin(angle) * this.orbitR, 0);
    // In Earth's shadow the sunlight on the satellite fades out
    const want = s.inSun || !s.alive ? 2.4 : 0.25;
    this.sun.intensity += (want - this.sun.intensity) * Math.min(1, dt * 4);
    this.holder.position.copy(pos);
    this.holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), pos.clone().negate().normalize());
    if (this.satModel && !s.alive) this.satModel.rotation.x += dt * 0.7;
    this.beam.visible = s.cameraOn;
    this.beam.material.opacity = 0.1 + 0.05 * Math.sin(this.time * 6);

    // Trail: about a quarter orbit behind the satellite, worked out from the orbit phase
    // so it stays smooth at any speed or frame rate
    const world = this.holder.getWorldPosition(new THREE.Vector3());
    const tp = new THREE.Vector3();
    for (let i = 0; i < this.trailN; i++) {
      const a = this.theta0 + (s.phase - i * 0.0032) * Math.PI * 2;
      tp.set(Math.cos(a) * this.orbitR, Math.sin(a) * this.orbitR, 0).applyMatrix4(this.plane.matrixWorld);
      this.trailPos.set([tp.x, tp.y, tp.z], i * 3);
    }
    this.trail.geometry.attributes.position.needsUpdate = true;

    // Data packets fly to Oman while the antenna is sending and Oman is in view
    const omanWorld = this.globe.localToWorld(this.omanLocal.clone());
    const facing = world.clone().normalize().dot(omanWorld.clone().normalize());
    this.packetTimer -= dt;
    if (s.downlinkOn && facing > 0.1 && this.packetTimer <= 0 && !this.paused) {
      this.packetTimer = 0.12 / Math.min(this.speed, 2);
      const p = this.packets.find((q) => q.t >= 1);
      if (p) {
        p.t = 0;
        p.from.copy(world);
        p.mid.copy(world).add(omanWorld).multiplyScalar(0.5).normalize().multiplyScalar(this.orbitR * 1.05);
        p.mesh.visible = true;
      }
    }
    for (const p of this.packets) {
      if (p.t >= 1) continue;
      p.t = Math.min(1, p.t + dt / 0.9);
      const a = p.from.clone().lerp(p.mid, p.t);
      const b = p.mid.clone().lerp(omanWorld, p.t);
      p.mesh.position.copy(a.lerp(b, p.t));
      if (p.t >= 1) p.mesh.visible = false;
    }

    this.controls.update();
  }
}
