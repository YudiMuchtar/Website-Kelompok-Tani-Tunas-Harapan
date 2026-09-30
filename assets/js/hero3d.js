/*
 * Tunas Harapan — Hero 3D
 * Lanskap senja Tapanuli Selatan: langit toska-keemasan, sinar matahari
 * (motif logo), perbukitan bertingkat, sawah bergoyang, dan tunas yang tumbuh.
 */
import * as THREE from '../vendor/three.module.min.js';

// Warna "mentah" (tanpa konversi sRGB) untuk shader kustom
const raw = (hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);

// Noise sederhana & deterministik (tanpa dependensi)
function hash(n) { const s = Math.sin(n) * 43758.5453123; return s - Math.floor(s); }
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function noise2(x, z, seed = 0) {
  return (
    Math.sin(x * 0.15 + seed) * Math.cos(z * 0.2 + seed * 1.3) * 0.55 +
    Math.sin(x * 0.37 + z * 0.11 + seed * 2.1) * 0.3 +
    Math.sin(x * 0.9 - z * 0.5 + seed) * 0.1 +
    Math.cos(x * 0.06 - seed * 0.7) * 0.35
  );
}

export function initHero(canvas, opts = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => window.innerWidth < 820;
  const lowPower = small() || (navigator.hardwareConcurrency || 8) <= 4;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const FOG = 0xf1d3a0;
  scene.fog = new THREE.Fog(FOG, 30, 175);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
  const camBase = new THREE.Vector3(0, 3.1, 14);
  const lookBase = new THREE.Vector3(0, 2.6, 0);
  camera.position.copy(camBase);

  const uTime = { value: 0 };

  /* ---------------- Langit ---------------- */
  const sunPos = new THREE.Vector3(30, 14, -150);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: raw(0x1f8fa3) },
      uMid: { value: raw(0x8fd3cf) },
      uHorizon: { value: raw(0xffd79a) },
      uGround: { value: raw(0xe9c48a) },
      uSunDir: { value: sunPos.clone().normalize() },
      uTime,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uMid, uHorizon, uGround, uSunDir;
      uniform float uTime;
      varying vec3 vDir;
      void main(){
        float h = vDir.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
        col = mix(col, uTop, smoothstep(0.18, 0.75, h));
        col = mix(col, uGround, smoothstep(0.0, -0.15, h));
        float s = max(dot(vDir, normalize(uSunDir)), 0.0);
        col += vec3(1.0, 0.78, 0.45) * pow(s, 10.0) * 0.55;
        col += vec3(1.0, 0.92, 0.75) * pow(s, 180.0) * 1.2;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat));

  /* --------------- Sinar matahari (motif logo) --------------- */
  const raysMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: { uTime, uColor: { value: raw(0xfff1c9) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        vec2 p = vUv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x);
        float rays = pow(abs(sin(a * 18.0 + uTime * 0.04)), 12.0) * 0.8
                   + pow(abs(sin(a * 11.0 - uTime * 0.03 + 1.3)), 20.0) * 0.6;
        float fall = smoothstep(0.5, 0.02, r);
        float core = smoothstep(0.06, 0.0, r) * 1.4 + smoothstep(0.2, 0.0, r) * 0.5;
        float alpha = rays * fall * 0.42 + core;
        gl_FragColor = vec4(uColor * alpha, alpha);
      }`,
  });
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(190, 190), raysMat);
  rays.position.copy(sunPos);
  scene.add(rays);

  /* ---------------- Cahaya ---------------- */
  scene.add(new THREE.HemisphereLight(0xd6f0ff, 0x7a5a36, 1.15));
  const sun = new THREE.DirectionalLight(0xffcf8f, 2.4);
  sun.position.set(14, 16, -18);
  sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 60 });
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xfff0d8, 1.1);
  fill.position.set(-8, 7, 14);
  scene.add(fill);

  /* ---------------- Perbukitan ---------------- */
  function hills({ z, width, depth, segX, segZ, base, amp, seed, colors, terrace = 0 }) {
    const g = new THREE.PlaneGeometry(width, depth, segX, segZ);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const cLow = new THREE.Color(colors[0]);
    const cHigh = new THREE.Color(colors[1]);
    const cAlt = new THREE.Color(colors[2] || colors[0]);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const zz = pos.getZ(i) + z;
      const edge = Math.min(1, Math.abs(pos.getZ(i) - depth / 2) / (depth * 0.35));
      let y = base + amp * (0.55 + 0.45 * noise2(x, zz, seed)) * edge;
      y += hash(i + seed) * amp * 0.04;
      pos.setY(i, y);
      const t = THREE.MathUtils.clamp((y - base) / (amp || 1), 0, 1);
      c.copy(cLow).lerp(cHigh, t);
      if (terrace && Math.floor(y * terrace) % 2 === 0) c.lerp(cAlt, 0.55);
      c.offsetHSL(0, 0, (hash(i * 3.1 + seed) - 0.5) * 0.04);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(
      g,
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 })
    );
    m.position.z = z;
    m.receiveShadow = true;
    return m;
  }

  const layers = [
    { z: -120, width: 520, depth: 70, segX: 90, segZ: 14, base: -2, amp: 24, seed: 3.3, colors: [0x5f9a6a, 0x3c6b4e] },
    { z: -68, width: 380, depth: 56, segX: 110, segZ: 18, base: -1.2, amp: 11, seed: 7.1, colors: [0x6da447, 0x3f7a34] },
    { z: -34, width: 260, depth: 34, segX: 120, segZ: 18, base: -0.9, amp: 4.2, seed: 1.7, colors: [0x9ccc5a, 0x5a9a3c, 0xb7d86a], terrace: 3 },
  ];
  const hillMeshes = layers.map((l) => hills(l));
  hillMeshes.forEach((m) => scene.add(m));

  // Air (danau/sungai — biru pada logo)
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 200),
    new THREE.MeshStandardMaterial({ color: 0x3fb3c2, roughness: 0.18, metalness: 0.35 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, -110);
  scene.add(water);

  // Sawah latar depan: petak bergaris
  const fieldG = new THREE.PlaneGeometry(90, 24, 90, 24);
  fieldG.rotateX(-Math.PI / 2);
  {
    const p = fieldG.attributes.position;
    const col = new Float32Array(p.count * 3);
    const a = new THREE.Color(0x8cc152), b = new THREE.Color(0x6aa33e), s = new THREE.Color(0xc9d97a);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, Math.sin(x * 0.12) * 0.12 + Math.cos(z * 0.3 + x * 0.05) * 0.1 - Math.max(0, -z - 6) * 0.05);
      const band = Math.floor((z + 40) / 2.2) % 3;
      c.copy(band === 0 ? a : band === 1 ? b : s).offsetHSL(0, 0, (hash(i) - 0.5) * 0.05);
      col.set([c.r, c.g, c.b], i * 3);
    }
    fieldG.setAttribute('color', new THREE.BufferAttribute(col, 3));
    fieldG.computeVertexNormals();
  }
  const field = new THREE.Mesh(fieldG, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  field.position.z = -2;
  field.receiveShadow = true;
  scene.add(field);

  /* ---------------- Pepohonan (siluet pinus pada logo) ---------------- */
  const treeCount = lowPower ? 160 : 320;
  const treeGeo = new THREE.ConeGeometry(0.7, 2.6, 6);
  treeGeo.translate(0, 1.3, 0);
  const trees = new THREE.InstancedMesh(
    treeGeo,
    new THREE.MeshStandardMaterial({ color: 0x2f5f2c, flatShading: true, roughness: 0.9 }),
    treeCount
  );
  {
    const r = rnd(42);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const tc = new THREE.Color();
    for (let i = 0; i < treeCount; i++) {
      const L = i % 3 === 0 ? layers[1] : layers[2];
      const x = (r() - 0.5) * L.width * 0.7;
      const lz = (r() - 0.5) * L.depth * 0.5;
      const zz = L.z + lz;
      const edge = Math.min(1, Math.abs(lz - L.depth / 2) / (L.depth * 0.35));
      const y = L.base + L.amp * (0.55 + 0.45 * noise2(x, zz, L.seed)) * edge - 0.2;
      if (y < 0.2) { i--; continue; }
      const k = (L === layers[1] ? 1.6 : 0.9) * (0.6 + r() * 0.8);
      p.set(x, y, zz);
      s.set(k, k * (0.8 + r() * 0.6), k);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
      m.compose(p, q, s);
      trees.setMatrixAt(i, m);
      trees.setColorAt(i, tc.setHSL(0.28 + r() * 0.06, 0.45, 0.22 + r() * 0.1));
    }
  }
  scene.add(trees);

  /* ---------------- Padi bergoyang ---------------- */
  const cropCount = lowPower ? 1400 : 3600;
  const cropGeo = new THREE.ConeGeometry(0.05, 0.55, 3);
  cropGeo.translate(0, 0.27, 0);
  const cropMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.8 });
  cropMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
         float w = sin(uTime * 1.6 + ip.x * 0.45 + ip.z * 0.8) * 0.5 + sin(uTime * 2.7 + ip.x) * 0.2;
         transformed.x += w * 0.22 * position.y * position.y;
         transformed.z += w * 0.08 * position.y;
       #endif`
    );
  };
  const crops = new THREE.InstancedMesh(cropGeo, cropMat, cropCount);
  const mound = new THREE.Vector3(3.4, 0, 0.4);
  {
    const r = rnd(7);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const e = new THREE.Euler();
    const tc = new THREE.Color();
    let i = 0;
    while (i < cropCount) {
      const row = Math.floor(r() * 20);
      const z = 7 - row * 0.85 + (r() - 0.5) * 0.15;
      const x = (r() - 0.5) * 60;
      if (Math.hypot(x - mound.x, z - mound.z) < 2.6 || Math.hypot(x - 0.4, z + 1.5) < 2.6 || Math.hypot(x - 2.6, z - 0.4) < 2.6) continue;
      p.set(x, Math.sin(x * 0.12) * 0.12 + Math.cos((z + 2) * 0.3 + x * 0.05) * 0.1 - 0.05, z);
      e.set((r() - 0.5) * 0.35, r() * Math.PI, (r() - 0.5) * 0.35);
      q.setFromEuler(e);
      const k = 0.7 + r() * 0.7;
      s.set(k, k * (0.8 + r() * 0.5), k);
      m.compose(p, q, s);
      crops.setMatrixAt(i, m);
      crops.setColorAt(i, tc.setHSL(0.22 + r() * 0.07, 0.6, 0.3 + r() * 0.14));
      i++;
    }
  }
  crops.castShadow = false;
  scene.add(crops);

  /* ---------------- Gundukan tanah ---------------- */
  const moundGeo = new THREE.SphereGeometry(1.9, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  {
    const p = moundGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 1 + (hash(i * 1.7) - 0.5) * 0.05 + Math.sin(x * 4 + z * 3) * 0.03;
      p.setXYZ(i, x * n, y * 0.34 * n, z * n);
    }
    moundGeo.computeVertexNormals();
  }
  const soil = new THREE.Mesh(
    moundGeo,
    new THREE.MeshStandardMaterial({ color: 0x5e3a22, roughness: 1, flatShading: true })
  );
  soil.position.copy(mound);
  soil.receiveShadow = true;
  scene.add(soil);
  // bongkahan tanah
  const clodGeo = new THREE.DodecahedronGeometry(0.16, 0);
  const clods = new THREE.InstancedMesh(clodGeo, new THREE.MeshStandardMaterial({ color: 0x5a3820, flatShading: true }), 28);
  {
    const r = rnd(99), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < 28; i++) {
      const a = r() * Math.PI * 2, d = 1.2 + r() * 1.1;
      p.set(mound.x + Math.cos(a) * d, 0.05 + r() * 0.12, mound.z + Math.sin(a) * d);
      q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3));
      const k = 0.5 + r();
      s.set(k, k * 0.7, k);
      clods.setMatrixAt(i, m.compose(p, q, s));
    }
  }
  scene.add(clods);

  /* ---------------- Tunas (sprout) ---------------- */
  function leafTexture(light, dark) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 512;
    const g = cv.getContext('2d');
    const grd = g.createLinearGradient(0, 512, 0, 0);
    grd.addColorStop(0, dark); grd.addColorStop(0.55, light); grd.addColorStop(1, dark);
    g.fillStyle = grd; g.fillRect(0, 0, 256, 512);
    const side = g.createLinearGradient(0, 0, 256, 0);
    side.addColorStop(0, 'rgba(10,40,5,.45)'); side.addColorStop(0.5, 'rgba(255,255,200,.08)'); side.addColorStop(1, 'rgba(10,40,5,.45)');
    g.fillStyle = side; g.fillRect(0, 0, 256, 512);
    g.strokeStyle = 'rgba(220,255,170,.85)'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(128, 512); g.lineTo(128, 10); g.stroke();
    g.lineWidth = 3; g.strokeStyle = 'rgba(210,250,160,.55)';
    for (let y = 470; y > 60; y -= 38) {
      g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(170, y - 30, 250, y - 70); g.stroke();
      g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(86, y - 30, 6, y - 70); g.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  function leafGeometry(len, wid, cup, bend) {
    const NU = 12, NV = 28;
    const verts = [], uvs = [], idx = [];
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      const w = wid * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.02)), 0.85) * (1 - v * 0.25);
      for (let i = 0; i <= NU; i++) {
        const u = (i / NU) * 2 - 1;
        const x = u * w;
        const y = v * len;
        const z = -Math.abs(u) * w * cup + bend * v * v * len;
        verts.push(x, y, z);
        uvs.push(u * 0.5 + 0.5, v);
      }
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  const sprout = new THREE.Group();
  sprout.position.set(mound.x, 0.55, mound.z);
  sprout.scale.setScalar(1.25);
  scene.add(sprout);

  const STEM_H = 1.85;
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c9e2e, roughness: 0.5, emissive: 0x16330a, emissiveIntensity: 0.35 });
  const stemGrp = new THREE.Group();
  sprout.add(stemGrp);
  // batang terpilin (dua helaian seperti pada logo)
  for (let k = 0; k < 2; k++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const a = t * Math.PI * 4.5 + k * Math.PI;
      const r = 0.075 * (1 - t * 0.35);
      pts.push(new THREE.Vector3(Math.cos(a) * r + Math.sin(t * Math.PI) * 0.12, t * STEM_H, Math.sin(a) * r));
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.062, 8), stemMat);
    tube.castShadow = true;
    stemGrp.add(tube);
  }

  const leafMatA = new THREE.MeshStandardMaterial({
    map: leafTexture('#6cc23a', '#2f6d1c'), side: THREE.DoubleSide, roughness: 0.45,
    emissive: 0x1e4a0c, emissiveIntensity: 0.45,
  });
  const leafMatB = new THREE.MeshStandardMaterial({
    map: leafTexture('#8fd850', '#3c8a24'), side: THREE.DoubleSide, roughness: 0.35,
    emissive: 0x2a5a12, emissiveIntensity: 0.5,
  });

  const crown = new THREE.Group();
  crown.position.set(0.0, STEM_H - 0.05, 0);
  sprout.add(crown);

  const leaves = [];
  const leafGeo = leafGeometry(1.9, 0.78, 0.26, -0.14);
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    const leaf = new THREE.Mesh(leafGeo, leafMatA);
    leaf.castShadow = true;
    pivot.add(leaf);
    pivot.rotation.set(0.22, side * 0.35, -side * 1.12);
    pivot.userData = { side, open: -side * 1.12 };
    crown.add(pivot);
    leaves.push(pivot);
  });
  const bud = new THREE.Mesh(leafGeometry(1.5, 0.5, 0.75, 0.05), leafMatB);
  bud.castShadow = true;
  const budPivot = new THREE.Group();
  budPivot.add(bud);
  budPivot.rotation.set(0.05, 0, 0);
  crown.add(budPivot);
  const bud2 = new THREE.Mesh(leafGeometry(1.4, 0.46, 0.75, 0.05), leafMatB);
  bud2.rotation.y = Math.PI;
  budPivot.add(bud2);

  // Aura hangat di belakang tunas
  function radialTexture(stops) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, c]) => grd.addColorStop(o, c));
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,240,190,0.9)'], [0.35, 'rgba(255,214,140,0.35)'], [1, 'rgba(255,200,120,0)']]),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false,
  }));
  aura.scale.set(7.5, 7.5, 1);
  aura.position.set(0, STEM_H + 0.3, -1.2);
  sprout.add(aura);

  /* ---------------- Awan ---------------- */
  const cloudTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 256;
    const g = cv.getContext('2d');
    const r = rnd(5);
    for (let i = 0; i < 22; i++) {
      const x = 80 + r() * 350, y = 120 + (r() - 0.5) * 60, rad = 40 + r() * 60;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(255,250,240,.55)');
      grd.addColorStop(1, 'rgba(255,250,240,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 512, 256);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
    sp.scale.set(60 + i * 6, 26 + i * 2, 1);
    sp.position.set(-140 + i * 48, 30 + (i % 3) * 9, -170 - (i % 2) * 20);
    scene.add(sp);
    clouds.push(sp);
  }

  /* ---------------- Serbuk sari / kunang-kunang ---------------- */
  const PN = lowPower ? 260 : 600;
  const pg = new THREE.BufferGeometry();
  const pp = new Float32Array(PN * 3), ps = new Float32Array(PN), pr = new Float32Array(PN);
  {
    const r = rnd(11);
    for (let i = 0; i < PN; i++) {
      pp.set([(r() - 0.5) * 40, r() * 12, 6 - r() * 40], i * 3);
      ps[i] = 0.5 + r() * 1.5;
      pr[i] = r() * 100;
    }
  }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  pg.setAttribute('aSize', new THREE.BufferAttribute(ps, 1));
  pg.setAttribute('aRand', new THREE.BufferAttribute(pr, 1));
  const pollen = new THREE.Points(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      uniform float uTime, uPR; attribute float aSize, aRand; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.15 + fract(aRand) * 0.25), 12.0);
        p.x += sin(uTime * 0.4 + aRand) * 0.8;
        p.z += cos(uTime * 0.3 + aRand * 1.7) * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uPR * (60.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
        vA = (0.45 + 0.55 * sin(uTime * 2.0 + aRand * 6.0)) * smoothstep(0.0, 1.5, p.y) * smoothstep(12.0, 9.0, p.y);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.6) * a * vA, a * vA);
      }`,
  }));
  scene.add(pollen);

  /* ---------------- Kupu-kupu ---------------- */
  const wingTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const grd = g.createRadialGradient(20, 64, 5, 30, 64, 110);
    grd.addColorStop(0, '#ffd46b'); grd.addColorStop(0.6, '#f59a2c'); grd.addColorStop(1, '#6b2f0d');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(4, 64);
    g.bezierCurveTo(30, -10, 130, 0, 118, 50);
    g.bezierCurveTo(112, 70, 90, 70, 80, 72);
    g.bezierCurveTo(110, 90, 100, 130, 60, 118);
    g.bezierCurveTo(30, 110, 10, 80, 4, 64);
    g.fill();
    g.fillStyle = 'rgba(255,250,230,.9)';
    [[92, 30, 6], [104, 46, 4], [70, 102, 5]].forEach(([x, y, rr]) => { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); });
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const wingGeo = new THREE.PlaneGeometry(0.34, 0.34);
  wingGeo.translate(0.17, 0, 0);
  wingGeo.rotateX(-Math.PI / 2);
  const wingMat = new THREE.MeshBasicMaterial({ map: wingTex, side: THREE.DoubleSide, transparent: true, alphaTest: 0.3 });
  const flies = [];
  for (let i = 0; i < (lowPower ? 3 : 5); i++) {
    const b = new THREE.Group();
    const L = new THREE.Mesh(wingGeo, wingMat), R = new THREE.Mesh(wingGeo, wingMat);
    R.scale.x = -1;
    b.add(L, R);
    b.userData = { L, R, ph: i * 1.9, sp: 0.25 + i * 0.05, rad: 1.8 + i * 0.7, cy: 2.2 + (i % 3) * 0.6 };
    scene.add(b);
    flies.push(b);
  }

  /* ---------------- Tata letak responsif ---------------- */
  let spriteBase = mound.clone();
  function layout() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w / h < 1;
    camera.fov = narrow ? 58 : 42;
    camera.updateProjectionMatrix();
    const mx = narrow ? 0.4 : w < 1100 ? 2.6 : 3.4;
    const mz = narrow ? -1.5 : 0.4;
    spriteBase.set(mx, 0, mz);
    soil.position.set(mx, 0, mz);
    sprout.position.set(mx, 0.55, mz);
    clods.position.set(mx - mound.x, 0, mz - mound.z);
    camBase.set(0, narrow ? 2.2 : 3.1, narrow ? 13.5 : 14);
    lookBase.set(narrow ? 0.4 : 0, narrow ? 5.6 : 2.6, 0);
    // letakkan matahari tepat di belakang tunas (seperti logo)
    const dir = new THREE.Vector3(mx, 3.3, mz).sub(camBase).normalize();
    const t = (-150 - camBase.z) / dir.z;
    sunPos.copy(camBase).addScaledVector(dir, t);
    sunPos.y = Math.max(sunPos.y, 16);
    rays.position.copy(sunPos);
    skyMat.uniforms.uSunDir.value.copy(sunPos).normalize();
  }
  layout();
  window.addEventListener('resize', layout);

  /* ---------------- Interaksi ---------------- */
  const mouse = new THREE.Vector2(), mouseT = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    mouseT.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  let progress = 0;
  let grow = reduced ? 1 : 0;
  let running = true;
  let started = false;
  const clock = new THREE.Clock();
  const look = new THREE.Vector3();
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    uTime.value += reduced ? dt * 0.2 : dt;
    const t = uTime.value;

    if (started && grow < 1) grow = Math.min(1, grow + dt / 2.6);
    const g1 = ease(THREE.MathUtils.clamp(grow / 0.55, 0, 1));
    const g2 = ease(THREE.MathUtils.clamp((grow - 0.35) / 0.65, 0, 1));
    stemGrp.scale.set(1, Math.max(g1, 0.001), 1);
    crown.position.y = (STEM_H - 0.05) * g1;
    crown.scale.setScalar(Math.max(g2, 0.001));
    leaves.forEach((l) => {
      const s = l.userData.side;
      l.rotation.z = THREE.MathUtils.lerp(-s * 0.15, l.userData.open, g2) + Math.sin(t * 1.3 + s) * 0.04;
      l.rotation.x = 0.22 + Math.sin(t * 0.9 + s * 2) * 0.05;
    });
    budPivot.rotation.z = Math.sin(t * 0.8) * 0.03;
    sprout.rotation.z = Math.sin(t * 0.7) * 0.025;
    sprout.rotation.y = -0.25 + Math.sin(t * 0.25) * 0.15 + progress * 0.9;
    aura.material.opacity = 0.75 + Math.sin(t * 1.2) * 0.15;

    rays.lookAt(camera.position);

    clouds.forEach((c, i) => {
      c.position.x += dt * (0.6 + i * 0.12);
      if (c.position.x > 200) c.position.x = -200;
    });

    flies.forEach((b) => {
      const u = b.userData;
      const k = t * u.sp + u.ph;
      const x = spriteBase.x + Math.sin(k) * u.rad;
      const z = spriteBase.z + Math.cos(k * 0.8) * u.rad * 0.8;
      const y = u.cy + Math.sin(k * 2.3) * 0.5;
      const nx = spriteBase.x + Math.sin(k + 0.05) * u.rad;
      const nz = spriteBase.z + Math.cos((k + 0.05) * 0.8) * u.rad * 0.8;
      b.position.set(x, y, z);
      b.lookAt(nx, y, nz);
      const f = Math.sin(t * 16 + u.ph) * 1.05;
      u.L.rotation.z = f; u.R.rotation.z = -f;
      b.visible = grow > 0.8;
    });

    // Kamera: parallax mouse + scroll
    mouse.lerp(mouseT, 0.04);
    const p = progress;
    camera.position.set(
      camBase.x + mouse.x * 0.9 + Math.sin(t * 0.12) * 0.25,
      camBase.y - mouse.y * 0.35 + p * 3.2,
      camBase.z - p * 7.5
    );
    look.set(lookBase.x + mouse.x * 0.3, lookBase.y + p * 1.2, lookBase.z - p * 3);
    camera.lookAt(look);

    renderer.render(scene, camera);
  }
  frame();

  // Hentikan render saat hero tidak terlihat (hemat baterai)
  const io = new IntersectionObserver(([en]) => {
    const vis = en.isIntersecting;
    if (vis && !running) { running = true; clock.getDelta(); frame(); }
    else if (!vis) running = false;
  });
  io.observe(canvas);

  return {
    start() { started = true; },
    setProgress(v) { progress = THREE.MathUtils.clamp(v, 0, 1); },
  };
}
