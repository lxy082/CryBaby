import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const PRESETS = [
  { name: '经典白', baseColor: '#f7f8f9', eyeColor: '#111111', badgeColor: '#f5b6d8', showBadge: false },
  { name: '奶油白', baseColor: '#f7f2e8', eyeColor: '#141414', badgeColor: '#f7c6a7', showBadge: false },
  { name: '樱花粉', baseColor: '#f6d6e2', eyeColor: '#1a1a1a', badgeColor: '#f08ab8', showBadge: true },
  { name: '天空蓝', baseColor: '#cfe6ff', eyeColor: '#0f2234', badgeColor: '#6ea9ff', showBadge: true },
  { name: '薄荷绿', baseColor: '#d3f1e5', eyeColor: '#163228', badgeColor: '#78d9b3', showBadge: true },
  { name: '梦幻紫', baseColor: '#ddd2ff', eyeColor: '#231844', badgeColor: '#ab8eff', showBadge: true },
  { name: '钛灰', baseColor: '#c8ced4', eyeColor: '#1c1f22', badgeColor: '#8d99a6', showBadge: true },
  { name: '夜行黑', baseColor: '#1d2127', eyeColor: '#fafafa', badgeColor: '#677288', showBadge: true }
];

const state = {
  params: { ...PRESETS[0] },
  currentAction: 'idle',
  targetAction: 'idle',
  phase: 'action',
  elapsed: 0,
  blink: 1,
  bodyTurn: 0,
  neutralBlend: 1
};

let scene;
let camera;
let renderer;
let controls;
let clock;
let baymax;

const neutralPose = {
  shoulderL: { x: 0, y: 0, z: 0.22 },
  shoulderR: { x: 0, y: 0, z: -0.22 },
  elbowL: { x: 0, y: 0, z: 0 },
  elbowR: { x: 0, y: 0, z: 0 },
  hipL: { x: 0, y: 0, z: 0.06 },
  hipR: { x: 0, y: 0, z: -0.06 },
  kneeL: { x: 0, y: 0, z: 0 },
  kneeR: { x: 0, y: 0, z: 0 },
  bodyRot: { x: 0, y: 0, z: 0 },
  headRot: { x: 0, y: 0, z: 0 },
  rootY: 0,
  rootYaw: 0
};

const ui = {
  baseColor: document.getElementById('base-color'),
  eyeColor: document.getElementById('eye-color'),
  badgeColor: document.getElementById('badge-color'),
  showBadge: document.getElementById('show-chest-badge'),
  enableShadows: document.getElementById('enable-shadows'),
  resetView: document.getElementById('reset-view'),
  capture: document.getElementById('capture'),
  presetButtons: document.getElementById('preset-buttons')
};

function makeBodyMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.52,
    metalness: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.64
  });
}

function initScene() {
  const canvas = document.getElementById('three-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 1.7, 4.3);
  camera.lookAt(0, 1.05, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.05, 0);
  controls.minDistance = 2.1;
  controls.maxDistance = 7.2;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8393a1, 0.9);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(2.8, 4.2, 2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdde8f4, 0.5);
  fill.position.set(-3, 2.4, -2.2);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.8, 72),
    new THREE.MeshStandardMaterial({ color: '#d3dde6', roughness: 0.95, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  baymax = createBaymax();
  scene.add(baymax.root);

  clock = new THREE.Clock();
  window.addEventListener('resize', onResize);
}

function createBaymax() {
  const root = new THREE.Group();
  root.position.y = 0.02;

  const bodyMat = makeBodyMaterial(state.params.baseColor);
  const eyeMat = new THREE.MeshStandardMaterial({ color: state.params.eyeColor, roughness: 0.2, metalness: 0.05 });
  const lineMat = new THREE.MeshStandardMaterial({ color: state.params.eyeColor, roughness: 0.25, metalness: 0.05 });
  const badgeMat = new THREE.MeshStandardMaterial({ color: state.params.badgeColor, roughness: 0.5, metalness: 0.02 });

  const pelvis = new THREE.Group();
  pelvis.position.y = 0.78;
  root.add(pelvis);

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.52;
  pelvis.add(bodyGroup);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.95, 48, 40), bodyMat);
  torso.scale.set(1.0, 1.16, 0.92);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  const chestLine = new THREE.Mesh(
    new THREE.TorusGeometry(0.67, 0.008, 10, 80),
    new THREE.MeshStandardMaterial({ color: '#d8dce0', roughness: 0.8, metalness: 0 })
  );
  chestLine.rotation.x = Math.PI / 2;
  chestLine.position.set(0, 0.29, 0);
  bodyGroup.add(chestLine);

  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.09, 32), badgeMat);
  badge.position.set(0.28, 0.3, 0.78);
  badge.visible = state.params.showBadge;
  bodyGroup.add(badge);

  const headPivot = new THREE.Group();
  headPivot.position.y = 1.5;
  pelvis.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 24), bodyMat);
  head.scale.set(1.26, 0.83, 0.98);
  head.castShadow = true;
  headPivot.add(head);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 16), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.11, 0.01, 0.29);
  eyeR.position.set(0.11, 0.01, 0.29);
  headPivot.add(eyeL, eyeR);

  const eyeBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 12), lineMat);
  eyeBridge.rotation.z = Math.PI / 2;
  eyeBridge.position.set(0, 0.01, 0.29);
  headPivot.add(eyeBridge);

  const shoulderL = new THREE.Group();
  const shoulderR = new THREE.Group();
  shoulderL.position.set(-0.8, 1.22, 0);
  shoulderR.position.set(0.8, 1.22, 0);
  pelvis.add(shoulderL, shoulderR);

  const upperArmGeo = new THREE.CapsuleGeometry(0.16, 0.72, 8, 18);
  const foreArmGeo = new THREE.CapsuleGeometry(0.14, 0.62, 8, 16);

  const upperArmL = new THREE.Mesh(upperArmGeo, bodyMat);
  upperArmL.position.y = -0.46;
  upperArmL.castShadow = true;
  shoulderL.add(upperArmL);

  const upperArmR = upperArmL.clone();
  shoulderR.add(upperArmR);

  const elbowL = new THREE.Group();
  const elbowR = new THREE.Group();
  elbowL.position.y = -0.9;
  elbowR.position.y = -0.9;
  shoulderL.add(elbowL);
  shoulderR.add(elbowR);

  const foreArmL = new THREE.Mesh(foreArmGeo, bodyMat);
  foreArmL.position.y = -0.38;
  foreArmL.castShadow = true;
  elbowL.add(foreArmL);

  const foreArmR = foreArmL.clone();
  elbowR.add(foreArmR);

  const handGeo = new THREE.SphereGeometry(0.17, 24, 20);
  const handL = new THREE.Mesh(handGeo, bodyMat);
  handL.scale.set(1.05, 0.92, 1.12);
  handL.position.y = -0.76;
  handL.castShadow = true;
  elbowL.add(handL);

  const handR = handL.clone();
  elbowR.add(handR);

  const hipL = new THREE.Group();
  const hipR = new THREE.Group();
  hipL.position.set(-0.36, 0.02, 0);
  hipR.position.set(0.36, 0.02, 0);
  pelvis.add(hipL, hipR);

  const thighGeo = new THREE.CapsuleGeometry(0.2, 0.44, 8, 14);
  const shinGeo = new THREE.CapsuleGeometry(0.18, 0.33, 8, 14);

  const thighL = new THREE.Mesh(thighGeo, bodyMat);
  thighL.position.y = -0.36;
  thighL.castShadow = true;
  hipL.add(thighL);

  const thighR = thighL.clone();
  hipR.add(thighR);

  const kneeL = new THREE.Group();
  const kneeR = new THREE.Group();
  kneeL.position.y = -0.74;
  kneeR.position.y = -0.74;
  hipL.add(kneeL, kneeR);

  const shinL = new THREE.Mesh(shinGeo, bodyMat);
  shinL.position.y = -0.25;
  shinL.castShadow = true;
  kneeL.add(shinL);

  const shinR = shinL.clone();
  kneeR.add(shinR);

  const footGeo = new THREE.SphereGeometry(0.23, 28, 20);
  const footL = new THREE.Mesh(footGeo, bodyMat);
  footL.scale.set(1.45, 0.62, 1.7);
  footL.position.set(0, -0.5, 0.13);
  footL.castShadow = true;
  footL.rotation.y = 0.08;
  kneeL.add(footL);

  const footR = footL.clone();
  footR.rotation.y = -0.08;
  kneeR.add(footR);

  const heart = createHeartMesh();
  heart.visible = false;
  heart.position.set(0, 1.26, 0.9);
  pelvis.add(heart);

  return {
    root,
    pelvis,
    bodyGroup,
    headPivot,
    shoulderL,
    shoulderR,
    elbowL,
    elbowR,
    hipL,
    hipR,
    kneeL,
    kneeR,
    heart,
    badge,
    materials: { bodyMat, eyeMat, lineMat, badgeMat }
  };
}

function createHeartMesh() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0, 0.18, -0.25, 0.22, -0.25, 0.02);
  shape.bezierCurveTo(-0.25, -0.18, 0, -0.27, 0, -0.12);
  shape.bezierCurveTo(0, -0.27, 0.25, -0.18, 0.25, 0.02);
  shape.bezierCurveTo(0.25, 0.22, 0, 0.18, 0, 0);
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshStandardMaterial({
    color: '#ff6fa8',
    emissive: '#ff4f96',
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(0.42);
  return mesh;
}

function applyParams(syncUI = true) {
  const p = state.params;
  baymax.materials.bodyMat.color.set(p.baseColor);
  baymax.materials.eyeMat.color.set(p.eyeColor);
  baymax.materials.lineMat.color.set(p.eyeColor);
  baymax.materials.badgeMat.color.set(p.badgeColor);
  baymax.badge.visible = p.showBadge;

  if (syncUI) {
    ui.baseColor.value = p.baseColor;
    ui.eyeColor.value = p.eyeColor;
    ui.badgeColor.value = p.badgeColor;
    ui.showBadge.checked = p.showBadge;
  }
}

function setAction(action) {
  if (state.targetAction === action) return;
  state.targetAction = action;
  state.phase = 'toNeutral';
  state.neutralBlend = 0;
}

function damp(current, target, speed, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * dt));
}

function dampRotation(group, target, dt, speed = 10) {
  group.rotation.x = damp(group.rotation.x, target.x, speed, dt);
  group.rotation.y = damp(group.rotation.y, target.y, speed, dt);
  group.rotation.z = damp(group.rotation.z, target.z, speed, dt);
}

function applyNeutral(dt) {
  dampRotation(baymax.shoulderL, neutralPose.shoulderL, dt);
  dampRotation(baymax.shoulderR, neutralPose.shoulderR, dt);
  dampRotation(baymax.elbowL, neutralPose.elbowL, dt);
  dampRotation(baymax.elbowR, neutralPose.elbowR, dt);
  dampRotation(baymax.hipL, neutralPose.hipL, dt);
  dampRotation(baymax.hipR, neutralPose.hipR, dt);
  dampRotation(baymax.kneeL, neutralPose.kneeL, dt);
  dampRotation(baymax.kneeR, neutralPose.kneeR, dt);
  dampRotation(baymax.bodyGroup, neutralPose.bodyRot, dt, 7);
  dampRotation(baymax.headPivot, neutralPose.headRot, dt, 7);

  baymax.root.position.y = damp(baymax.root.position.y, neutralPose.rootY, 8, dt);
  state.bodyTurn = damp(state.bodyTurn, neutralPose.rootYaw, 8, dt);
  baymax.root.rotation.y = state.bodyTurn;

  const score =
    Math.abs(baymax.shoulderL.rotation.z - neutralPose.shoulderL.z) +
    Math.abs(baymax.shoulderR.rotation.z - neutralPose.shoulderR.z) +
    Math.abs(baymax.bodyGroup.rotation.z) +
    Math.abs(baymax.headPivot.rotation.x) +
    Math.abs(baymax.root.rotation.y);

  return score < 0.05;
}

function runIdle(t, dt) {
  baymax.root.position.y += Math.sin(t * 2.1) * 0.0008;
  baymax.bodyGroup.scale.y = 1 + Math.sin(t * 2.1) * 0.015;
  baymax.bodyGroup.rotation.z += Math.sin(t * 1.3) * 0.0008;
  baymax.headPivot.rotation.y += Math.sin(t * 0.8) * 0.0012;

  if (Math.sin(t * 2.9) > 0.992) state.blink = 0.2;
  state.blink = damp(state.blink, 1, 14, dt);
  const eyeScale = THREE.MathUtils.clamp(state.blink, 0.2, 1);
  baymax.materials.eyeMat.emissiveIntensity = 0;
  baymax.headPivot.children.forEach((obj) => {
    if (obj.geometry && obj.geometry.type === 'SphereGeometry' && obj.material === baymax.materials.eyeMat) {
      obj.scale.y = eyeScale;
    }
  });
}

function runWave(t) {
  baymax.shoulderR.rotation.x = -1.2;
  baymax.shoulderR.rotation.z = -0.45;
  baymax.elbowR.rotation.x = -0.58;
  baymax.elbowR.rotation.y = Math.sin(t * 5.5) * 0.45;
  baymax.headPivot.rotation.y = Math.sin(t * 2.6) * 0.08;
}

function runHeart(t) {
  baymax.shoulderL.rotation.x = -0.9;
  baymax.shoulderR.rotation.x = -0.9;
  baymax.shoulderL.rotation.z = 0.2;
  baymax.shoulderR.rotation.z = -0.2;
  baymax.elbowL.rotation.x = -1.15;
  baymax.elbowR.rotation.x = -1.15;
  baymax.elbowL.rotation.y = 0.24;
  baymax.elbowR.rotation.y = -0.24;
  baymax.heart.visible = true;
  const pulse = 1 + Math.sin(t * 6) * 0.13;
  baymax.heart.scale.setScalar(0.42 * pulse);
  baymax.heart.material.opacity = 0.62 + 0.25 * (Math.sin(t * 6) * 0.5 + 0.5);
}

function runDance(t) {
  baymax.bodyGroup.rotation.z = Math.sin(t * 2.1) * 0.2;
  baymax.headPivot.rotation.y = Math.sin(t * 2.1) * 0.25;
  baymax.shoulderL.rotation.z = 0.5 + Math.sin(t * 4.2) * 0.55;
  baymax.shoulderR.rotation.z = -0.5 - Math.sin(t * 4.2 + 1) * 0.55;
  baymax.hipL.rotation.x = Math.sin(t * 3) * 0.22;
  baymax.hipR.rotation.x = Math.sin(t * 3 + Math.PI) * 0.22;
  baymax.root.position.y = 0.02 + Math.abs(Math.sin(t * 3.1)) * 0.06;
}

function runSpin(t) {
  state.bodyTurn = (t * 0.85) % (Math.PI * 2);
  baymax.root.rotation.y = state.bodyTurn;
  baymax.headPivot.rotation.y = Math.sin(t * 1.2) * 0.12;
}

function runHug() {
  baymax.shoulderL.rotation.x = -0.85;
  baymax.shoulderR.rotation.x = -0.85;
  baymax.shoulderL.rotation.z = 0.38;
  baymax.shoulderR.rotation.z = -0.38;
  baymax.elbowL.rotation.x = -0.95;
  baymax.elbowR.rotation.x = -0.95;
  baymax.bodyGroup.rotation.x = 0.12;
  baymax.headPivot.rotation.x = -0.08;
}

function runComfort(t) {
  baymax.headPivot.rotation.x = Math.sin(t * 3.1) * 0.18;
  baymax.shoulderR.rotation.x = -0.72;
  baymax.elbowR.rotation.x = -1.0 + Math.sin(t * 3.1) * 0.2;
  baymax.shoulderL.rotation.z = 0.18;
  baymax.bodyGroup.rotation.z = Math.sin(t * 3.1) * 0.04;
}

function animateLoop() {
  const dt = clock.getDelta();
  state.elapsed += dt;
  const t = state.elapsed;

  controls.update();
  runIdle(t, dt);

  if (state.phase === 'toNeutral') {
    const done = applyNeutral(dt);
    if (done) {
      state.currentAction = state.targetAction;
      state.phase = 'action';
    }
  }

  baymax.heart.visible = false;

  if (state.phase === 'action') {
    if (state.currentAction === 'wave') runWave(t);
    if (state.currentAction === 'heart') runHeart(t);
    if (state.currentAction === 'dance') runDance(t);
    if (state.currentAction === 'spin') runSpin(t);
    if (state.currentAction === 'hug') runHug();
    if (state.currentAction === 'comfort') runComfort(t);
    if (state.currentAction === 'idle') applyNeutral(dt);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animateLoop);
}

function captureScreenshot() {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = `baymax-${Date.now()}.png`;
  a.click();
}

function onResize() {
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function bindUI() {
  PRESETS.forEach((preset) => {
    const btn = document.createElement('button');
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      state.params = { ...preset };
      applyParams(true);
    });
    ui.presetButtons.appendChild(btn);
  });

  ui.baseColor.addEventListener('input', (e) => {
    state.params.baseColor = e.target.value;
    applyParams(false);
  });
  ui.eyeColor.addEventListener('input', (e) => {
    state.params.eyeColor = e.target.value;
    applyParams(false);
  });
  ui.badgeColor.addEventListener('input', (e) => {
    state.params.badgeColor = e.target.value;
    applyParams(false);
  });
  ui.showBadge.addEventListener('change', (e) => {
    state.params.showBadge = e.target.checked;
    applyParams(false);
  });

  ui.enableShadows.addEventListener('change', (e) => {
    renderer.shadowMap.enabled = e.target.checked;
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = e.target.checked;
      }
    });
  });

  ui.resetView.addEventListener('click', () => {
    camera.position.set(0, 1.7, 4.3);
    controls.target.set(0, 1.05, 0);
    controls.update();
  });

  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => setAction(btn.dataset.action));
  });

  ui.capture.addEventListener('click', captureScreenshot);
}

initScene();
bindUI();
applyParams(true);
animateLoop();
