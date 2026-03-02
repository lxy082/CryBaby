console.log('[boot] main.js loaded');
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

console.log('[boot] THREE version:', THREE.REVISION);

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

const state = {
  params: { ...PRESETS[0] },
  elapsed: 0,
  currentAction: 'idle',
  fromAction: 'idle',
  actionStartAt: 0,
  fromActionStartAt: 0,
  transition: 1,
  transitionDuration: 0.65,
  blink: 1,
  rootYaw: 0
};

const poseNeutral = {
  body: { x: 0, y: 0, z: 0 },
  head: { x: 0, y: 0, z: 0 },
  shoulderL: { x: 0.08, y: -0.06, z: 0.16 },
  shoulderR: { x: 0.08, y: 0.06, z: -0.16 },
  elbowL: { x: 0.14 },
  elbowR: { x: 0.14 },
  legL: { x: 0.02, y: 0, z: 0.03 },
  legR: { x: 0.02, y: 0, z: -0.03 },
  rootY: 0,
  rootYaw: 0,
  showHeart: false,
  showFlower: false
};

const armMeta = {
  L: { shoulderPos: new THREE.Vector3(-0.76, 1.54, 0.06), yaw: [-0.9, 0.35], roll: [0.02, 1.05], pitch: [-1.38, 0.95] },
  R: { shoulderPos: new THREE.Vector3(0.76, 1.54, 0.06), yaw: [-0.35, 0.9], roll: [-1.05, -0.02], pitch: [-1.38, 0.95] }
};

// 3) 碰撞约束升级：椭球检测 + 迭代 push-out 的实现（与躯干尺寸对齐）
const torsoCollider = {
  center: new THREE.Vector3(0, 1.34, 0.03),
  radii: new THREE.Vector3(0.92, 1.12, 0.82)
};

let scene;
let camera;
let renderer;
let controls;
let clock;
let baymax;

function clonePose(base) {
  return JSON.parse(JSON.stringify(base));
}

function clamp(v, min, max) {
  return THREE.MathUtils.clamp(v, min, max);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep01(t) {
  return t * t * (3 - 2 * t);
}

function makeBodyMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.67,
    metalness: 0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.62
  });
}

function initScene() {
  const container = document.getElementById('scene-wrap');
  const canvas = document.getElementById('three-canvas');

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const w = canvas.clientWidth || container.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || container.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (!renderer.domElement.parentElement) container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  camera.position.set(0, 1.95, 4.8);
  camera.lookAt(0, 1.3, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.28, 0);
  controls.minDistance = 2.2;
  controls.maxDistance = 7.6;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x95a7b8, 0.9));

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2.8, 4.5, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xddebf7, 0.44);
  fill.position.set(-3.2, 2.6, -2.3);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 96),
    new THREE.MeshStandardMaterial({ color: '#cdd8e2', roughness: 0.95, metalness: 0 })
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

  const bodyMat = makeBodyMaterial(state.params.baseColor);
  const eyeMat = new THREE.MeshBasicMaterial({ color: state.params.eyeColor });
  const badgeMat = new THREE.MeshStandardMaterial({ color: state.params.badgeColor, roughness: 0.5, metalness: 0.02 });

  const pelvis = new THREE.Group();
  pelvis.position.y = 0.8;
  root.add(pelvis);

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.54;
  pelvis.add(bodyGroup);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 46), bodyMat);
  torso.scale.set(1.0, 1.21, 0.9);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  const chestLine = new THREE.Mesh(
    new THREE.TorusGeometry(0.69, 0.009, 12, 100),
    new THREE.MeshStandardMaterial({ color: '#dfe4ea', roughness: 0.8, metalness: 0 })
  );
  chestLine.rotation.x = Math.PI / 2;
  chestLine.position.set(0, 0.34, 0.01);
  bodyGroup.add(chestLine);

  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.08, 30), badgeMat);
  badge.position.set(0.3, 0.34, 0.81);
  badge.visible = state.params.showBadge;
  bodyGroup.add(badge);

  // 1) head/legs 修正：头上移+前移，并增加肩颈过渡件（collar）避免深埋
  const collar = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), bodyMat);
  collar.scale.set(1.7, 0.34, 1.25);
  collar.position.set(0, 1.24, 0.04);
  collar.castShadow = true;
  bodyGroup.add(collar);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.68, 0.13);
  pelvis.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.335, 36, 26), bodyMat);
  head.scale.set(1.3, 0.84, 1.0);
  head.castShadow = true;
  headGroup.add(head);

  // 眼睛与眼线：黑点+细线，前置并抬高，防 z-fighting
  const eyeY = 0.032;
  const eyeZ = 0.338;
  const eyeGap = 0.113;
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 16), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-eyeGap, eyeY, eyeZ);
  eyeR.position.set(eyeGap, eyeY, eyeZ);
  const eyeLine = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, eyeGap * 2, 10), eyeMat);
  eyeLine.rotation.z = Math.PI / 2;
  eyeLine.position.set(0, eyeY, eyeZ + 0.004);
  headGroup.add(eyeL, eyeR, eyeLine);

  // 2) arms 重做：扁截面手臂 + shoulderPad + 肩枢轴位置逻辑（贴身体侧并有软胶过渡）
  const shoulderL = new THREE.Group();
  const shoulderR = new THREE.Group();
  shoulderL.position.copy(armMeta.L.shoulderPos);
  shoulderR.position.copy(armMeta.R.shoulderPos);
  pelvis.add(shoulderL, shoulderR);

  const shoulderPadGeo = new THREE.SphereGeometry(0.23, 22, 18);
  const shoulderPadL = new THREE.Mesh(shoulderPadGeo, bodyMat);
  shoulderPadL.scale.set(1.28, 0.95, 1.15);
  shoulderPadL.position.set(-0.06, 0.01, 0.02);
  shoulderPadL.castShadow = true;
  shoulderL.add(shoulderPadL);

  const shoulderPadR = shoulderPadL.clone();
  shoulderPadR.position.x = 0.06;
  shoulderR.add(shoulderPadR);

  const upperLen = 0.95;
  const foreLen = 0.9;
  const upperArmGeo = new THREE.CapsuleGeometry(0.106, upperLen, 9, 18);
  const foreArmGeo = new THREE.CapsuleGeometry(0.098, foreLen, 9, 18);

  const upperArmL = new THREE.Mesh(upperArmGeo, bodyMat);
  upperArmL.scale.set(0.84, 1.0, 1.18);
  upperArmL.position.y = -(upperLen * 0.5 + 0.11);
  upperArmL.castShadow = true;
  shoulderL.add(upperArmL);

  const upperArmR = upperArmL.clone();
  shoulderR.add(upperArmR);

  const elbowL = new THREE.Group();
  const elbowR = new THREE.Group();
  elbowL.position.y = -(upperLen + 0.22);
  elbowR.position.y = -(upperLen + 0.22);
  shoulderL.add(elbowL);
  shoulderR.add(elbowR);

  const foreArmL = new THREE.Mesh(foreArmGeo, bodyMat);
  foreArmL.scale.set(0.86, 1.0, 1.16);
  foreArmL.position.y = -(foreLen * 0.5 + 0.08);
  foreArmL.castShadow = true;
  elbowL.add(foreArmL);

  const foreArmR = foreArmL.clone();
  elbowR.add(foreArmR);

  const handLGroup = new THREE.Group();
  const handRGroup = new THREE.Group();
  handLGroup.position.y = -(foreLen + 0.14);
  handRGroup.position.y = -(foreLen + 0.14);
  elbowL.add(handLGroup);
  elbowR.add(handRGroup);

  const handGeo = new THREE.SphereGeometry(0.155, 24, 20);
  const handL = new THREE.Mesh(handGeo, bodyMat);
  handL.scale.set(0.98, 0.88, 1.16);
  handL.castShadow = true;
  handLGroup.add(handL);

  const handR = handL.clone();
  handRGroup.add(handR);

  // 1) head/legs 修正：短腿单段且下移，脚掌扁椭球露出地面上方
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.26, -0.02, 0.02);
  legR.position.set(0.26, -0.02, 0.02);
  pelvis.add(legL, legR);

  const legGeo = new THREE.CapsuleGeometry(0.19, 0.3, 8, 14);
  const legMeshL = new THREE.Mesh(legGeo, bodyMat);
  legMeshL.scale.set(1.1, 1.03, 1.0);
  legMeshL.position.y = -0.42;
  legMeshL.castShadow = true;
  legL.add(legMeshL);

  const legMeshR = legMeshL.clone();
  legR.add(legMeshR);

  const footGeo = new THREE.SphereGeometry(0.205, 24, 18);
  const footL = new THREE.Mesh(footGeo, bodyMat);
  footL.scale.set(1.34, 0.5, 1.58);
  footL.position.set(0, -0.72, 0.13);
  footL.castShadow = true;
  legL.add(footL);

  const footR = footL.clone();
  legR.add(footR);

  const heart = createHeartMesh();
  heart.visible = false;
  heart.position.set(0, 1.3, 0.95);
  pelvis.add(heart);

  const flowerGroup = createFlowerGroup();
  flowerGroup.position.set(0.06, -0.01, 0.2);
  flowerGroup.visible = false;
  handRGroup.add(flowerGroup);

  return {
    root,
    pelvis,
    bodyGroup,
    headGroup,
    shoulderL,
    shoulderR,
    elbowL,
    elbowR,
    legL,
    legR,
    heart,
    badge,
    flowerGroup,
    eyeMat,
    materials: { bodyMat, badgeMat }
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
    emissiveIntensity: 0.62,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(0.45);
  return mesh;
}

function createFlowerGroup() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.012, 0.22, 10),
    new THREE.MeshStandardMaterial({ color: '#3aa35a', roughness: 0.6, metalness: 0 })
  );
  stem.position.y = 0.1;
  g.add(stem);

  const petalMat = new THREE.MeshStandardMaterial({ color: '#dd1f33', roughness: 0.45, metalness: 0.02 });
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 14), petalMat);
  center.position.y = 0.24;
  g.add(center);

  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), petalMat);
    const a = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.045, 0.24 + Math.sin(a) * 0.01, Math.sin(a) * 0.045);
    g.add(petal);
  }
  return g;
}

function applyParams(syncUI = true) {
  const p = state.params;
  baymax.materials.bodyMat.color.set(p.baseColor);
  baymax.eyeMat.color.set(p.eyeColor);
  baymax.materials.badgeMat.color.set(p.badgeColor);
  baymax.badge.visible = p.showBadge;

  if (syncUI) {
    ui.baseColor.value = p.baseColor;
    ui.eyeColor.value = p.eyeColor;
    ui.badgeColor.value = p.badgeColor;
    ui.showBadge.checked = p.showBadge;
  }
}

function setAction(name) {
  if (state.currentAction === name) return;
  console.log('[action] set:', name);
  state.fromAction = state.currentAction;
  state.fromActionStartAt = state.actionStartAt;
  state.currentAction = name;
  state.actionStartAt = state.elapsed;
  state.transition = 0;
}

function getActionPose(action, t) {
  const p = clonePose(poseNeutral);

  if (action === 'wave') {
    p.shoulderR.x = -1.18;
    p.shoulderR.y = 0.34;
    p.shoulderR.z = -0.34;
    p.elbowR.x = 0.95;
    p.head.y = Math.sin(t * 2.2) * 0.09;
  }

  if (action === 'heart') {
    p.shoulderL.x = -0.86;
    p.shoulderR.x = -0.86;
    p.shoulderL.y = -0.2;
    p.shoulderR.y = 0.2;
    p.shoulderL.z = 0.28;
    p.shoulderR.z = -0.28;
    p.elbowL.x = 1.34;
    p.elbowR.x = 1.34;
    p.body.x = 0.06;
    p.showHeart = true;
  }

  if (action === 'dance') {
    p.body.z = Math.sin(t * 2.2) * 0.25;
    p.head.y = Math.sin(t * 2.2) * 0.32;
    p.shoulderL.z = 0.2 + Math.sin(t * 4.2) * 0.65;
    p.shoulderR.z = -0.2 - Math.sin(t * 4.2 + 0.8) * 0.65;
    p.legL.x = 0.02 + Math.sin(t * 3.2) * 0.24;
    p.legR.x = 0.02 + Math.sin(t * 3.2 + Math.PI) * 0.24;
    p.rootY = Math.abs(Math.sin(t * 3.1)) * 0.06;
  }

  if (action === 'spin') {
    p.rootYaw = (t / 7) * Math.PI * 2;
    p.head.y = Math.sin(t * 1.2) * 0.14;
  }

  if (action === 'hug') {
    p.shoulderL.x = -0.76;
    p.shoulderR.x = -0.76;
    p.shoulderL.y = -0.24;
    p.shoulderR.y = 0.24;
    p.shoulderL.z = 0.24;
    p.shoulderR.z = -0.24;
    p.elbowL.x = 1.24;
    p.elbowR.x = 1.24;
    p.body.x = 0.13;
    p.head.x = -0.08;
  }

  if (action === 'comfort') {
    p.head.x = Math.sin(t * 2.8) * 0.22;
    p.shoulderR.x = -0.6;
    p.shoulderR.y = 0.22;
    p.elbowR.x = 0.9 + Math.sin(t * 2.8) * 0.16;
    p.body.z = Math.sin(t * 2.8) * 0.06;
  }

  if (action === 'flower') {
    const enter = clamp(t / 0.8, 0, 1);
    const holdBreath = 1 + Math.sin(Math.max(0, t - 0.8) * 2.2) * 0.04;
    p.shoulderR.x = mix(p.shoulderR.x, -0.98, enter);
    p.shoulderR.y = mix(p.shoulderR.y, 0.28, enter);
    p.shoulderR.z = mix(p.shoulderR.z, -0.26, enter);
    p.elbowR.x = mix(p.elbowR.x, 1.2, enter);
    p.shoulderL.z = 0.18;
    p.body.x = mix(0, 0.14, enter);
    p.head.x = mix(0, -0.05, enter);
    p.rootY = (holdBreath - 1) * 0.05;
    p.showFlower = true;
  }

  return p;
}

function lerpPose(a, b, t) {
  const p = clonePose(a);
  const keys = ['x', 'y', 'z'];
  ['body', 'head', 'shoulderL', 'shoulderR', 'legL', 'legR'].forEach((k) => {
    keys.forEach((ax) => {
      p[k][ax] = mix(a[k][ax], b[k][ax], t);
    });
  });
  ['elbowL', 'elbowR'].forEach((k) => {
    p[k].x = mix(a[k].x, b[k].x, t);
  });
  p.rootY = mix(a.rootY, b.rootY, t);
  p.rootYaw = mix(a.rootYaw, b.rootYaw, t);
  p.showHeart = t < 0.5 ? a.showHeart : b.showHeart;
  p.showFlower = t < 0.5 ? a.showFlower : b.showFlower;
  return p;
}

function getLimbSamples(side, shoulderRot, elbowX) {
  const shoulder = armMeta[side].shoulderPos.clone();
  const upperLen = 1.0;
  const foreLen = 0.96;

  const upperDir = new THREE.Vector3(0, -1, 0).applyEuler(new THREE.Euler(shoulderRot.x, shoulderRot.y, shoulderRot.z, 'XYZ'));
  const elbow = shoulder.clone().addScaledVector(upperDir, upperLen);
  const foreDir = new THREE.Vector3(0, -1, 0).applyEuler(new THREE.Euler(shoulderRot.x + elbowX * 0.88, shoulderRot.y, shoulderRot.z, 'XYZ'));
  const wrist = elbow.clone().addScaledVector(foreDir, foreLen);

  const handTip = wrist.clone().addScaledVector(foreDir, 0.22);

  return [
    shoulder.clone().lerp(elbow, 0.3),
    shoulder.clone().lerp(elbow, 0.7),
    elbow.clone().lerp(wrist, 0.35),
    elbow.clone().lerp(wrist, 0.7),
    wrist,
    handTip
  ];
}

function isInsideTorso(p) {
  const d = p.clone().sub(torsoCollider.center);
  const q = (d.x * d.x) / (torsoCollider.radii.x * torsoCollider.radii.x)
    + (d.y * d.y) / (torsoCollider.radii.y * torsoCollider.radii.y)
    + (d.z * d.z) / (torsoCollider.radii.z * torsoCollider.radii.z);
  return q < 1;
}

// 3) 碰撞约束升级：椭球检测 + 迭代 push-out（上臂/前臂/手采样），防止动作中穿模
function applyArmConstraints(side, pose, actionName) {
  const shoulder = side === 'L' ? pose.shoulderL : pose.shoulderR;
  const elbow = side === 'L' ? pose.elbowL : pose.elbowR;
  const m = armMeta[side];

  shoulder.x = clamp(shoulder.x, m.pitch[0], m.pitch[1]);
  shoulder.y = clamp(shoulder.y, m.yaw[0], m.yaw[1]);
  shoulder.z = clamp(shoulder.z, m.roll[0], m.roll[1]);
  elbow.x = clamp(elbow.x, 0, 2.08);

  const allowsForward = actionName === 'flower' || actionName === 'heart' || actionName === 'hug';

  for (let i = 0; i < 6; i++) {
    const hit = getLimbSamples(side, shoulder, elbow.x).some(isInsideTorso);
    if (!hit) break;

    if (side === 'L') {
      shoulder.y -= 0.085;
      shoulder.z += 0.05;
    } else {
      shoulder.y += 0.085;
      shoulder.z -= 0.05;
    }

    shoulder.x += allowsForward ? 0.018 : 0.045;

    shoulder.x = clamp(shoulder.x, m.pitch[0], m.pitch[1]);
    shoulder.y = clamp(shoulder.y, m.yaw[0], m.yaw[1]);
    shoulder.z = clamp(shoulder.z, m.roll[0], m.roll[1]);
  }
}

function applyPose(pose, dt) {
  applyArmConstraints('L', pose, state.currentAction);
  applyArmConstraints('R', pose, state.currentAction);

  const s = 1 - Math.exp(-dt * 10);
  const dampRot = (group, target) => {
    group.rotation.x += (target.x - group.rotation.x) * s;
    group.rotation.y += (target.y - group.rotation.y) * s;
    group.rotation.z += (target.z - group.rotation.z) * s;
  };

  dampRot(baymax.bodyGroup, pose.body);
  dampRot(baymax.headGroup, pose.head);
  dampRot(baymax.shoulderL, pose.shoulderL);
  dampRot(baymax.shoulderR, pose.shoulderR);
  baymax.elbowL.rotation.x += (pose.elbowL.x - baymax.elbowL.rotation.x) * s;
  baymax.elbowR.rotation.x += (pose.elbowR.x - baymax.elbowR.rotation.x) * s;
  dampRot(baymax.legL, pose.legL);
  dampRot(baymax.legR, pose.legR);

  baymax.root.position.y += (pose.rootY - baymax.root.position.y) * s;
  state.rootYaw += (pose.rootYaw - state.rootYaw) * s;
  baymax.root.rotation.y = state.rootYaw;

  baymax.heart.visible = pose.showHeart;
  baymax.flowerGroup.visible = pose.showFlower;
}

function updateActionBlender(dt) {
  const tCurrent = Math.max(0, state.elapsed - state.actionStartAt);
  const tFrom = Math.max(0, state.elapsed - state.fromActionStartAt);
  const currentTarget = getActionPose(state.currentAction, tCurrent);
  const fromTarget = getActionPose(state.fromAction, tFrom);

  if (state.transition < 1) {
    state.transition = Math.min(1, state.transition + dt / state.transitionDuration);
  }
  const alpha = smoothstep01(state.transition);
  return lerpPose(fromTarget, currentTarget, alpha);
}

function animateLoop() {
  const dt = clock.getDelta();
  state.elapsed += dt;
  const t = state.elapsed;

  controls.update();
  let pose = updateActionBlender(dt);

  pose.rootY += Math.sin(t * 2.1) * 0.013;
  pose.body.z += Math.sin(t * 1.3) * 0.03;
  if (state.currentAction === 'idle') {
    pose.head.y += Math.sin(t * 0.9) * 0.06;
  }

  if (Math.sin(t * 2.9) > 0.992) state.blink = 0.2;
  state.blink += (1 - state.blink) * (1 - Math.exp(-dt * 14));
  const eyeScale = clamp(state.blink, 0.2, 1);
  baymax.headGroup.children.forEach((obj) => {
    if (obj.geometry && obj.geometry.type === 'SphereGeometry' && obj.material === baymax.eyeMat) {
      obj.scale.y = eyeScale;
    }
  });

  if (pose.showHeart) {
    const pulse = 1 + Math.sin(t * 6) * 0.14;
    baymax.heart.scale.setScalar(0.45 * pulse);
    baymax.heart.material.opacity = 0.66 + 0.26 * (Math.sin(t * 6) * 0.5 + 0.5);
  }

  applyPose(pose, dt);

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
  const container = document.getElementById('scene-wrap');
  const w = renderer.domElement.clientWidth || container.clientWidth || window.innerWidth;
  const h = renderer.domElement.clientHeight || container.clientHeight || window.innerHeight;
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
        if (obj !== baymax.badge) obj.receiveShadow = e.target.checked;
      }
    });
  });

  ui.resetView.addEventListener('click', () => {
    camera.position.set(0, 1.95, 4.8);
    controls.target.set(0, 1.28, 0);
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
