import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { createAvatarModel } from "./avatar3d.js";
import { installBodyMorphs } from "./bodyMorphs.js";
import {
  COAT_ASSET_URL,
  JACKET_ASSET_URL,
  SHIRT_ASSET_URL,
  SHORTS_ASSET_URL,
  SWEATER_ASSET_URL,
  TEE_ASSET_URL,
  loadIndependentGarment
} from "./skinnedGarments.js";
import { labelFor, normalizeColor } from "./wardrobe.js";

export const VRM_ASSET_URL = "/assets/models/VRM1_Constraint_Twist_Sample.vrm";
export const VRM_MATERIAL_CATEGORIES = {
  Tops_01_CLOTH: "top",
  Bottoms_01_CLOTH: "bottom",
  Shoes_01_CLOTH: "shoes"
};

const clampDelta = value => Math.min(value, .05);
const hairClearanceCache = new WeakMap();
const outerCompressionCache = new WeakMap();

function selectedItems(look, items) {
  return Object.fromEntries(
    Object.entries(look || {})
      .map(([category, id]) => [category, (items || []).find(item => item.id === id)])
      .filter(([, item]) => Boolean(item))
  );
}

export function unsupportedAssetItems(look = {}, items = []) {
  const worn = selectedItems(look, items);
  return Object.values(worn).filter(item =>
    ["dress", "accessory"].includes(item.category) ||
    (item.category === "bottom" && item.style === "skirt") ||
    (item.category === "outer" && !["jacket", "coat"].includes(item.style))
  );
}

function applyGarmentColor(material, item) {
  const color = new THREE.Color(normalizeColor(item.color));
  if (material.color?.isColor) material.color.copy(color);
  if (material.shadeColorFactor?.isColor) material.shadeColorFactor.copy(color).multiplyScalar(.62);
  if (material.map) material.map = null;
  if (material.shadeMultiplyTexture) material.shadeMultiplyTexture = null;
  material.needsUpdate = true;
}

export function installHairClearance(root) {
  let baseTop;
  const hairMeshes = [];
  root.traverse(object => {
    if (!object.isSkinnedMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some(material => material?.name === "Tops_01_CLOTH")) baseTop = object;
    if (materials.some(material => material?.name === "Hair_00_HAIR")) hairMeshes.push(object);
  });
  if (!baseTop || !hairMeshes.length) return 0;
  const topPositions = baseTop.geometry.attributes.position;
  const entries = hairMeshes.map(object => {
    if (!object.geometry.morphAttributes.position?.length) object.geometry.morphTargetsRelative = true;
    const positions = object.geometry.attributes.position;
    const original = new Float32Array(positions.count * 3);
    const topZ = new Float32Array(positions.count);
    const weights = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      original.set([x, y, z], i * 3);
      if (y < .98 || y > 1.34 || z < .015 || Math.abs(x) > .24) continue;
      let nearest = Infinity;
      for (let j = 0; j < topPositions.count; j++) {
        const garmentZ = topPositions.getZ(j);
        if (garmentZ < .015) continue;
        const distance = Math.pow((topPositions.getY(j) - y) * 4, 2) + Math.pow((topPositions.getX(j) - x) * 2, 2);
        if (distance < nearest) {
          nearest = distance;
          topZ[i] = garmentZ;
        }
      }
      if (nearest < Infinity) {
        weights[i] = THREE.MathUtils.clamp((1.34 - y) / .08, 0, 1) * THREE.MathUtils.clamp((.24 - Math.abs(x)) / .04, 0, 1);
      }
    }
    return { object, original, topZ, weights };
  });
  hairClearanceCache.set(root, entries);
  return entries.length;
}

function updateHairClearance(root, worn) {
  const entries = hairClearanceCache.get(root) || [];
  const innerClearance = worn.top?.style === "sweater" ? .047 : .025;
  for (const { object, original, topZ, weights } of entries) {
    const positions = object.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const offset = i * 3;
      const x = original[offset], y = original[offset + 1], z = original[offset + 2];
      let clearance = worn.top?.style === "sweater" ? .047 : 0;
      if (worn.outer) {
        const opening = .040 + .045 * THREE.MathUtils.clamp((y - .94) / .34, 0, 1);
        clearance = Math.abs(x) < opening ? innerClearance : .065;
      }
      const targetZ = clearance && weights[i] ? Math.max(z, topZ[i] + clearance) : z;
      positions.setZ(i, z + (targetZ - z) * weights[i]);
    }
    positions.needsUpdate = true;
  }
}

export function installOuterLayerCompression(root) {
  const tops = new Set(Object.values(root.userData.independentGarments?.top || {}));
  root.traverse(object => {
    if (!object.isSkinnedMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some(material => material?.name === "Tops_01_CLOTH")) tops.add(object);
  });
  const targets = [];
  for (const object of tops) {
    const geometry = object.geometry;
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    if (!positions || !normals) continue;
    const values = new Float32Array(positions.count * 3);
    for (let index = 0; index < positions.count; index++) {
      const offset = index * 3;
      const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
      const weight = THREE.MathUtils.smoothstep(Math.abs(x), .14, .22)
        * THREE.MathUtils.smoothstep(y, 1.08, 1.17);
      const dx = -normals.getX(index) * .04 * weight;
      const dy = -normals.getY(index) * .04 * weight;
      const dz = -normals.getZ(index) * .04 * weight;
      values[offset] = geometry.morphTargetsRelative ? dx : x + dx;
      values[offset + 1] = geometry.morphTargetsRelative ? dy : y + dy;
      values[offset + 2] = geometry.morphTargetsRelative ? dz : z + dz;
    }
    const attribute = new THREE.BufferAttribute(values, 3);
    attribute.name = "MORI_OUTER_COMPRESSION";
    const morphPositions = geometry.morphAttributes.position || [];
    const morphIndex = morphPositions.length;
    morphPositions.push(attribute);
    geometry.morphAttributes.position = morphPositions;
    object.morphTargetDictionary = object.morphTargetDictionary || {};
    object.morphTargetInfluences = object.morphTargetInfluences || [];
    object.morphTargetDictionary.MORI_OUTER_COMPRESSION = morphIndex;
    object.morphTargetInfluences[morphIndex] = 0;
    targets.push({ object, morphIndex });
  }
  outerCompressionCache.set(root, targets);
  return targets.length;
}

function updateOuterLayerCompression(root, worn) {
  const influence = worn.outer ? 1 : 0;
  for (const { object, morphIndex } of outerCompressionCache.get(root) || []) {
    object.morphTargetInfluences[morphIndex] = influence;
  }
}

export function applyWardrobeToVRM(root, look = {}, items = []) {
  const worn = selectedItems(look, items);
  updateHairClearance(root, worn);
  updateOuterLayerCompression(root, worn);
  const applied = new Set();
  const independentApplied = new Set();
  const independentStyles = {};
  for (const [category, styles] of Object.entries(root.userData.independentGarments || {})) {
    const item = worn[category];
    for (const [style, garment] of Object.entries(styles)) {
      garment.visible = item?.style === style;
      if (!garment.visible) continue;
      const materials = Array.isArray(garment.material) ? garment.material : [garment.material];
      for (const material of materials) applyGarmentColor(material, item);
      independentApplied.add(category);
      independentStyles[category] = style;
      applied.add(category);
    }
  }
  root.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const category = VRM_MATERIAL_CATEGORIES[material?.name];
      if (!category) continue;
      const item = worn[category];
      object.visible = Boolean(item) && !independentApplied.has(category);
      object.userData.moriCategory = category;
      if (!item || independentApplied.has(category)) continue;
      applyGarmentColor(material, item);
      applied.add(category);
    }
  });
  root.userData.garments = [...applied].sort();
  root.userData.independentApplied = [...independentApplied].sort();
  root.userData.independentStyles = independentStyles;
  return [...applied].sort();
}

export async function loadVRM(url = VRM_ASSET_URL) {
  const loader = new GLTFLoader();
  loader.register(parser => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true }));
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm;
  if (!vrm?.humanoid || !vrm.scene) throw new Error("本地人物不是有效的 VRM 骨骼模型");
  if (vrm.meta?.metaVersion === "0") VRMUtils.rotateVRM0(vrm);

  let facialMorphs = 0;
  vrm.scene.traverse(object => {
    if (!object.isSkinnedMesh) return;
    facialMorphs = Math.max(facialMorphs, Object.keys(object.morphTargetDictionary || {}).length);
    object.frustumCulled = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const bodySkin = materials.some(material => material?.name === "Body_00_SKIN");
    // Overlapping skin and sleeve shells otherwise produce shadow acne at the cuffs.
    object.castShadow = !bodySkin;
    object.receiveShadow = !bodySkin;
  });
  const [tee, shirt, sweater, pants, shorts, jacket, coat] = await Promise.all([
    loadIndependentGarment(vrm.scene, TEE_ASSET_URL),
    loadIndependentGarment(vrm.scene, SHIRT_ASSET_URL),
    loadIndependentGarment(vrm.scene, SWEATER_ASSET_URL),
    loadIndependentGarment(vrm.scene),
    loadIndependentGarment(vrm.scene, SHORTS_ASSET_URL),
    loadIndependentGarment(vrm.scene, JACKET_ASSET_URL),
    loadIndependentGarment(vrm.scene, COAT_ASSET_URL)
  ]);
  for (const garment of [tee, shirt, sweater, pants, shorts, jacket, coat]) garment.visible = false;
  vrm.scene.userData.independentGarments = {
    top: { tee, shirt, sweater },
    bottom: { pants, shorts },
    outer: { jacket, coat }
  };
  installOuterLayerCompression(vrm.scene);
  installHairClearance(vrm.scene);
  const bodyMorphs = installBodyMorphs(vrm.scene);
  return {
    vrm,
    bodyMorphs,
    stats: {
      bones: Object.keys(vrm.humanoid.humanBones).length,
      facialMorphs,
      bodyMorphs: bodyMorphs.names.length,
      independentGarments: 7
    }
  };
}

function fitCharacter(scene, root, height = 5.72) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  if (box.isEmpty()) throw new Error("VRM 人物边界为空");
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = height / (size.y || 1);
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -box.min.y * scale + .025, -center.z * scale);
}

function disposeModel(model) {
  if (!model) return;
  const materials = new Set();
  model.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
    else materials.add(object.material);
  });
  materials.forEach(material => material.dispose());
}

function createBones(vrm) {
  const definitions = [
    ["leftUpperArm", 0, 0, -1.02],
    ["rightUpperArm", 0, 0, 1.02],
    ["leftLowerArm", 0, 0, -.10],
    ["rightLowerArm", 0, 0, .10],
    ["chest", 0, 0, 0],
    ["head", 0, 0, 0]
  ];
  return definitions.map(([name, x, y, z]) => ({
    name,
    node: vrm.humanoid.getNormalizedBoneNode(name),
    rest: vrm.humanoid.getNormalizedBoneNode(name)?.quaternion.clone(),
    base: new THREE.Euler(x, y, z)
  })).filter(bone => bone.node && bone.rest);
}

export async function mountAssetAvatar(element, initial = {}) {
  const { vrm, bodyMorphs, stats } = await loadVRM(initial.url || VRM_ASSET_URL);
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0xefeee9, 0);
  renderer.domElement.dataset.asset = "vrm";
  renderer.domElement.setAttribute("aria-label", "VRM 3D 人物，拖动旋转，滚轮或双指缩放");
  renderer.domElement.tabIndex = 0;
  element.replaceChildren(renderer.domElement);
  element.dataset.asset = "vrm";
  element.dataset.bones = String(stats.bones);
  element.dataset.facialMorphs = String(stats.facialMorphs);
  element.dataset.bodyMorphs = String(stats.bodyMorphs);
  element.dataset.independentGarments = String(stats.independentGarments);

  const camera = new THREE.PerspectiveCamera(32, 1, .1, 60);
  camera.position.set(.12, 3.12, 11.8);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2.86, 0);
  controls.enableDamping = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  controls.dampingFactor = .065;
  controls.enablePan = false;
  controls.minDistance = 7.2;
  controls.maxDistance = 15;
  controls.minPolarAngle = .68;
  controls.maxPolarAngle = 1.72;
  controls.autoRotateSpeed = 1.2;
  controls.update();
  controls.saveState();

  scene.add(new THREE.HemisphereLight(0xfffcf5, 0x788078, 1.1));
  const key = new THREE.DirectionalLight(0xfff7e9, 1.35);
  key.position.set(-3, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.camera.left = key.shadow.camera.bottom = -4;
  key.shadow.camera.right = key.shadow.camera.top = 4;
  key.shadow.camera.near = .5;
  key.shadow.camera.far = 20;
  key.shadow.bias = -.0001;
  key.shadow.normalBias = .025;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdde8e4, .45);
  fill.position.set(4, 4, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, .75);
  rim.position.set(1, 6, -5);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.15, 64),
    new THREE.MeshStandardMaterial({ color: "#e5e4de", roughness: 1, transparent: true, opacity: .68 })
  );
  floor.name = "studio-floor";
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = .015;
  floor.receiveShadow = true;
  scene.add(floor);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.ShadowMaterial({ color: 0x3b443c, opacity: .13 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .022;
  scene.add(shadow);

  const assetRoot = new THREE.Group();
  assetRoot.name = "vrm-character";
  assetRoot.userData.engine = "vrm";
  assetRoot.add(vrm.scene);
  fitCharacter(vrm.scene, assetRoot);
  scene.add(assetRoot);
  if (vrm.lookAt) vrm.lookAt.target = camera;

  const bones = createBones(vrm);
  const poseQuaternion = new THREE.Quaternion();
  const idleQuaternion = new THREE.Quaternion();
  const poseEuler = new THREE.Euler();
  const idleEuler = new THREE.Euler();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let fallback = null;
  let mode = "vrm";
  let currentProfile = {};
  let elapsed = 0;

  function pose(time) {
    for (const bone of bones) {
      poseEuler.copy(bone.base);
      poseQuaternion.setFromEuler(poseEuler);
      const isArm = bone.name.includes("Arm");
      const sway = reducedMotion ? 0 : Math.sin(time * .85 + (bone.name.startsWith("right") ? 1.7 : 0)) * (isArm ? .018 : .006);
      idleEuler.set(bone.name === "chest" ? sway : 0, bone.name === "head" ? sway * 1.8 : 0, isArm ? sway : 0);
      idleQuaternion.setFromEuler(idleEuler);
      bone.node.quaternion.copy(bone.rest).multiply(poseQuaternion).multiply(idleQuaternion);
    }
    if (!reducedMotion && vrm.expressionManager?.getExpression("blink")) {
      const phase = time % 4.8;
      const blink = phase > 4.55 ? Math.sin((phase - 4.55) / .25 * Math.PI) : 0;
      vrm.expressionManager.setValue("blink", Math.max(0, blink));
    }
  }

  pose(0);
  vrm.update(0);
  vrm.scene.updateMatrixWorld(true);
  vrm.springBoneManager?.setInitState();
  vrm.springBoneManager?.reset();

  function update(look = {}, items = [], profile = {}) {
    currentProfile = profile;
    const previousMode = mode;
    const unsupported = unsupportedAssetItems(look, items);
    mode = unsupported.length ? "fallback" : "vrm";
    assetRoot.visible = mode === "vrm";
    if (fallback) {
      scene.remove(fallback);
      disposeModel(fallback);
      fallback = null;
    }
    if (mode === "fallback") {
      fallback = createAvatarModel(look, items, profile);
      scene.add(fallback);
      element.dataset.engine = "three-fallback";
      element.dataset.garments = fallback.userData.garments.join(" ");
      const names = [...new Set(unsupported.map(item => labelFor(item.category)))].join("、");
      return { mode, message: "程序化回退 · " + names + "尚无独立 VRM 资产" };
    }
    if (previousMode === "fallback") {
      pose(elapsed);
      vrm.update(0);
      vrm.scene.updateMatrixWorld(true);
      vrm.springBoneManager?.reset();
    }
    bodyMorphs.setProfile(profile);
    const garments = applyWardrobeToVRM(vrm.scene, look, items);
    element.dataset.engine = "vrm";
    element.dataset.garments = garments.join(" ");
    const independent = vrm.scene.userData.independentApplied || [];
    const independentStyles = vrm.scene.userData.independentStyles || {};
    element.dataset.independentApplied = independent.join(" ");
    element.dataset.independentStyles = Object.entries(independentStyles)
      .map(([category, style]) => category + ":" + style).sort().join(" ");
    for (const [key, value] of Object.entries(bodyMorphs.getInfluences())) {
      element.dataset["morph" + key[0].toUpperCase() + key.slice(1)] = String(value);
    }
    const independentLabels = [
      independent.includes("top") && ({
        tee: "独立圆领 T 恤",
        shirt: "独立衣领衬衫",
        sweater: "独立长袖针织衫"
      }[independentStyles.top]),
      independent.includes("bottom") && (independentStyles.bottom === "shorts" ? "独立骨骼短裤" : "独立骨骼长裤"),
      independent.includes("outer") && (independentStyles.outer === "coat" ? "独立长外套" : "独立开襟外套")
    ].filter(Boolean);
    const garmentMessage = independentLabels.length
      ? independentLabels.join(" · ") + " · 其余基础换色"
      : "基础模型换色（非独立版型）";
    return { mode, message: "VRM 骨骼人物 · " + garmentMessage + " · 真实体型 Morph" };
  }

  function resize() {
    const style = window.getComputedStyle(element);
    const width = Math.max(1, element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const height = Math.max(1, element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  resize();
  const dragging = () => element.classList.add("dragging");
  const released = () => element.classList.remove("dragging");
  controls.addEventListener("start", dragging);
  controls.addEventListener("end", released);
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = clampDelta(clock.getDelta());
    elapsed += delta;
    if (mode === "vrm") {
      pose(elapsed);
      vrm.update(reducedMotion ? 0 : delta);
    }
    controls.update();
    renderer.render(scene, camera);
  });
  update(initial.look, initial.items, initial.profile);
  return {
    update,
    reset() { controls.reset(); controls.autoRotate = false; },
    setAutoRotate(value) { controls.autoRotate = Boolean(value); },
    getDiagnostics() {
      return {
        ...stats,
        mode,
        profile: { ...currentProfile },
        influences: bodyMorphs.getInfluences(),
        garments: element.dataset.garments?.split(" ").filter(Boolean) || []
      };
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      if (fallback) disposeModel(fallback);
      VRMUtils.deepDispose(vrm.scene);
      floor.geometry.dispose();
      floor.material.dispose();
      shadow.geometry.dispose();
      shadow.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      delete element.dataset.asset;
      delete element.dataset.engine;
    }
  };
}
