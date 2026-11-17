import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import {
  VRM_MATERIAL_CATEGORIES,
  applyWardrobeToVRM,
  installHairClearance,
  installOuterLayerCompression,
  unsupportedAssetItems
} from "../src/assetAvatar.js";
import { DEMO_ITEMS } from "../src/wardrobe.js";
import { rebindGarmentToRig } from "../src/skinnedGarments.js";

function glbJson(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const length = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + length).toString("utf8"));
}

function garment(name) {
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff" });
  material.name = name;
  const mesh = new THREE.SkinnedMesh(new THREE.BoxGeometry(), material);
  return mesh;
}

test("bundled VRM preserves permissive license, humanoid rig and facial morphs", async () => {
  const buffer = await readFile(new URL("../assets/models/VRM1_Constraint_Twist_Sample.vrm", import.meta.url));
  const json = glbJson(buffer);
  const meta = json.extensions.VRMC_vrm.meta;
  assert.equal(meta.allowRedistribution, true);
  assert.equal(meta.modification, "allowModificationRedistribution");
  assert.equal(meta.creditNotation, "unnecessary");
  assert.equal(Object.keys(json.extensions.VRMC_vrm.humanoid.humanBones).length, 54);
  const face = json.meshes.find(mesh => mesh.name === "Face");
  assert.ok(face.primitives.every(primitive => primitive.targets.length === 57));
  for (const name of Object.keys(VRM_MATERIAL_CATEGORIES)) {
    assert.ok(json.materials.some(material => material.name === name), name);
  }
});

test("VRM garment materials follow selected wardrobe colors and visibility", () => {
  const root = new THREE.Group();
  const top = garment("Tops_01_CLOTH");
  const bottom = garment("Bottoms_01_CLOTH");
  const shoes = garment("Shoes_01_CLOTH");
  const skin = garment("Body_00_SKIN");
  top.material.map = new THREE.Texture();
  top.material.shadeColorFactor = new THREE.Color("#ffffff");
  top.material.shadeMultiplyTexture = new THREE.Texture();
  root.add(top, bottom, shoes, skin);
  const look = { top: "demo-2", bottom: "demo-3", shoes: "demo-6" };
  assert.deepEqual(applyWardrobeToVRM(root, look, DEMO_ITEMS), ["bottom", "shoes", "top"]);
  assert.equal(top.material.color.getHexString(), "526b5f");
  assert.equal(top.material.map, null);
  assert.equal(top.material.shadeMultiplyTexture, null);
  assert.equal(top.material.shadeColorFactor.getHexString(), new THREE.Color("#526b5f").multiplyScalar(.62).getHexString());
  assert.equal(bottom.material.color.getHexString(), "535e66");
  assert.equal(shoes.material.color.getHexString(), "eae7dd");
  assert.equal(skin.material.color.getHexString(), "ffffff");
  assert.deepEqual(root.userData.garments, ["bottom", "shoes", "top"]);

  applyWardrobeToVRM(root, { bottom: "demo-3" }, DEMO_ITEMS);
  assert.equal(top.visible, false);
  assert.equal(bottom.visible, true);
  assert.equal(shoes.visible, false);
  assert.equal(skin.visible, true);
});

test("front hair clears thick tops and outer layers without moving the hairline", () => {
  const root = new THREE.Group();
  const top = garment("Tops_01_CLOTH");
  top.geometry = new THREE.BufferGeometry();
  top.geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 1.2, .1,
    .1, 1.2, .1,
    0, 1.5, .1
  ], 3));
  const hair = garment("Hair_00_HAIR");
  hair.geometry = new THREE.BufferGeometry();
  hair.geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 1.2, .08,
    .1, 1.2, .08,
    0, 1.5, .08,
    0, 1.2, -.05
  ], 3));
  root.add(top, hair);
  assert.equal(installHairClearance(root), 1);
  assert.equal(hair.geometry.morphTargetsRelative, true);
  const items = [...DEMO_ITEMS, { id: "knit", category: "top", style: "sweater", color: "#7a6a86" }];
  const positions = hair.geometry.attributes.position;

  applyWardrobeToVRM(root, { top: "knit" }, items);
  assert.ok(Math.abs(positions.getZ(0) - .147) < 1e-6);
  assert.ok(Math.abs(positions.getZ(1) - .147) < 1e-6);
  assert.ok(Math.abs(positions.getZ(2) - .08) < 1e-6);
  assert.ok(Math.abs(positions.getZ(3) + .05) < 1e-6);

  applyWardrobeToVRM(root, { top: "knit", outer: "demo-5" }, items);
  assert.ok(Math.abs(positions.getZ(0) - .147) < 1e-6);
  assert.ok(Math.abs(positions.getZ(1) - .165) < 1e-6);

  applyWardrobeToVRM(root, { top: "demo-1", outer: "demo-5" }, items);
  assert.ok(Math.abs(positions.getZ(0) - .125) < 1e-6);
  assert.ok(Math.abs(positions.getZ(1) - .165) < 1e-6);

  applyWardrobeToVRM(root, { top: "demo-1" }, items);
  assert.ok(Math.abs(positions.getZ(0) - .08) < 1e-6);
  assert.ok(Math.abs(positions.getZ(1) - .08) < 1e-6);
});

test("only unavailable garment layers trigger the explicit procedural fallback", () => {
  for (const look of [
    { top: "demo-1", bottom: "demo-3", shoes: "demo-6" },
    { top: "demo-2", bottom: "demo-4", shoes: "demo-6" },
    { top: "demo-2", bottom: "demo-3", outer: "demo-5", shoes: "demo-6" },
    { top: "demo-2", bottom: "demo-3", outer: "demo-7", shoes: "demo-6" }
  ]) assert.deepEqual(unsupportedAssetItems(look, DEMO_ITEMS), []);
  const items = [
    ...DEMO_ITEMS,
    { id: "cape", category: "outer", style: "cape" },
    { id: "skirt", category: "bottom", style: "skirt" },
    { id: "dress", category: "dress", style: "longdress" },
    { id: "bow", category: "accessory", style: "bow" }
  ];
  for (const [look, id] of [
    [{ outer: "cape" }, "cape"],
    [{ bottom: "skirt" }, "skirt"],
    [{ dress: "dress" }, "dress"],
    [{ accessory: "bow" }, "bow"]
  ]) assert.deepEqual(unsupportedAssetItems(look, items).map(item => item.id), [id]);
});

test("derived trousers have tailored details, level hems and complete skin weights", async () => {
  const buffer = await readFile(new URL("../assets/models/MORI_Straight_Pants.glb", import.meta.url));
  const json = glbJson(buffer);
  const node = json.nodes.find(item => item.extras?.moriStyle === "pants");
  assert.ok(node);
  assert.equal(node.extras.moriCategory, "bottom");
  assert.deepEqual(node.extras.moriFeatures, ["straight-leg", "waistband", "pressed-creases", "turned-cuffs"]);
  const primitive = json.meshes[node.mesh].primitives[0];
  const position = json.accessors[primitive.attributes.POSITION];
  const vertices = position.count;
  assert.equal(vertices, 9830);
  assert.ok(Math.abs(position.min[1] - .085) < 1e-6);
  assert.ok(position.max[1] <= .986);
  assert.equal(json.accessors[primitive.attributes.JOINTS_0].count, vertices);
  assert.equal(json.accessors[primitive.attributes.WEIGHTS_0].count, vertices);
  assert.equal(json.accessors[primitive.indices].count / 3, 3458);
  assert.equal(json.skins[node.skin].joints.length, 83);
  for (const name of ["J_Bip_L_UpperLeg", "J_Bip_L_LowerLeg", "J_Bip_R_UpperLeg", "J_Bip_R_LowerLeg"]) {
    assert.ok(json.nodes.some(item => item.name === name), name);
  }
});

test("derived shorts have an above-knee hem and complete lower-body skin weights", async () => {
  const buffer = await readFile(new URL("../assets/models/MORI_Casual_Shorts.glb", import.meta.url));
  const json = glbJson(buffer);
  const node = json.nodes.find(item => item.extras?.moriStyle === "shorts");
  assert.ok(node);
  assert.equal(node.extras.moriCategory, "bottom");
  const primitive = json.meshes[node.mesh].primitives[0];
  const position = json.accessors[primitive.attributes.POSITION];
  assert.equal(position.count, 723);
  assert.ok(position.min[1] >= .57);
  assert.ok(position.max[1] >= .99);
  assert.equal(json.accessors[primitive.attributes.JOINTS_0].count, position.count);
  assert.equal(json.accessors[primitive.attributes.WEIGHTS_0].count, position.count);
  assert.equal(json.accessors[primitive.indices].count / 3, 1230);
  assert.equal(json.skins[node.skin].joints.length, 83);
  for (const name of ["J_Bip_L_UpperLeg", "J_Bip_L_LowerLeg", "J_Bip_R_UpperLeg", "J_Bip_R_LowerLeg"]) {
    assert.ok(json.nodes.some(item => item.name === name), name);
  }
});

test("derived tops have distinct geometry, metadata and complete skin weights", async () => {
  const expected = {
    tee: { file: "MORI_Classic_Tee.glb", vertices: 717, triangles: 1210, features: ["crew-neck", "short-sleeves", "fitted-torso"] },
    shirt: { file: "MORI_Button_Shirt.glb", vertices: 883, triangles: 1290, features: ["collar", "button-placket", "short-sleeves"] },
    sweater: { file: "MORI_Knit_Sweater.glb", vertices: 1325, triangles: 2272, features: ["long-sleeves", "relaxed-fit", "ribbed-hem", "ribbed-cuffs"] }
  };
  for (const [style, asset] of Object.entries(expected)) {
    const buffer = await readFile(new URL("../assets/models/" + asset.file, import.meta.url));
    const json = glbJson(buffer);
    const node = json.nodes.find(item => item.extras?.moriStyle === style);
    assert.ok(node, style);
    assert.equal(node.extras.moriCategory, "top");
    assert.deepEqual(node.extras.moriFeatures, asset.features);
    const primitive = json.meshes[node.mesh].primitives[0];
    const position = json.accessors[primitive.attributes.POSITION];
    assert.equal(position.count, asset.vertices, style);
    assert.ok(position.max[1] >= 1.34, style);
    assert.equal(json.accessors[primitive.attributes.JOINTS_0].count, position.count, style);
    assert.equal(json.accessors[primitive.attributes.WEIGHTS_0].count, position.count, style);
    assert.equal(json.accessors[primitive.indices].count / 3, asset.triangles, style);
    assert.equal(json.skins[node.skin].joints.length, 83, style);
  }
});

test("derived open jacket is a long-sleeved local glTF with torso and arm skin weights", async () => {
  const buffer = await readFile(new URL("../assets/models/MORI_Utility_Jacket.glb", import.meta.url));
  const json = glbJson(buffer);
  const node = json.nodes.find(item => item.extras?.moriStyle === "jacket");
  assert.ok(node);
  assert.equal(node.extras.moriCategory, "outer");
  const primitive = json.meshes[node.mesh].primitives[0];
  const vertices = json.accessors[primitive.attributes.POSITION].count;
  assert.equal(vertices, 1280);
  assert.equal(json.accessors[primitive.attributes.JOINTS_0].count, vertices);
  assert.equal(json.accessors[primitive.attributes.WEIGHTS_0].count, vertices);
  assert.equal(json.accessors[primitive.indices].count / 3, 2162);
  assert.equal(json.skins[node.skin].joints.length, 83);
  for (const name of [
    "J_Bip_C_Chest", "J_Bip_C_UpperChest",
    "J_Bip_L_UpperArm", "J_Bip_L_LowerArm",
    "J_Bip_R_UpperArm", "J_Bip_R_LowerArm"
  ]) assert.ok(json.nodes.some(item => item.name === name), name);
});

test("derived long coat has a smooth open front, continuous flare and complete garment weights", async () => {
  const buffer = await readFile(new URL("../assets/models/MORI_Long_Coat.glb", import.meta.url));
  const json = glbJson(buffer);
  const node = json.nodes.find(item => item.extras?.moriStyle === "coat");
  assert.ok(node);
  assert.equal(node.extras.moriCategory, "outer");
  assert.deepEqual(node.extras.moriFeatures, ["open-front", "smooth-placket", "long-sleeves", "flared-hem"]);
  const primitive = json.meshes[node.mesh].primitives[0];
  const position = json.accessors[primitive.attributes.POSITION];
  assert.equal(position.count, 5033);
  assert.ok(position.min[1] <= .38);
  assert.ok(position.max[1] >= 1.34);
  assert.equal(json.accessors[primitive.attributes.JOINTS_0].count, position.count);
  assert.equal(json.accessors[primitive.attributes.WEIGHTS_0].count, position.count);
  assert.equal(json.accessors[primitive.indices].count / 3, 3980);
  assert.equal(json.skins[node.skin].joints.length, 83);
  for (const name of [
    "J_Bip_C_Hips", "J_Bip_C_Spine",
    "J_Bip_L_UpperArm", "J_Bip_L_LowerArm",
    "J_Bip_R_UpperArm", "J_Bip_R_LowerArm",
    "J_Bip_L_UpperLeg", "J_Bip_R_UpperLeg"
  ]) assert.ok(json.nodes.some(item => item.name === name), name);
});

test("independent top styles replace the base top and support outer layering", () => {
  const root = new THREE.Group();
  const baseTop = garment("Tops_01_CLOTH");
  const tee = garment("MORI_Tee_Fabric");
  const shirt = garment("MORI_Shirt_Fabric");
  const sweater = garment("MORI_Sweater_Fabric");
  const jacket = garment("MORI_Jacket_Fabric");
  root.add(baseTop, tee, shirt, sweater, jacket);
  root.userData.independentGarments = { top: { tee, shirt, sweater }, outer: { jacket } };
  const items = [...DEMO_ITEMS, { id: "knit", name: "灰色针织衫", category: "top", style: "sweater", color: "#7a6a86" }];

  applyWardrobeToVRM(root, { top: "demo-1" }, items);
  assert.equal(baseTop.visible, false);
  assert.equal(tee.visible, true);
  assert.equal(shirt.visible, false);
  assert.equal(sweater.visible, false);
  assert.equal(tee.material.color.getHexString(), "ece9e1");
  assert.deepEqual(root.userData.independentStyles, { top: "tee" });

  applyWardrobeToVRM(root, { top: "demo-2" }, items);
  assert.equal(tee.visible, false);
  assert.equal(shirt.visible, true);
  assert.equal(sweater.visible, false);
  assert.equal(shirt.material.color.getHexString(), "526b5f");
  assert.deepEqual(root.userData.independentStyles, { top: "shirt" });

  assert.deepEqual(applyWardrobeToVRM(root, { top: "knit", outer: "demo-5" }, items), ["outer", "top"]);
  assert.equal(tee.visible, false);
  assert.equal(shirt.visible, false);
  assert.equal(sweater.visible, true);
  assert.equal(jacket.visible, true);
  assert.equal(sweater.material.color.getHexString(), "7a6a86");
  assert.deepEqual(root.userData.independentApplied, ["outer", "top"]);
  assert.deepEqual(root.userData.independentStyles, { outer: "jacket", top: "sweater" });

  applyWardrobeToVRM(root, { outer: "demo-5" }, items);
  assert.equal(baseTop.visible, false);
  assert.equal(sweater.visible, false);
  assert.equal(jacket.visible, true);
  assert.deepEqual(root.userData.independentStyles, { outer: "jacket" });
});

test("outerwear compresses inner shoulder sleeves without hiding the front opening", () => {
  const root = new THREE.Group();
  const tee = garment("MORI_Tee_Fabric");
  tee.geometry = new THREE.BufferGeometry();
  tee.geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    .30, 1.25, -.08,
    0, 1.20, .10,
    .10, 1.0, .10
  ], 3));
  tee.geometry.setAttribute("normal", new THREE.Float32BufferAttribute([
    0, 0, -1,
    0, 0, 1,
    0, 0, 1
  ], 3));
  const coat = garment("MORI_Coat_Fabric");
  root.add(tee, coat);
  root.userData.independentGarments = { top: { tee }, outer: { coat } };
  assert.equal(installOuterLayerCompression(root), 1);
  const morphIndex = tee.morphTargetDictionary.MORI_OUTER_COMPRESSION;
  const target = tee.geometry.morphAttributes.position[morphIndex];
  assert.ok(Math.abs(target.getZ(0) + .04) < 1e-6);
  assert.ok(Math.abs(target.getZ(1) - .10) < 1e-6);
  assert.ok(Math.abs(target.getZ(2) - .10) < 1e-6);

  applyWardrobeToVRM(root, { top: "demo-1" }, DEMO_ITEMS);
  assert.equal(tee.morphTargetInfluences[morphIndex], 0);
  applyWardrobeToVRM(root, { top: "demo-1", outer: "demo-7" }, DEMO_ITEMS);
  assert.equal(tee.morphTargetInfluences[morphIndex], 1);
  assert.equal(tee.visible, true);
  assert.equal(coat.visible, true);
  applyWardrobeToVRM(root, { top: "demo-1" }, DEMO_ITEMS);
  assert.equal(tee.morphTargetInfluences[morphIndex], 0);
});

test("independent trousers and shorts replace the base bottom geometry", () => {
  const root = new THREE.Group();
  const baseBottom = garment("Bottoms_01_CLOTH");
  const pants = garment("MORI_Pants_Fabric");
  const shorts = garment("MORI_Shorts_Fabric");
  root.add(baseBottom, pants, shorts);
  root.userData.independentGarments = { bottom: { pants, shorts } };

  applyWardrobeToVRM(root, { bottom: "demo-3" }, DEMO_ITEMS);
  assert.equal(baseBottom.visible, false);
  assert.equal(pants.visible, true);
  assert.equal(shorts.visible, false);
  assert.equal(pants.material.color.getHexString(), "535e66");
  assert.deepEqual(root.userData.independentApplied, ["bottom"]);
  assert.deepEqual(root.userData.independentStyles, { bottom: "pants" });

  applyWardrobeToVRM(root, { bottom: "demo-4" }, DEMO_ITEMS);
  assert.equal(baseBottom.visible, false);
  assert.equal(pants.visible, false);
  assert.equal(shorts.visible, true);
  assert.equal(shorts.material.color.getHexString(), "b5a18a");
  assert.deepEqual(root.userData.independentApplied, ["bottom"]);
  assert.deepEqual(root.userData.independentStyles, { bottom: "shorts" });
});

test("independent outer styles coexist with the inner top and trousers", () => {
  const root = new THREE.Group();
  const top = garment("Tops_01_CLOTH");
  const baseBottom = garment("Bottoms_01_CLOTH");
  const pants = garment("MORI_Pants_Fabric");
  const shorts = garment("MORI_Shorts_Fabric");
  const jacket = garment("MORI_Jacket_Fabric");
  const coat = garment("MORI_Coat_Fabric");
  root.add(top, baseBottom, pants, shorts, jacket, coat);
  root.userData.independentGarments = { bottom: { pants, shorts }, outer: { jacket, coat } };

  assert.deepEqual(applyWardrobeToVRM(root, {
    top: "demo-2",
    bottom: "demo-3",
    outer: "demo-5"
  }, DEMO_ITEMS), ["bottom", "outer", "top"]);
  assert.equal(jacket.visible, true);
  assert.equal(coat.visible, false);
  assert.equal(jacket.material.color.getHexString(), "343f44");
  assert.equal(top.visible, true);
  assert.equal(top.material.color.getHexString(), "526b5f");
  assert.equal(pants.visible, true);
  assert.equal(baseBottom.visible, false);
  assert.deepEqual(root.userData.independentApplied, ["bottom", "outer"]);
  assert.deepEqual(root.userData.independentStyles, { bottom: "pants", outer: "jacket" });

  applyWardrobeToVRM(root, { top: "demo-2", bottom: "demo-3", outer: "demo-7" }, DEMO_ITEMS);
  assert.equal(jacket.visible, false);
  assert.equal(coat.visible, true);
  assert.equal(coat.material.color.getHexString(), "707a76");
  assert.equal(top.visible, true);
  assert.equal(pants.visible, true);
  assert.deepEqual(root.userData.independentStyles, { bottom: "pants", outer: "coat" });

  applyWardrobeToVRM(root, { top: "demo-2", bottom: "demo-4" }, DEMO_ITEMS);
  assert.equal(jacket.visible, false);
  assert.equal(coat.visible, false);
  assert.equal(top.visible, true);
  assert.equal(pants.visible, false);
  assert.equal(shorts.visible, true);
  assert.equal(baseBottom.visible, false);
  assert.deepEqual(root.userData.independentApplied, ["bottom"]);
  assert.deepEqual(root.userData.independentStyles, { bottom: "shorts" });
});

test("independent garment skeleton rebinds to identically named character bones", () => {
  function rig() {
    const root = new THREE.Group();
    const hips = new THREE.Bone();
    hips.name = "J_Bip_C_Hips";
    const leg = new THREE.Bone();
    leg.name = "J_Bip_L_UpperLeg";
    leg.position.y = -0.4;
    hips.add(leg);
    root.add(hips);
    return { root, hips, leg };
  }
  const sourceRig = rig();
  const targetRig = rig();
  const geometry = new THREE.BoxGeometry();
  const count = geometry.attributes.position.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) skinWeights[i * 4] = 1;
  geometry.setAttribute("skinIndex", new THREE.BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.BufferAttribute(skinWeights, 4));
  const source = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  const originalMaterial = source.material;
  sourceRig.root.add(source);
  sourceRig.root.updateMatrixWorld(true);
  source.bind(new THREE.Skeleton([sourceRig.hips, sourceRig.leg]));

  const rebound = rebindGarmentToRig(source, targetRig.root);
  assert.equal(rebound.skeleton.bones[0], targetRig.hips);
  assert.equal(rebound.skeleton.bones[1], targetRig.leg);
  assert.notEqual(rebound.skeleton.bones[0], sourceRig.hips);
  assert.equal(rebound.parent, targetRig.root);
  assert.notEqual(rebound.material, originalMaterial);
});
