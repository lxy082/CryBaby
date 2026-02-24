import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PRESETS = [
  {
    name: '奶油粉',
    baseColor: '#f8d4d9',
    eyeColor: '#262626',
    tearColor: '#8fd6ff',
    blushEnabled: true,
    headwear: 'bow'
  },
  {
    name: '薄荷冰',
    baseColor: '#ccf1e5',
    eyeColor: '#1f3a38',
    tearColor: '#86b9ff',
    blushEnabled: true,
    headwear: 'hat'
  },
  {
    name: '葡萄汽水',
    baseColor: '#e6d5ff',
    eyeColor: '#2f2148',
    tearColor: '#9ad8ff',
    blushEnabled: false,
    headwear: 'none'
  },
  {
    name: '蜜桃牛奶',
    baseColor: '#ffe4c9',
    eyeColor: '#4f3228',
    tearColor: '#8ac9ff',
    blushEnabled: true,
    headwear: 'bow'
  },
  {
    name: '云朵白',
    baseColor: '#f7f7fb',
    eyeColor: '#3f4d61',
    tearColor: '#89cfff',
    blushEnabled: true,
    headwear: 'hat'
  }
];

const state = {
  params: { ...PRESETS[0] },
  currentAction: 'idle',
  pendingAction: null,
  transition: 1,
  elapsed: 0,
  blink: 0
};

let scene;
let camera;
let renderer;
let controls;
let clock;
let crybaby;
let particleSystem;

const ui = {
  baseColor: document.getElementById('base-color'),
  eyeColor: document.getElementById('eye-color'),
  tearColor: document.getElementById('tear-color'),
  blushEnabled: document.getElementById('blush-enabled'),
  headwear: document.getElementById('headwear'),
  bgParticles: document.getElementById('bg-particles'),
  enableShadows: document.getElementById('enable-shadows'),
  resetView: document.getElementById('reset-view'),
  capture: document.getElementById('capture'),
  presetButtons: document.getElementById('preset-buttons')
};

function initScene() {
  const container = document.getElementById('scene-wrap');
  const canvas = document.getElementById('three-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const initialW = canvas.clientWidth || container.clientWidth || window.innerWidth;
  const initialH = canvas.clientHeight || container.clientHeight || window.innerHeight;
  renderer.setSize(initialW, initialH, false);
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (!canvas.parentElement) {
    container.appendChild(renderer.domElement);
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, initialW / initialH, 0.1, 100);
  camera.position.set(0, 1.8, 4.6);
  camera.lookAt(0, 1.2, 0);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 1.1, 0);
  controls.minDistance = 2.3;
  controls.maxDistance = 8;

  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff2ef, 1.15);
  keyLight.position.set(2.2, 3.5, 2.4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd2ecff, 0.55);
  fillLight.position.set(-2.2, 2.4, -1.6);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 48),
    new THREE.MeshStandardMaterial({ color: '#fffafc', roughness: 0.95, metalness: 0.02 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  particleSystem = createBackgroundParticles();
  scene.add(particleSystem);

  crybaby = createCrybaby();
  scene.add(crybaby.root);

  clock = new THREE.Clock();
  window.addEventListener('resize', onResize);
}

function makePlasticMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.08
  });
}

function createCrybaby() {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const headGroup = new THREE.Group();
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  const legL = new THREE.Group();
  const legR = new THREE.Group();

  const baseMat = makePlasticMaterial(state.params.baseColor);
  const eyeMat = new THREE.MeshStandardMaterial({ color: state.params.eyeColor, roughness: 0.2, metalness: 0.12 });
  const blushMat = new THREE.MeshStandardMaterial({ color: '#ff9ab5', roughness: 0.6, metalness: 0.02, transparent: true, opacity: 0.7 });
  const tearMat = new THREE.MeshStandardMaterial({
    color: state.params.tearColor,
    roughness: 0.1,
    metalness: 0.05,
    transparent: true,
    opacity: 0.75
  });

  bodyGroup.position.y = 0.85;
  root.add(bodyGroup);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.65, 10, 20), baseMat);
  body.castShadow = true;
  body.receiveShadow = true;
  bodyGroup.add(body);

  headGroup.position.y = 0.95;
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.82, 40, 34), baseMat);
  head.castShadow = true;
  head.receiveShadow = true;
  headGroup.add(head);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 22, 22), eyeMat);
  eyeL.position.set(-0.23, 0.08, 0.67);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.23;
  headGroup.add(eyeL, eyeR);

  const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.033, 14, 14), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
  eyeWhiteL.position.set(-0.18, 0.13, 0.74);
  const eyeWhiteR = eyeWhiteL.clone();
  eyeWhiteR.position.x = 0.28;
  headGroup.add(eyeWhiteL, eyeWhiteR);

  const blushL = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), blushMat);
  blushL.position.set(-0.37, -0.09, 0.64);
  const blushR = blushL.clone();
  blushR.position.x = 0.37;
  headGroup.add(blushL, blushR);

  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.015, 12, 22, Math.PI),
    new THREE.MeshStandardMaterial({ color: '#8d4a62', roughness: 0.4 })
  );
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -0.25, 0.66);
  headGroup.add(mouth);

  const tearGeo = new THREE.ConeGeometry(0.07, 0.2, 20, 1);
  tearGeo.translate(0, -0.1, 0);
  const tearL = new THREE.Mesh(tearGeo, tearMat);
  tearL.position.set(-0.23, -0.03, 0.67);
  tearL.rotation.x = Math.PI;
  const tearR = tearL.clone();
  tearR.position.x = 0.23;
  headGroup.add(tearL, tearR);

  armL.position.set(-0.55, 0.53, 0);
  armR.position.set(0.55, 0.53, 0);
  bodyGroup.add(armL, armR);

  const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.42, 8, 16), baseMat);
  armMesh.rotation.z = Math.PI / 2;
  armMesh.position.set(0, -0.22, 0);
  armMesh.castShadow = true;
  const armMeshR = armMesh.clone();
  armL.add(armMesh);
  armR.add(armMeshR);

  legL.position.set(-0.22, -0.05, 0);
  legR.position.set(0.22, -0.05, 0);
  bodyGroup.add(legL, legR);

  const legMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.32, 8, 16), baseMat);
  legMesh.position.set(0, -0.32, 0.06);
  legMesh.castShadow = true;
  const legMeshR = legMesh.clone();
  legL.add(legMesh);
  legR.add(legMeshR);

  const bowGroup = new THREE.Group();
  const bowMat = new THREE.MeshStandardMaterial({ color: '#ff6ba8', roughness: 0.35, metalness: 0.05 });
  const bowL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 16), bowMat);
  bowL.scale.set(1.35, 0.95, 0.8);
  bowL.position.set(-0.11, 0, 0);
  const bowR = bowL.clone();
  bowR.position.x = 0.11;
  const bowMid = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 14), bowMat);
  bowGroup.add(bowL, bowR, bowMid);
  bowGroup.position.set(0, 0.86, 0.15);
  headGroup.add(bowGroup);

  const hatGroup = new THREE.Group();
  const hatMat = new THREE.MeshStandardMaterial({ color: '#8ab3ff', roughness: 0.5, metalness: 0.06 });
  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.25, 28), hatMat);
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 28), hatMat);
  hatTop.position.y = 0.08;
  hatGroup.add(hatTop, hatBrim);
  hatGroup.position.set(0.22, 0.9, 0.15);
  headGroup.add(hatGroup);

  const heart = createHeartMesh();
  heart.visible = false;
  heart.position.set(0, 0.33, 0.76);
  bodyGroup.add(heart);

  return {
    root,
    bodyGroup,
    headGroup,
    armL,
    armR,
    legL,
    legR,
    head,
    eyes: [eyeL, eyeR],
    blushes: [blushL, blushR],
    tears: [tearL, tearR],
    materials: { baseMat, eyeMat, tearMat },
    decorations: { bowGroup, hatGroup },
    heart
  };
}

function createHeartMesh() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0, 0.14, -0.22, 0.2, -0.22, 0.02);
  shape.bezierCurveTo(-0.22, -0.15, 0, -0.23, 0, -0.1);
  shape.bezierCurveTo(0, -0.23, 0.22, -0.15, 0.22, 0.02);
  shape.bezierCurveTo(0.22, 0.2, 0, 0.14, 0, 0);
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshStandardMaterial({
    color: '#ff4f96',
    emissive: '#ff2f7c',
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(0.42, 0.42, 0.42);
  return mesh;
}

function createBackgroundParticles() {
  const count = 150;
  const pos = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 7;
    pos[i * 3 + 1] = Math.random() * 5 - 0.2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 7;

    const c = new THREE.Color(i % 2 ? '#ffc5df' : '#bfe8ff');
    color[i * 3] = c.r;
    color[i * 3 + 1] = c.g;
    color[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.07,
    transparent: true,
    opacity: 0.7,
    vertexColors: true
  });
  return new THREE.Points(geo, mat);
}

function applyParams() {
  const p = state.params;
  crybaby.materials.baseMat.color.set(p.baseColor);
  crybaby.materials.eyeMat.color.set(p.eyeColor);
  crybaby.materials.tearMat.color.set(p.tearColor);

  crybaby.blushes.forEach((b) => (b.visible = p.blushEnabled));
  crybaby.decorations.bowGroup.visible = p.headwear === 'bow';
  crybaby.decorations.hatGroup.visible = p.headwear === 'hat';

  ui.baseColor.value = p.baseColor;
  ui.eyeColor.value = p.eyeColor;
  ui.tearColor.value = p.tearColor;
  ui.blushEnabled.checked = p.blushEnabled;
  ui.headwear.value = p.headwear;
}

function resetPose(delta) {
  const parts = [
    crybaby.headGroup,
    crybaby.bodyGroup,
    crybaby.armL,
    crybaby.armR,
    crybaby.legL,
    crybaby.legR
  ];
  const snap = 1 - Math.exp(-delta * 10);
  parts.forEach((part) => {
    part.rotation.x += (0 - part.rotation.x) * snap;
    part.rotation.y += (0 - part.rotation.y) * snap;
    part.rotation.z += (0 - part.rotation.z) * snap;
  });

  crybaby.armL.position.y += (0.53 - crybaby.armL.position.y) * snap;
  crybaby.armR.position.y += (0.53 - crybaby.armR.position.y) * snap;
  crybaby.legL.position.x += (-0.22 - crybaby.legL.position.x) * snap;
  crybaby.legR.position.x += (0.22 - crybaby.legR.position.x) * snap;

  const done =
    Math.abs(crybaby.headGroup.rotation.y) < 0.01 &&
    Math.abs(crybaby.armL.rotation.z) < 0.01 &&
    Math.abs(crybaby.bodyGroup.rotation.z) < 0.01;
  return done;
}

function setAction(actionName) {
  if (state.currentAction === actionName) return;
  state.pendingAction = actionName;
  state.transition = 0;
}

function runIdle(t) {
  crybaby.bodyGroup.position.y = 0.85 + Math.sin(t * 2) * 0.03;
  crybaby.bodyGroup.scale.y = 1 + Math.sin(t * 2) * 0.02;
  crybaby.headGroup.rotation.x += Math.sin(t * 1.2) * 0.0018;

  const blinkWave = Math.sin(t * 2.6);
  if (blinkWave > 0.987) state.blink = 0.1;
  state.blink += (1 - state.blink) * 0.35;
  crybaby.eyes.forEach((eye) => {
    eye.scale.y = THREE.MathUtils.clamp(state.blink, 0.1, 1);
  });
}

function runHeart(t) {
  const armSwing = Math.sin(t * 6) * 0.03;
  crybaby.armL.rotation.z = -1.05 + armSwing;
  crybaby.armR.rotation.z = 1.05 - armSwing;
  crybaby.armL.rotation.x = -0.5;
  crybaby.armR.rotation.x = -0.5;
  crybaby.armL.position.y = 0.62;
  crybaby.armR.position.y = 0.62;
  crybaby.heart.visible = true;
  const pulse = 1 + Math.sin(t * 6) * 0.12;
  crybaby.heart.scale.setScalar(0.42 * pulse);
  crybaby.heart.material.opacity = 0.75 + Math.sin(t * 6) * 0.1;
}

function runDance(t) {
  crybaby.bodyGroup.rotation.z = Math.sin(t * 2.2) * 0.22;
  crybaby.headGroup.rotation.y = Math.sin(t * 2.2) * 0.28;
  crybaby.headGroup.rotation.x = Math.cos(t * 3.1) * 0.13;
  crybaby.armL.rotation.z = -0.6 + Math.sin(t * 4.4) * 0.5;
  crybaby.armR.rotation.z = 0.6 - Math.sin(t * 4.4 + 0.8) * 0.5;
  crybaby.legL.position.x = -0.22 + Math.sin(t * 3.2) * 0.08;
  crybaby.legR.position.x = 0.22 + Math.sin(t * 3.2 + Math.PI) * 0.08;
}

function runCry(t) {
  crybaby.headGroup.rotation.y = Math.sin(t * 20) * 0.14;
  crybaby.headGroup.rotation.x = Math.sin(t * 12) * 0.08;
  crybaby.bodyGroup.scale.y = 1 + Math.sin(t * 11) * 0.04;
  crybaby.armL.rotation.z = -0.25 + Math.sin(t * 14) * 0.15;
  crybaby.armR.rotation.z = 0.25 - Math.sin(t * 14) * 0.15;

  crybaby.tears.forEach((tear, i) => {
    const phase = t * 8 + i * 0.6;
    tear.position.y = -0.03 - Math.abs(Math.sin(phase)) * 0.17;
    tear.material.opacity = 0.45 + Math.abs(Math.sin(phase)) * 0.4;
  });
}

function animateLoop() {
  const delta = clock.getDelta();
  state.elapsed += delta;

  controls.update();
  runIdle(state.elapsed);

  if (state.transition < 1) {
    const ready = resetPose(delta);
    state.transition += delta * 2.2;
    if (ready && state.transition > 0.95) {
      state.currentAction = state.pendingAction || 'idle';
      state.pendingAction = null;
    }
  }

  if (state.currentAction === 'heart') runHeart(state.elapsed);
  if (state.currentAction === 'dance') runDance(state.elapsed);
  if (state.currentAction === 'cry') runCry(state.elapsed);
  if (state.currentAction !== 'heart') crybaby.heart.visible = false;

  if (particleSystem.visible) {
    particleSystem.rotation.y += delta * 0.08;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animateLoop);
}

function captureScreenshot() {
  renderer.render(scene, camera);
  const link = document.createElement('a');
  link.href = renderer.domElement.toDataURL('image/png');
  link.download = `crybaby-${Date.now()}.png`;
  link.click();
}

function onResize() {
  const canvas = renderer.domElement;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function bindUI() {
  PRESETS.forEach((preset, idx) => {
    const btn = document.createElement('button');
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      state.params = { ...preset };
      applyParams();
    });
    if (idx === 0) btn.classList.add('active');
    ui.presetButtons.appendChild(btn);
  });

  ui.baseColor.addEventListener('input', (e) => {
    state.params.baseColor = e.target.value;
    applyParams();
  });
  ui.eyeColor.addEventListener('input', (e) => {
    state.params.eyeColor = e.target.value;
    applyParams();
  });
  ui.tearColor.addEventListener('input', (e) => {
    state.params.tearColor = e.target.value;
    applyParams();
  });
  ui.blushEnabled.addEventListener('change', (e) => {
    state.params.blushEnabled = e.target.checked;
    applyParams();
  });
  ui.headwear.addEventListener('change', (e) => {
    state.params.headwear = e.target.value;
    applyParams();
  });

  ui.bgParticles.addEventListener('change', (e) => {
    particleSystem.visible = e.target.checked;
  });

  ui.enableShadows.addEventListener('change', (e) => {
    renderer.shadowMap.enabled = e.target.checked;
    crybaby.root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = e.target.checked;
        obj.receiveShadow = e.target.checked;
      }
    });
  });

  ui.resetView.addEventListener('click', () => {
    camera.position.set(0, 1.8, 4.6);
    controls.target.set(0, 1.1, 0);
    controls.update();
  });

  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => setAction(btn.dataset.action));
  });

  ui.capture.addEventListener('click', captureScreenshot);
}

initScene();
bindUI();
applyParams();
animateLoop();
