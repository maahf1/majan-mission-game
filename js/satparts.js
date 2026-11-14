// Shows a design on the satellite model (assets/satellite.glb): solar wings, battery,
// antenna, and the two instrument bays under the body. Used by the hangar (main game)
// and by the Space Center, so both build the satellite the same way.
import * as THREE from 'three';
import { POWER, COMMS, instrument } from './rules.js';

export const ALL_PART_NODES = ['Camera_Std', 'Camera_Hi', 'Camera_Hyper', 'Wing_Base', 'Wing_Extra', 'Battery_Pack', 'Antenna_Whip', 'Antenna_Dish', 'Antenna_Laser'];
export const CAMERA_NODES = ['Camera_Std', 'Camera_Hi', 'Camera_Hyper'];
export const SLOT_Z = { inst1: 0.42, inst2: -0.42 }; // the two instrument bays, when the model does not mark them
// The model marks its two bays with empty nodes named Bay_inst1 and Bay_inst2 (models/make_satellite_v3.py).

/** Radar panel, built in code (the satellite model has no radar). */
export function radarMesh() {
  const grp = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.7), new THREE.MeshStandardMaterial({ color: 0x29303d, metalness: 0.6, roughness: 0.35 }));
  grp.add(panel);
  const tiles = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.62, 12, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 1.4, 1.8), wireframe: true, transparent: true, opacity: 0.55 }));
  tiles.rotation.x = Math.PI / 2;
  tiles.position.y = -0.03;
  grp.add(tiles);
  const feed = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), new THREE.MeshStandardMaterial({ color: 0xcfd6e3, metalness: 0.8, roughness: 0.3 }));
  feed.position.y = 0.06;
  grp.add(feed);
  grp.position.y = -0.72;
  return grp;
}

export class SatParts {
  /** model: the loaded satellite scene. Camera nodes become hidden templates for the bays. */
  constructor(model) {
    this.model = model;
    this.nodes = {};
    for (const n of [...ALL_PART_NODES, 'Body']) {
      this.nodes[n] = model.getObjectByName(n);
      if (this.nodes[n]) this.nodes[n].userData.base = this.nodes[n].scale.clone();
    }
    for (const n of CAMERA_NODES) if (this.nodes[n]) this.nodes[n].visible = false;
    this.bays = { inst1: model.getObjectByName('Bay_inst1'), inst2: model.getObjectByName('Bay_inst2') };
    this.slotMesh = {};
    this.slotId = {};
    this.pops = []; // parts growing in: { node, t }
  }

  /** One instrument for a bay: a copy of a camera model (lens tinted for some types), or the radar panel. */
  instrumentMesh(id, slot) {
    const ins = instrument(id);
    if (!ins) return null;
    let mesh;
    if (ins.node === 'radar') mesh = radarMesh();
    else {
      mesh = this.nodes[ins.node].clone(true);
      mesh.visible = true;
      if (ins.tint) {
        mesh.traverse((o) => {
          if (!o.isMesh) return;
          const tintOne = (mt) => {
            if (!/lens|glass/i.test(mt.name)) return mt;
            const c = mt.clone();
            c.emissive = new THREE.Color(ins.tint);
            c.emissiveIntensity = 2.2;
            return c;
          };
          o.material = Array.isArray(o.material) ? o.material.map(tintOne) : tintOne(o.material);
        });
      }
    }
    const bay = this.bays[slot];
    if (bay) { mesh.position.x += bay.position.x; mesh.position.y += bay.position.y; mesh.position.z = bay.position.z; }
    else mesh.position.z = SLOT_Z[slot];
    mesh.scale.setScalar(0.82);
    mesh.userData.base = mesh.scale.clone();
    mesh.name = 'Bay_' + slot;
    return mesh;
  }

  _pop(node) {
    node.scale.setScalar(0.01);
    this.pops.push({ node, t: 0 });
  }

  /** design: { inst1, inst2, power, comms }. animate: new parts grow in. Returns true if anything changed. */
  apply(design, animate = false) {
    let changed = false;
    const pwr = POWER.find((p) => p.id === design.power) || POWER[0];
    const com = COMMS.find((c) => c.id === design.comms) || COMMS[0];
    const show = new Set(['Body', ...pwr.nodes, ...com.nodes]);
    for (const n of ALL_PART_NODES) {
      if (CAMERA_NODES.includes(n)) continue;
      const node = this.nodes[n];
      if (!node) continue;
      const was = node.visible;
      node.visible = show.has(n);
      // The biggest power option has longer wings
      if (n === 'Wing_Base' || n === 'Wing_Extra') {
        node.userData.base = new THREE.Vector3(pwr.big ? 1.25 : 1, 1, 1);
        if (!this.pops.some((p) => p.node === node)) node.scale.copy(node.userData.base);
      }
      if (node.visible !== was) changed = true;
      if (animate && node.visible && !was) this._pop(node);
    }
    for (const slot of ['inst1', 'inst2']) {
      if (this.slotId[slot] === design[slot]) continue;
      changed = true;
      const old = this.slotMesh[slot];
      if (old) {
        this.model.remove(old);
        for (let i = this.pops.length - 1; i >= 0; i--) if (this.pops[i].node === old) this.pops.splice(i, 1);
      }
      const mesh = this.instrumentMesh(design[slot], slot);
      this.slotMesh[slot] = mesh;
      this.slotId[slot] = design[slot];
      if (!mesh) continue;
      this.model.add(mesh);
      if (animate) this._pop(mesh);
    }
    return changed;
  }

  /** Grow new parts in with a slight overshoot. */
  update(dt) {
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.t = Math.min(p.t + dt / 0.45, 1);
      const k = 1 + 0.18 * Math.sin(p.t * Math.PI);
      const base = p.node.userData.base || new THREE.Vector3(1, 1, 1);
      p.node.scale.copy(base).multiplyScalar(Math.max(0.01, p.t * k));
      if (p.t >= 1) { p.node.scale.copy(base); this.pops.splice(i, 1); }
    }
  }
}
