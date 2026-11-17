import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const ROOT = new URL("../", import.meta.url);
const SOURCE_URL = new URL("assets/models/VRM1_Constraint_Twist_Sample.vrm", ROOT);
const OUTPUT_URL = new URL("assets/models/MORI_Utility_Jacket.glb", ROOT);
const COMPONENT_SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const COMPONENT_TYPES = {
  5121: [Uint8Array, "getUint8"],
  5123: [Uint16Array, "getUint16"],
  5125: [Uint32Array, "getUint32"],
  5126: [Float32Array, "getFloat32"]
};

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

const positions = [];
const normals = [];
const joints = [];
const weights = [];
const garmentIndices = [];
let bodyTriangles = 0;
let sleeveTriangles = 0;
const clamp = THREE.MathUtils.clamp;
const openingWidth = y => .038 + .055 * clamp((y - .94) / .34, 0, 1);

function addSurface(source, keepTriangle, displace) {
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
  const vertexOffset = positions.length / 3;
  for (const sourceIndex of ordered) {
    const p = sourceIndex * 3;
    const w = sourceIndex * 4;
    const point = displace(
      [source.positions[p], source.positions[p + 1], source.positions[p + 2]],
      [source.normals[p], source.normals[p + 1], source.normals[p + 2]]
    );
    positions.push(...point);
    normals.push(source.normals[p], source.normals[p + 1], source.normals[p + 2]);
    for (let component = 0; component < 4; component++) {
      joints.push(source.joints[w + component]);
      weights.push(source.weights[w + component]);
    }
  }
  for (const triangle of triangles) {
    garmentIndices.push(...triangle.map(index => vertexOffset + remap.get(index)));
  }
  return triangles.length;
}

const top = primitiveFor("Tops_01_CLOTH");
bodyTriangles = addSurface(top, (triangle, source) => {
  let x = 0, y = 0, z = 0;
  for (const index of triangle) {
    x += source.positions[index * 3] / 3;
    y += source.positions[index * 3 + 1] / 3;
    z += source.positions[index * 3 + 2] / 3;
  }
  return !(z > .018 && Math.abs(x) < openingWidth(y));
}, ([x, y, z], normal) => {
  const angle = Math.atan2(z, x);
  const lower = clamp((1.12 - y) / .30, 0, 1);
  const fold = Math.sin(y * 78 + angle * 3) * .0018 * (.35 + lower * .65);
  const clearance = .034 + lower * .007 + fold;
  let garmentX = x + normal[0] * clearance;
  let garmentZ = z + normal[2] * clearance;
  if (z > .018) {
    const edgeDistance = Math.abs(Math.abs(x) - openingWidth(y));
    const lapel = Math.max(0, 1 - edgeDistance / .035) * clamp((y - .96) / .28, 0, 1);
    garmentX += Math.sign(x || 1) * .010 * lapel;
    garmentZ += .009 * lapel;
  }
  return [garmentX, y + normal[1] * clearance, garmentZ];
});
assert.ok(bodyTriangles >= 500);

const skin = primitiveFor("Body_00_SKIN");
sleeveTriangles = addSurface(skin, (triangle, source) => {
  let x = 0, y = 0;
  for (const index of triangle) {
    x += Math.abs(source.positions[index * 3]) / 3;
    y += source.positions[index * 3 + 1] / 3;
  }
  return x >= .245 && x <= .537 && y >= 1.17 && y <= 1.34;
}, ([x, y, z], normal) => {
  const armLength = clamp((Math.abs(x) - .245) / .292, 0, 1);
  const angle = Math.atan2(normal[2], normal[0]);
  const elbow = Math.exp(-Math.pow((armLength - .40) / .24, 2));
  const fold = Math.sin(armLength * 62 + angle * 2.5) * .0018 * (.35 + elbow * .65);
  const clearance = .038 + Math.sin(armLength * Math.PI) * .008 + fold;
  return [x + normal[0] * clearance, y + normal[1] * clearance, z + normal[2] * clearance];
});
assert.ok(sleeveTriangles >= 350);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(normals), 3));
geometry.setAttribute("skinIndex", new THREE.BufferAttribute(new Uint16Array(joints), 4));
geometry.setAttribute("skinWeight", new THREE.BufferAttribute(new Float32Array(weights), 4));
geometry.setIndex(garmentIndices);
geometry.computeBoundingBox();
geometry.computeBoundingSphere();

const material = new THREE.MeshStandardMaterial({
  name: "MORI_Jacket_Fabric",
  color: 0xffffff,
  roughness: .88,
  metalness: 0,
  side: THREE.DoubleSide
});
const garment = new THREE.SkinnedMesh(geometry, material);
garment.normalizeSkinWeights();
garment.name = "MORI_Utility_Jacket";
garment.userData = {
  moriCategory: "outer",
  moriStyle: "jacket",
  derivativeOf: "VRM1_Constraint_Twist_Sample.vrm",
  copyright: "(c) 2022 pixiv Inc.; derivative garment generated for MORI"
};
garment.castShadow = true;
garment.receiveShadow = true;
garment.frustumCulled = false;

const jointNodes = new Set(sourceSkin.joints);
const hierarchy = createNodeHierarchy(json, jointNodes);
const assetScene = new THREE.Scene();
assetScene.name = "MORI_Utility_Jacket_Rig";
for (const root of json.scenes[json.scene || 0].nodes) assetScene.add(hierarchy.create(root));
assetScene.add(garment);
assetScene.updateMatrixWorld(true);
const inverseBindMatrices = accessorReader(json, binary, sourceSkin.inverseBindMatrices).data;
const bones = sourceSkin.joints.map((node, index) => {
  const bone = hierarchy.objects.get(node);
  assert.ok(bone?.isBone, `Missing bone ${json.nodes[node]?.name}`);
  bone.userData.sourceJointIndex = index;
  return bone;
});
const boneInverses = sourceSkin.joints.map((node, index) => new THREE.Matrix4().fromArray(inverseBindMatrices, index * 16));
garment.bind(new THREE.Skeleton(bones, boneInverses), new THREE.Matrix4());

const output = await new GLTFExporter().parseAsync(assetScene, {
  binary: true,
  trs: true,
  onlyVisible: true
});
await writeFile(OUTPUT_URL, Buffer.from(output));
console.log(JSON.stringify({
  output: OUTPUT_URL.pathname,
  bytes: output.byteLength,
  vertices: positions.length / 3,
  triangles: garmentIndices.length / 3,
  bodyTriangles,
  sleeveTriangles,
  bones: bones.length
}, null, 2));
