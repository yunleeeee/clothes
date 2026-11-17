import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const ROOT = new URL("../", import.meta.url);
const SOURCE_URL = new URL("assets/models/VRM1_Constraint_Twist_Sample.vrm", ROOT);
const COMPONENT_SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const COMPONENT_TYPES = {
  5121: [Uint8Array, "getUint8"],
  5123: [Uint16Array, "getUint16"],
  5125: [Uint32Array, "getUint32"],
  5126: [Float32Array, "getFloat32"]
};
const clamp = THREE.MathUtils.clamp;

function parseGLB(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return {
    json: JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8")),
    binary: buffer.subarray(28 + jsonLength)
  };
}

function accessorReader(json, binary, index) {
  const accessor = json.accessors[index];
  const view = json.bufferViews[accessor.bufferView];
  const [ArrayType, read] = COMPONENT_TYPES[accessor.componentType];
  const itemSize = COMPONENT_SIZES[accessor.type];
  const data = new ArrayType(accessor.count * itemSize);
  const dataView = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const stride = view.byteStride || itemSize * ArrayType.BYTES_PER_ELEMENT;
  for (let i = 0; i < accessor.count; i++) {
    for (let component = 0; component < itemSize; component++) {
      const offset = start + i * stride + component * ArrayType.BYTES_PER_ELEMENT;
      data[i * itemSize + component] = accessor.componentType === 5121
        ? dataView[read](offset)
        : dataView[read](offset, true);
    }
  }
  return { data, itemSize, count: accessor.count };
}

function createNodeHierarchy(json, jointNodes) {
  const objects = new Map();
  function create(index) {
    if (objects.has(index)) return objects.get(index);
    const definition = json.nodes[index];
    const object = jointNodes.has(index) ? new THREE.Bone() : new THREE.Group();
    object.name = definition.name || `node_${index}`;
    if (definition.matrix) {
      object.matrix.fromArray(definition.matrix);
      object.matrix.decompose(object.position, object.quaternion, object.scale);
    } else {
      if (definition.translation) object.position.fromArray(definition.translation);
      if (definition.rotation) object.quaternion.fromArray(definition.rotation);
      if (definition.scale) object.scale.fromArray(definition.scale);
    }
    objects.set(index, object);
    for (const child of definition.children || []) object.add(create(child));
    return object;
  }
  return { objects, create };
}

class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => {
      this.result = result;
      this.onloadend?.();
    });
  }
}

globalThis.FileReader = NodeFileReader;

const { json, binary } = parseGLB(await readFile(SOURCE_URL));
const bodyMesh = json.meshes.find(mesh => mesh.name === "Body");
const bodyNode = json.nodes.find(node => node.mesh === json.meshes.indexOf(bodyMesh));
const sourceSkin = json.skins[bodyNode.skin];
const humanBones = json.extensions.VRMC_vrm.humanoid.humanBones;
const inverseBindMatrices = accessorReader(json, binary, sourceSkin.inverseBindMatrices).data;
const primitiveFor = materialName => {
  const primitive = bodyMesh.primitives.find(item => json.materials[item.material]?.name === materialName);
  assert.ok(primitive, `Missing ${materialName}`);
  return {
    positions: accessorReader(json, binary, primitive.attributes.POSITION).data,
    normals: accessorReader(json, binary, primitive.attributes.NORMAL).data,
    joints: accessorReader(json, binary, primitive.attributes.JOINTS_0).data,
    weights: accessorReader(json, binary, primitive.attributes.WEIGHTS_0).data,
    indices: accessorReader(json, binary, primitive.indices).data
  };
};
const top = primitiveFor("Tops_01_CLOTH");
const skin = primitiveFor("Body_00_SKIN");
const jointIndex = name => {
  const index = sourceSkin.joints.indexOf(humanBones[name].node);
  assert.ok(index >= 0, `Missing top joint ${name}`);
  return index;
};
const chestJoint = jointIndex("chest");
const upperChestJoint = jointIndex("upperChest");

class GarmentBuilder {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.joints = [];
    this.weights = [];
    this.indices = [];
    this.surfaceTriangles = 0;
    this.sleeveTriangles = 0;
    this.detailTriangles = 0;
  }

  vertex(point, normal, joints, weights) {
    const index = this.positions.length / 3;
    this.positions.push(...point);
    this.normals.push(...normal);
    this.joints.push(...joints);
    this.weights.push(...weights);
    return index;
  }

  addSurface(source, keepTriangle, displace, sleeve = false) {
    const used = new Set();
    const triangles = [];
    for (let i = 0; i < source.indices.length; i += 3) {
      const triangle = [source.indices[i], source.indices[i + 1], source.indices[i + 2]];
      if (!keepTriangle(triangle, source)) continue;
      triangles.push(triangle);
      triangle.forEach(index => used.add(index));
    }
    const ordered = [...used].sort((a, b) => a - b);
    const remap = new Map(ordered.map((sourceIndex, targetIndex) => [sourceIndex, targetIndex]));
    const vertexOffset = this.positions.length / 3;
    for (const sourceIndex of ordered) {
      const p = sourceIndex * 3;
      const w = sourceIndex * 4;
      const point = displace(
        [source.positions[p], source.positions[p + 1], source.positions[p + 2]],
        [source.normals[p], source.normals[p + 1], source.normals[p + 2]]
      );
      this.vertex(
        point,
        [source.normals[p], source.normals[p + 1], source.normals[p + 2]],
        Array.from(source.joints.slice(w, w + 4)),
        Array.from(source.weights.slice(w, w + 4))
      );
    }
    for (const triangle of triangles) {
      this.indices.push(...triangle.map(index => vertexOffset + remap.get(index)));
    }
    if (sleeve) this.sleeveTriangles += triangles.length;
    else this.surfaceTriangles += triangles.length;
  }

  quad(points, normal, joints, weights) {
    const offset = this.positions.length / 3;
    for (const point of points) this.vertex(point, normal, joints, weights);
    this.indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    this.detailTriangles += 2;
  }

  button(center, radius, joints, weights) {
    const points = [
      [radius, 0, 0], [-radius, 0, 0],
      [0, radius, 0], [0, -radius, 0],
      [0, 0, radius], [0, 0, -radius]
    ];
    const faces = [
      [0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4],
      [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]
    ];
    for (const face of faces) {
      const offset = this.positions.length / 3;
      for (const index of face) {
        const normal = points[index].map(value => value / radius);
        this.vertex(center.map((value, axis) => value + points[index][axis]), normal, joints, weights);
      }
      this.indices.push(offset, offset + 1, offset + 2);
      this.detailTriangles++;
    }
  }
}

function torsoDisplace({ clearance, lowerFullness, foldStrength, ribbed, sleeveClearance }) {
  return ([x, y, z], normal) => {
    const angle = Math.atan2(z, x);
    const lower = clamp((1.12 - y) / .29, 0, 1);
    const hem = ribbed ? 1 - clamp((y - .83) / .075, 0, 1) : 0;
    const sleeve = sleeveClearance == null ? 0 : THREE.MathUtils.smoothstep(Math.abs(x), .17, .24) * THREE.MathUtils.smoothstep(y, 1.15, 1.20);
    const baseClearance = THREE.MathUtils.lerp(clearance, sleeveClearance ?? clearance, sleeve);
    const fold = Math.sin(y * 72 + angle * 3) * foldStrength * (.3 + lower * .7);
    const rib = Math.sin(angle * 28) * .0028 * hem;
    const offset = baseClearance + lower * lowerFullness + fold + rib - hem * .007;
    return [x + normal[0] * offset, y + normal[1] * offset, z + normal[2] * offset];
  };
}

function addLongSleeves(builder) {
  builder.addSurface(skin, (triangle, source) => {
    let x = 0, y = 0;
    for (const index of triangle) {
      x += Math.abs(source.positions[index * 3]) / 3;
      y += source.positions[index * 3 + 1] / 3;
    }
    return x >= .245 && x <= .537 && y >= 1.17 && y <= 1.34;
  }, ([x, y, z], normal) => {
    const armLength = clamp((Math.abs(x) - .245) / .292, 0, 1);
    const angle = Math.atan2(normal[2], normal[0]);
    const elbow = Math.exp(-Math.pow((armLength - .42) / .25, 2));
    const cuff = clamp((armLength - .82) / .18, 0, 1);
    const fold = Math.sin(armLength * 58 + angle * 2.5) * .0022 * (.35 + elbow * .65);
    const rib = Math.sin(angle * 18) * .0025 * cuff;
    const clearance = .026 + Math.sin(armLength * Math.PI) * .010 + fold + rib - cuff * .007;
    return [x + normal[0] * clearance, y + normal[1] * clearance, z + normal[2] * clearance];
  }, true);
}

function frontZ(y, x, clearance) {
  let nearest = Infinity;
  let z = .12;
  for (let i = 0; i < top.positions.length / 3; i++) {
    const offset = i * 3;
    if (top.positions[offset + 2] < .015) continue;
    const distance = Math.pow((top.positions[offset + 1] - y) * 4, 2) + Math.pow((top.positions[offset] - x) * 2, 2);
    if (distance < nearest) {
      nearest = distance;
      z = top.positions[offset + 2];
    }
  }
  return z + clearance;
}

function detailJoints(y) {
  const upper = clamp((y - 1.08) / .20, 0, 1);
  return {
    joints: [chestJoint, upperChestJoint, 0, 0],
    weights: [1 - upper, upper, 0, 0]
  };
}

function addShirtDetails(builder) {
  const clearance = .027;
  const rows = 18;
  const rowIndices = [];
  for (let row = 0; row <= rows; row++) {
    const y = .855 + .385 * row / rows;
    const { joints, weights } = detailJoints(y);
    const current = [];
    for (const x of [-.009, .009]) {
      current.push(builder.vertex([x, y, frontZ(y, x, clearance)], [0, 0, 1], joints, weights));
    }
    rowIndices.push(current);
    if (row > 0) {
      const previous = rowIndices[row - 1];
      builder.indices.push(previous[0], current[0], current[1], previous[0], current[1], previous[1]);
      builder.detailTriangles += 2;
    }
  }
  for (const y of [.91, .975, 1.04, 1.105, 1.17]) {
    const { joints, weights } = detailJoints(y);
    builder.button([0, y, frontZ(y, 0, clearance) + .005], .0038, joints, weights);
  }
  for (const side of [-1, 1]) {
    const points = [
      [side * .004, 1.325, 0],
      [side * .090, 1.300, 0],
      [side * .050, 1.235, 0],
      [side * .003, 1.278, 0]
    ];
    for (const point of points) point[2] = frontZ(point[1], point[0], .040);
    const { joints, weights } = detailJoints(1.29);
    builder.quad(points, [0, -.18, .984], joints, weights);
  }
}

async function exportGarment({ style, name, fileName, materialName, roughness, features, builder }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(builder.positions), 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(builder.normals), 3));
  geometry.setAttribute("skinIndex", new THREE.BufferAttribute(new Uint16Array(builder.joints), 4));
  geometry.setAttribute("skinWeight", new THREE.BufferAttribute(new Float32Array(builder.weights), 4));
  geometry.setIndex(builder.indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({
    name: materialName,
    color: 0xffffff,
    roughness,
    metalness: 0,
    side: THREE.DoubleSide
  });
  const garment = new THREE.SkinnedMesh(geometry, material);
  garment.normalizeSkinWeights();
  garment.name = name;
  garment.userData = {
    moriCategory: "top",
    moriStyle: style,
    moriFeatures: features,
    derivativeOf: "VRM1_Constraint_Twist_Sample.vrm",
    copyright: "(c) 2022 pixiv Inc.; derivative garment generated for MORI"
  };
  garment.castShadow = true;
  garment.receiveShadow = true;
  garment.frustumCulled = false;

  const jointNodes = new Set(sourceSkin.joints);
  const hierarchy = createNodeHierarchy(json, jointNodes);
  const assetScene = new THREE.Scene();
  assetScene.name = name + "_Rig";
  for (const root of json.scenes[json.scene || 0].nodes) assetScene.add(hierarchy.create(root));
  assetScene.add(garment);
  assetScene.updateMatrixWorld(true);
  const bones = sourceSkin.joints.map((node, index) => {
    const bone = hierarchy.objects.get(node);
    assert.ok(bone?.isBone, `Missing bone ${json.nodes[node]?.name}`);
    bone.userData.sourceJointIndex = index;
    return bone;
  });
  const boneInverses = sourceSkin.joints.map((node, index) => new THREE.Matrix4().fromArray(inverseBindMatrices, index * 16));
  garment.bind(new THREE.Skeleton(bones, boneInverses), new THREE.Matrix4());
  const output = await new GLTFExporter().parseAsync(assetScene, { binary: true, trs: true, onlyVisible: true });
  const outputURL = new URL("assets/models/" + fileName, ROOT);
  await writeFile(outputURL, Buffer.from(output));
  return {
    output: outputURL.pathname,
    bytes: output.byteLength,
    vertices: builder.positions.length / 3,
    triangles: builder.indices.length / 3,
    surfaceTriangles: builder.surfaceTriangles,
    sleeveTriangles: builder.sleeveTriangles,
    detailTriangles: builder.detailTriangles,
    minimumY: geometry.boundingBox.min.y,
    maximumY: geometry.boundingBox.max.y,
    bones: bones.length
  };
}

const tee = new GarmentBuilder();
tee.addSurface(top, () => true, torsoDisplace({ clearance: .018, lowerFullness: .005, foldStrength: .0015, ribbed: false }));
assert.equal(tee.surfaceTriangles, 1210);

const shirt = new GarmentBuilder();
shirt.addSurface(top, () => true, torsoDisplace({ clearance: .021, lowerFullness: .003, foldStrength: .001, ribbed: false }));
addShirtDetails(shirt);
assert.ok(shirt.detailTriangles >= 80);

const sweater = new GarmentBuilder();
sweater.addSurface(top, (triangle, source) => {
  let x = 0, y = 0;
  for (const index of triangle) {
    x += Math.abs(source.positions[index * 3]) / 3;
    y += source.positions[index * 3 + 1] / 3;
  }
  return !(x > .28 && y > 1.17);
}, torsoDisplace({ clearance: .030, lowerFullness: .006, foldStrength: .0022, ribbed: true, sleeveClearance: .024 }));
addLongSleeves(sweater);
assert.ok(sweater.sleeveTriangles >= 350);

const results = [];
results.push(await exportGarment({
  style: "tee", name: "MORI_Classic_Tee", fileName: "MORI_Classic_Tee.glb",
  materialName: "MORI_Tee_Fabric", roughness: .90,
  features: ["crew-neck", "short-sleeves", "fitted-torso"], builder: tee
}));
results.push(await exportGarment({
  style: "shirt", name: "MORI_Button_Shirt", fileName: "MORI_Button_Shirt.glb",
  materialName: "MORI_Shirt_Fabric", roughness: .82,
  features: ["collar", "button-placket", "short-sleeves"], builder: shirt
}));
results.push(await exportGarment({
  style: "sweater", name: "MORI_Knit_Sweater", fileName: "MORI_Knit_Sweater.glb",
  materialName: "MORI_Sweater_Fabric", roughness: .96,
  features: ["long-sleeves", "relaxed-fit", "ribbed-hem", "ribbed-cuffs"], builder: sweater
}));
console.log(JSON.stringify(results, null, 2));
