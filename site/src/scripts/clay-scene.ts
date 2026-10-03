/**
 * Real-time clay objects (docs/brand/README.md): rounded geometry with
 * hand-pressed lumps, a matte clay material, soft studio light and a shadow
 * catcher just behind the objects. Loaded on demand by ClayScene.astro, so
 * three.js never blocks the first paint.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface Placement {
  kind: Kind;
  x: number;
  y: number;
  s: number;
  rx?: number;
  ry?: number;
  rz?: number;
  /** Placement below 560px wide; omitted objects hide on phones. */
  m?: { x: number; y: number; s: number } | null;
}

type Kind =
  | 'asterisk'
  | 'cap'
  | 'books'
  | 'bubble'
  | 'pencil'
  | 'ring'
  | 'ballSun'
  | 'ballPink'
  | 'badge'
  | 'bulb'
  | 'people'
  | 'toolbox';

const C = {
  tomato: '#ff5436',
  sun: '#ffb81f',
  sky: '#5fb2ff',
  mint: '#3fc795',
  lilac: '#9474ff',
  pink: '#ff86a2',
  cream: '#fff1d6',
  ink: '#3a3550',
  grey: '#c9ccd6',
  wood: '#f1c992',
};

let grain: THREE.Texture | null = null;

/** Fine grain for the clay surface: blurred noise used as a bump map. */
function grainTexture(): THREE.Texture {
  if (grain) return grain;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (Math.random() - 0.5) * 90;
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  ctx.filter = 'blur(1.2px)';
  ctx.drawImage(canvas, 0, 0);
  grain = new THREE.CanvasTexture(canvas);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(3, 3);
  return grain;
}

function noise3(x: number, y: number, z: number, s: number): number {
  return (
    (Math.sin(x * 1.7 + s) * Math.sin(y * 2.3 + s * 1.3) * Math.sin(z * 1.9 + s * 0.7) +
      0.5 * Math.sin(x * 3.9 + y * 2.1 + s * 2.1) * Math.sin(z * 3.3 - x * 1.4 + s)) /
    1.5
  );
}

/**
 * Seam-safe lumps: the displacement depends only on position and the
 * generator's analytic normal, so duplicated seam vertices move together.
 */
function lumpy<T extends THREE.BufferGeometry>(geo: T, amp: number, freq: number): T {
  const seed = Math.random() * 10;
  const p = geo.attributes.position as THREE.BufferAttribute;
  const n = geo.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    nn.fromBufferAttribute(n, i);
    v.addScaledVector(nn, amp * noise3(v.x * freq, v.y * freq, v.z * freq, seed));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function clay(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.72,
    metalness: 0,
    sheen: 0.6,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color('#595959'),
    clearcoat: 0.08,
    clearcoatRoughness: 0.6,
    bumpMap: grainTexture(),
    bumpScale: 0.6,
  });
}

function mesh(geo: THREE.BufferGeometry, color: string, amp: number, freq: number): THREE.Mesh {
  const m = new THREE.Mesh(lumpy(geo, amp, freq), clay(color));
  m.castShadow = true;
  return m;
}

// ---- Objects, about one unit across ----

function asterisk(): THREE.Object3D {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const bar = mesh(new THREE.CapsuleGeometry(0.17, 1.2, 24, 48), C.tomato, 0.02, 2.4);
    bar.rotation.z = (i * Math.PI) / 3;
    g.add(bar);
  }
  const dot = mesh(new THREE.SphereGeometry(0.24, 64, 48), C.sun, 0.015, 3);
  dot.position.z = 0.16;
  g.add(dot);
  return g;
}

function cap(): THREE.Object3D {
  const g = new THREE.Group();
  const board = mesh(new RoundedBoxGeometry(1.35, 0.12, 1.35, 6, 0.05), C.lilac, 0.012, 2);
  board.rotation.y = Math.PI / 4;
  board.position.y = 0.28;
  g.add(board);
  const base = mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.42, 64, 4), C.lilac, 0.015, 2.5);
  base.scale.set(1, 1, 0.82);
  g.add(base);
  const button = mesh(new THREE.SphereGeometry(0.08, 32, 24), C.sun, 0.004, 4);
  button.position.y = 0.36;
  g.add(button);
  const cord = mesh(new THREE.CapsuleGeometry(0.03, 0.55, 8, 16), C.sun, 0.004, 4);
  cord.position.set(0.62, 0.05, 0.25);
  cord.rotation.z = 0.08;
  g.add(cord);
  const tassel = mesh(new THREE.SphereGeometry(0.1, 32, 24), C.sun, 0.006, 4);
  tassel.position.set(0.64, -0.26, 0.25);
  tassel.scale.y = 1.4;
  g.add(tassel);
  return g;
}

function books(): THREE.Object3D {
  const g = new THREE.Group();
  [C.mint, C.pink, C.sun].forEach((color, i) => {
    const b = mesh(new RoundedBoxGeometry(1.25, 0.26, 0.86, 6, 0.08), color, 0.012, 2.2);
    b.position.set([0, 0.06, -0.05][i], i * 0.27 - 0.27, 0);
    b.rotation.y = [0.05, -0.12, 0.18][i];
    g.add(b);
    const pages = mesh(new RoundedBoxGeometry(0.06, 0.18, 0.76, 2, 0.02), C.cream, 0.004, 3);
    pages.position.copy(b.position);
    pages.position.x += 0.62 * Math.cos(b.rotation.y);
    pages.position.z -= 0.62 * Math.sin(b.rotation.y);
    pages.rotation.y = b.rotation.y;
    g.add(pages);
  });
  return g;
}

function bubble(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.3, 0.88, 0.36, 8, 0.17), C.sky, 0.015, 2));
  const tail = mesh(new THREE.ConeGeometry(0.16, 0.36, 32, 4), C.sky, 0.01, 2.5);
  tail.position.set(-0.32, -0.5, 0);
  tail.rotation.z = Math.PI * 0.82;
  g.add(tail);
  for (const x of [-0.34, 0, 0.34]) {
    const d = mesh(new THREE.SphereGeometry(0.1, 32, 24), '#ffffff', 0.004, 4);
    d.position.set(x, 0.02, 0.2);
    d.scale.z = 0.6;
    g.add(d);
  }
  return g;
}

function pencil(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 6, 6), C.sun, 0.006, 3));
  const wood = mesh(new THREE.ConeGeometry(0.13, 0.32, 6, 3), C.wood, 0.004, 3);
  wood.position.y = -0.71;
  wood.rotation.x = Math.PI;
  g.add(wood);
  const lead = mesh(new THREE.ConeGeometry(0.045, 0.11, 24, 2), C.ink, 0.002, 4);
  lead.position.y = -0.83;
  lead.rotation.x = Math.PI;
  g.add(lead);
  const ferrule = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 32, 2), C.grey, 0.004, 4);
  ferrule.position.y = 0.61;
  g.add(ferrule);
  const eraser = mesh(new THREE.CapsuleGeometry(0.13, 0.1, 12, 32), C.pink, 0.008, 3);
  eraser.position.y = 0.74;
  g.add(eraser);
  g.rotation.z = -0.9;
  return g;
}

/** A little clay person: round head on rounded shoulders. */
function person(color: string): THREE.Group {
  const g = new THREE.Group();
  const head = mesh(new THREE.SphereGeometry(0.22, 64, 48), color, 0.012, 3);
  head.position.y = 0.3;
  g.add(head);
  const body = mesh(new THREE.CapsuleGeometry(0.3, 0.12, 16, 48), color, 0.015, 2.5);
  body.position.y = -0.2;
  body.scale.set(1.15, 0.75, 0.7);
  g.add(body);
  return g;
}

/** Profile: a name badge with a person on it, clipped at the top. */
function badge(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.0, 1.25, 0.18, 6, 0.09), C.cream, 0.01, 2.2));
  const who = person(C.sky);
  who.scale.setScalar(0.72);
  who.position.set(0, 0.16, 0.12);
  who.scale.z = 0.4;
  g.add(who);
  for (const [y, w] of [
    [-0.34, 0.56],
    [-0.47, 0.36],
  ]) {
    const line = mesh(new THREE.CapsuleGeometry(0.035, w, 8, 16), C.lilac, 0.003, 4);
    line.rotation.z = Math.PI / 2;
    line.position.set(0, y, 0.11);
    g.add(line);
  }
  const clip = mesh(new RoundedBoxGeometry(0.34, 0.16, 0.24, 4, 0.06), C.lilac, 0.006, 3);
  clip.position.y = 0.66;
  g.add(clip);
  return g;
}

/** Knowledge base: a light bulb. */
function bulb(): THREE.Object3D {
  const g = new THREE.Group();
  const glass = mesh(new THREE.SphereGeometry(0.46, 64, 48), C.sun, 0.015, 2.4);
  glass.position.y = 0.2;
  g.add(glass);
  const neck = mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.32, 48, 3), C.sun, 0.01, 2.5);
  neck.position.y = -0.24;
  g.add(neck);
  for (let i = 0; i < 3; i++) {
    const ring = mesh(new THREE.TorusGeometry(0.2, 0.055, 16, 48), C.grey, 0.004, 4);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.42 - i * 0.1;
    g.add(ring);
  }
  const tip = mesh(new THREE.SphereGeometry(0.1, 32, 24), C.ink, 0.004, 4);
  tip.position.y = -0.7;
  g.add(tip);
  const shine = mesh(new THREE.CapsuleGeometry(0.05, 0.16, 8, 16), '#ffffff', 0.002, 4);
  shine.position.set(-0.22, 0.36, 0.36);
  shine.rotation.z = 0.6;
  g.add(shine);
  return g;
}

/** Community: two clay people side by side. */
function people(): THREE.Object3D {
  const g = new THREE.Group();
  const a = person(C.tomato);
  a.position.set(-0.3, 0, -0.1);
  g.add(a);
  const b = person(C.mint);
  b.position.set(0.3, -0.06, 0.12);
  b.scale.setScalar(0.92);
  g.add(b);
  return g;
}

/** Toolkit: a toolbox with a handle and a latch. */
function toolbox(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.3, 0.72, 0.62, 6, 0.1), C.tomato, 0.014, 2.2));
  const lid = mesh(new RoundedBoxGeometry(1.36, 0.16, 0.66, 4, 0.06), C.sun, 0.008, 2.5);
  lid.position.y = 0.38;
  g.add(lid);
  const handle = mesh(new THREE.TorusGeometry(0.26, 0.06, 16, 48, Math.PI), C.ink, 0.004, 4);
  handle.position.y = 0.46;
  g.add(handle);
  const latch = mesh(new RoundedBoxGeometry(0.22, 0.16, 0.08, 3, 0.03), C.grey, 0.004, 4);
  latch.position.set(0, 0.22, 0.33);
  g.add(latch);
  return g;
}

const MAKE: Record<Kind, () => THREE.Object3D> = {
  asterisk,
  cap,
  books,
  bubble,
  pencil,
  ring: () => mesh(new THREE.TorusGeometry(0.42, 0.19, 48, 96), C.mint, 0.02, 2.4),
  ballSun: () => mesh(new THREE.SphereGeometry(0.3, 64, 48), C.sun, 0.02, 2.5),
  ballPink: () => mesh(new THREE.SphereGeometry(0.3, 64, 48), C.pink, 0.02, 2.5),
  badge,
  bulb,
  people,
  toolbox,
};

interface Item {
  obj: THREE.Object3D;
  place: Placement;
  phase: number;
  base: THREE.Vector3;
  shown: boolean;
}

/** Mount a scene into `el` (absolutely positioned canvas filling it). */
export function mountClay(el: HTMLElement, layout: Placement[]): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  el.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, 0, 12);

  const key = new THREE.DirectionalLight('#fff6ec', 2.3);
  key.position.set(-3, 5, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -8;
  key.shadow.camera.right = key.shadow.camera.top = 8;
  key.shadow.bias = -0.0006;
  key.shadow.radius = 14;
  key.shadow.blurSamples = 20;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.5);
  fill.position.set(5, -2, 4);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight('#ffffff', '#e8d9ff', 0.35));

  // Shadow catcher just behind the objects: the floating depth.
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.1 }));
  catcher.position.z = -0.9;
  catcher.receiveShadow = true;
  scene.add(catcher);

  const items: Item[] = layout.map((place, i) => {
    const obj = MAKE[place.kind]();
    scene.add(obj);
    return { obj, place, phase: i * 1.7, base: new THREE.Vector3(), shown: true };
  });

  function place(): void {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const vw = vh * camera.aspect;
    const narrow = w < 560;
    const unit = Math.min(vw, vh);
    for (const it of items) {
      const p = it.place;
      const pos = narrow && p.m !== undefined ? p.m : p;
      it.shown = pos !== null;
      it.obj.visible = it.shown;
      if (!pos) continue;
      it.base.set((pos.x - 0.5) * vw, (0.5 - pos.y) * vh, 0);
      it.obj.scale.setScalar(pos.s * unit * 0.22);
      it.obj.rotation.set(p.rx ?? 0.25, p.ry ?? -0.35, p.rz ?? 0);
    }
  }

  const clock = new THREE.Clock();
  let visible = true;
  function frame(): void {
    const t = reduce ? 0 : clock.getElapsedTime();
    for (const it of items) {
      if (!it.shown) continue;
      const p = it.place;
      it.obj.position.copy(it.base);
      it.obj.position.y += Math.sin(t * 0.9 + it.phase) * 0.24 * it.obj.scale.x;
      it.obj.rotation.y = (p.ry ?? -0.35) + Math.sin(t * 0.35 + it.phase) * 0.35;
      it.obj.rotation.x = (p.rx ?? 0.25) + Math.sin(t * 0.5 + it.phase) * 0.06;
    }
    renderer.render(scene, camera);
  }
  function loop(): void {
    if (visible) frame();
    requestAnimationFrame(loop);
  }
  new ResizeObserver(() => {
    place();
    frame();
  }).observe(el);
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
    },
    { rootMargin: '100px' },
  ).observe(el);
  place();
  frame();
  el.dataset.ready = 'true';
  if (!reduce) loop();
}
