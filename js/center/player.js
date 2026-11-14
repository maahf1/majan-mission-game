// First-person player: mouse look (pointer lock), WASD + Shift, wall collisions,
// head bob, and touch controls (joystick + drag to look) on phones and tablets.
import * as THREE from 'three';

const EYE = 1.65;
const RADIUS = 0.35;
const WALK = 3.4;
const RUN = 6.0;

export class Player {
  constructor(camera, canvas, colliders) {
    this.camera = camera;
    this.canvas = canvas;
    this.colliders = colliders;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.touchMove = new THREE.Vector2();
    this.bob = 0;
    this.enabled = false;
    this.onStep = null;
    camera.rotation.order = 'YXZ';

    addEventListener('keydown', (e) => { this.keys.add(e.code); });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => this.keys.clear());
    this.lockedAt = 0;
    document.addEventListener('pointerlockchange', () => {
      this.lockedAt = performance.now();
      this.keys.clear();
    });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas || !this.enabled) return;
      // Chrome on Windows sometimes reports a huge jump right after locking or on
      // fast moves, which snapped the camera "by itself". Ignore those events.
      if (performance.now() - this.lockedAt < 150) return;
      if (Math.abs(e.movementX) > 200 || Math.abs(e.movementY) > 200) return;
      this.look(e.movementX, e.movementY, 0.0022);
    });
    this._touch();
  }

  get locked() { return document.pointerLockElement === this.canvas; }

  look(dx, dy, k) {
    this.yaw -= dx * k;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * k, -1.45, 1.45);
  }

  place(x, z, yaw = 0) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = 0;
  }

  forward() {
    return new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation);
  }

  _touch() {
    const stick = document.getElementById('stick');
    const knob = document.getElementById('knob');
    if (!stick) return;
    let stickId = null;
    let lookId = null;
    let last = null;
    const center = () => { const r = stick.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width / 2]; };
    stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== stickId) return;
      const [cx, cy, r] = center();
      const v = new THREE.Vector2(e.clientX - cx, e.clientY - cy);
      if (v.length() > r) v.setLength(r);
      knob.style.transform = `translate(${v.x}px, ${v.y}px)`;
      this.touchMove.set(v.x / r, v.y / r);
    });
    const end = (e) => { if (e.pointerId !== stickId) return; stickId = null; knob.style.transform = ''; this.touchMove.set(0, 0); };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    // Drag anywhere else on the canvas to look around
    this.canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; lookId = e.pointerId; last = [e.clientX, e.clientY]; });
    this.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId || !this.enabled) return;
      this.look(e.clientX - last[0], e.clientY - last[1], 0.005);
      last = [e.clientX, e.clientY];
    });
    this.canvas.addEventListener('pointerup', (e) => { if (e.pointerId === lookId) lookId = null; });
  }

  _blocked(x, z) {
    for (const c of this.colliders) {
      if (x > c.x0 - RADIUS && x < c.x1 + RADIUS && z > c.z0 - RADIUS && z < c.z1 + RADIUS) return true;
    }
    return false;
  }

  update(dt) {
    const k = this.keys;
    const input = new THREE.Vector2(
      (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0),
      (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0)
    );
    input.add(this.touchMove);
    if (input.length() > 1) input.normalize();
    if (!this.enabled) input.set(0, 0);
    const speed = k.has('ShiftLeft') || k.has('ShiftRight') || this.touchMove.length() > 0.93 ? RUN : WALK;   // phones: push the stick all the way to run
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const want = new THREE.Vector3(input.x * cos + input.y * sin, 0, -input.x * sin + input.y * cos).multiplyScalar(speed);
    this.vel.lerp(want, Math.min(1, dt * 10)); // smooth start and stop

    // Move one axis at a time so you slide along walls
    const nx = this.pos.x + this.vel.x * dt;
    if (!this._blocked(nx, this.pos.z)) this.pos.x = nx; else this.vel.x = 0;
    const nz = this.pos.z + this.vel.z * dt;
    if (!this._blocked(this.pos.x, nz)) this.pos.z = nz; else this.vel.z = 0;

    const moving = this.vel.length();
    const before = Math.sin(this.bob);
    this.bob += dt * moving * 2.6;
    if (moving > 0.5 && before < 0 && Math.sin(this.bob) >= 0) this.onStep?.();
    const bobY = moving > 0.2 ? Math.sin(this.bob * 2) * 0.035 : 0;
    this.camera.position.set(this.pos.x, EYE + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
