import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const ROOT = new URL("../", import.meta.url);
const SOURCE_URL = new URL("assets/models/VRM1_Constraint_Twist_Sample.vrm", ROOT);
const OUTPUT_URL = new URL("assets/models/MORI_Long_Coat.glb", ROOT);
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
let skirtTriangles = 0;
const clamp = THREE.MathUtils.clamp;
const openingWidth = y => .040 + .045 * clamp((y - .94) / .34, 0, 1);

function sourceVertex(source, index) {
  const p = index * 3;
  const w = index * 4;
  return {
    point: Array.from(source.positions.slice(p, p + 3)),
    normal: Array.from(source.normals.slice(p, p + 3)),
    joints: Array.from(source.joints.slice(w, w + 4)),
    weights: Array.from(source.weights.slice(w, w + 4))
  };
}

function mixVertex(a, b, t) {
  const influences = new Map();
  for (const [vertex, factor] of [[a, 1 - t], [b, t]]) {
    for (let component = 0; component < 4; component++) {
      const joint = vertex.joints[component];
      influences.set(joint, (influences.get(joint) || 0) + vertex.weights[component] * factor);
    }
  }
  const blended = [...influences.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  while (blended.length < 4) blended.push([0, 0]);
  const total = blended.reduce((sum, entry) => sum + entry[1], 0) || 1;
  const normal = new THREE.Vector3(...a.normal.map((value, axis) => THREE.MathUtils.lerp(value, b.normal[axis], t))).normalize();
  return {
    point: a.point.map((value, axis) => THREE.MathUtils.lerp(value, b.point[axis], t)),
    normal: normal.toArray(),
    joints: blended.map(entry => entry[0]),
    weights: blended.map(entry => entry[1] / total)
  };
}

function clipPolygon(vertices, distance) {
  const result = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const aInside = distance(a) >= 0;
    const bInside = distance(b) >= 0;
    if (aInside) result.push(a);
    if (aInside === bInside) continue;
    let start = 0, end = 1;
    for (let iteration = 0; iteration < 18; iteration++) {
      const middle = (start + end) / 2;
      if ((distance(mixVertex(a, b, middle)) >= 0) === aInside) start = middle;
      else end = middle;
    }
    result.push(mixVertex(a, b, (start + end) / 2));
  }
  return result;
}

function addOpenFrontSurface(source, displace) {
  let triangleCount = 0;
  for (let i = 0; i < source.indices.length; i += 3) {
    const triangle = [sourceVertex(source, source.indices[i]), sourceVertex(source, source.indices[i + 1]), sourceVertex(source, source.indices[i + 2])];
    const outsideOpening = triangle.every(vertex => vertex.point[2] <= .018)
      || triangle.every(vertex => vertex.point[0] > .085)
      || triangle.every(vertex => vertex.point[0] < -.085);
    const regions = outsideOpening ? [triangle] : [clipPolygon(triangle, vertex => .018 - vertex.point[2])];
    if (!outsideOpening) {
      const front = clipPolygon(triangle, vertex => vertex.point[2] - .018);
      if (front.length >= 3) {
        regions.push(clipPolygon(front, vertex => -vertex.point[0] - openingWidth(vertex.point[1])));
        regions.push(clipPolygon(front, vertex => vertex.point[0] - openingWidth(vertex.point[1])));
      }
    }
    for (const polygon of regions) {
      if (polygon.length < 3) continue;
      for (let corner = 1; corner < polygon.length - 1; corner++) {
        const offset = positions.length / 3;
        for (const vertex of [polygon[0], polygon[corner], polygon[corner + 1]]) {
          positions.push(...displace(vertex.point, vertex.normal));
          normals.push(...vertex.normal);
          joints.push(...vertex.joints);
          weights.push(...vertex.weights);
        }
        garmentIndices.push(offset, offset + 1, offset + 2);
        triangleCount++;
      }
    }
  }
  return triangleCount;
}

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
bodyTriangles = addOpenFrontSurface(top, ([x, y, z], normal) => {
  const angle = Math.atan2(z, x);
  const lower = clamp((1.12 - y) / .30, 0, 1);
  const fold = Math.sin(y * 78 + angle * 3) * .0018 * (.35 + lower * .65);
  const clearance = .040 + lower * .007 + fold;
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

const humanBones = json.extensions.VRMC_vrm.humanoid.humanBones;
const skirtJointIndices = ["hips", "spine", "leftUpperLeg", "rightUpperLeg"].map(name => {
  const index = sourceSkin.joints.indexOf(humanBones[name].node);
  assert.ok(index >= 0, `Missing coat joint ${name}`);
  return index;
});
const skirtRings = 18;
const skirtSegments = 48;
const skirtVertexOffset = positions.length / 3;
for (let ring = 0; ring <= skirtRings; ring++) {
  const t = ring / skirtRings;
  const y = .90 - .52 * t;
  const join = clamp(t / .16, 0, 1);
  const radiusX = .200 + .040 * join + .025 * t;
  const radiusZ = .170 + .025 * join + .010 * t;
  const opening = .042 + .033 * t;
  const startAngle = Math.asin(opening / radiusX);
  for (let segment = 0; segment <= skirtSegments; segment++) {
    const theta = startAngle + (Math.PI * 2 - startAngle * 2) * segment / skirtSegments;
    const fold = Math.sin(theta * 7 + t * .8) * (.0025 + .0045 * t) + Math.sin(theta * 13 - t) * .0015;
    const x = (radiusX + fold) * Math.sin(theta);
    const z = (radiusZ + fold) * Math.cos(theta);
    const hemWave = Math.sin(theta * 4 + .5) * .003 * t;
    positions.push(x, y + hemWave, z);
    const normal = new THREE.Vector3(Math.sin(theta) / radiusX, .12, Math.cos(theta) / radiusZ).normalize();
    normals.push(normal.x, normal.y, normal.z);
    joints.push(...skirtJointIndices);
    const spineWeight = .20 * (1 - t);
    const legWeight = .18 * t;
    const hipsWeight = 1 - spineWeight - legWeight;
    const leftShare = clamp(.5 + Math.sin(theta) * .5, 0, 1);
    weights.push(hipsWeight, spineWeight, legWeight * leftShare, legWeight * (1 - leftShare));
  }
}
for (let ring = 0; ring < skirtRings; ring++) {
  for (let segment = 0; segment < skirtSegments; segment++) {
    const a = skirtVertexOffset + ring * (skirtSegments + 1) + segment;
    const b = a + skirtSegments + 1;
    const c = a + 1;
    const d = b + 1;
    garmentIndices.push(a, b, c, b, d, c);
    skirtTriangles += 2;
  }
}
assert.equal(skirtTriangles, 1728);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(normals), 3));
geometry.setAttribute("skinIndex", new THREE.BufferAttribute(new Uint16Array(joints), 4));
geometry.setAttribute("skinWeight", new THREE.BufferAttribute(new Float32Array(weights), 4));
geometry.setIndex(garmentIndices);
geometry.computeBoundingBox();
geometry.computeBoundingSphere();

const material = new THREE.MeshStandardMaterial({
  name: "MORI_Coat_Fabric",
  color: 0xffffff,
  roughness: .88,
  metalness: 0,
  side: THREE.DoubleSide
});
const garment = new THREE.SkinnedMesh(geometry, material);
garment.normalizeSkinWeights();
garment.name = "MORI_Long_Coat";
garment.userData = {
  moriCategory: "outer",
  moriStyle: "coat",
  moriFeatures: ["open-front", "smooth-placket", "long-sleeves", "flared-hem"],
  derivativeOf: "VRM1_Constraint_Twist_Sample.vrm",
  copyright: "(c) 2022 pixiv Inc.; derivative garment generated for MORI"
};
garment.castShadow = true;
garment.receiveShadow = true;
garment.frustumCulled = false;

const jointNodes = new Set(sourceSkin.joints);
const hierarchy = createNodeHierarchy(json, jointNodes);
const assetScene = new THREE.Scene();
assetScene.name = "MORI_Long_Coat_Rig";
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
  skirtTriangles,
  bones: bones.length
}, null, 2));
