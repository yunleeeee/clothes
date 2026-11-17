import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const ROOT = new URL("../", import.meta.url);
const SOURCE_URL = new URL("assets/models/VRM1_Constraint_Twist_Sample.vrm", ROOT);
const OUTPUT_URL = new URL("assets/models/MORI_Straight_Pants.glb", ROOT);
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

const source = parseGLB(await readFile(SOURCE_URL));
const { json, binary } = source;
const body = json.meshes.find(mesh => mesh.name === "Body").primitives
  .find(primitive => json.materials[primitive.material]?.name === "Body_00_SKIN");
const positions = accessorReader(json, binary, body.attributes.POSITION);
const normals = accessorReader(json, binary, body.attributes.NORMAL);
const joints = accessorReader(json, binary, body.attributes.JOINTS_0);
const weights = accessorReader(json, binary, body.attributes.WEIGHTS_0);
const indices = accessorReader(json, binary, body.indices).data;
const sourceSkin = json.skins[json.nodes.find(node => node.mesh === json.meshes.findIndex(mesh => mesh.name === "Body")).skin];
const humanBones = json.extensions.VRMC_vrm.humanoid.humanBones;
const garmentBoneNames = [
  "hips", "spine", "leftUpperLeg", "leftLowerLeg", "rightUpperLeg", "rightLowerLeg", "leftFoot", "rightFoot"
];
const garmentNodes = new Set(garmentBoneNames.map(name => humanBones[name].node));
const garmentJointIndices = new Set();
sourceSkin.joints.forEach((node, index) => {
  if (garmentNodes.has(node)) garmentJointIndices.add(index);
});

const eligible = new Uint8Array(positions.count);
for (let i = 0; i < positions.count; i++) {
  const y = positions.data[i * 3 + 1];
  let garmentWeight = 0;
  for (let component = 0; component < 4; component++) {
    if (garmentJointIndices.has(joints.data[i * 4 + component])) {
      garmentWeight += weights.data[i * 4 + component];
    }
  }
  eligible[i] = y >= .06 && y <= 1.02 && garmentWeight > .45 ? 1 : 0;
}

const bodySource = {
  positions: positions.data,
  normals: normals.data,
  joints: joints.data,
  weights: weights.data
};
const garmentPositions = [];
const garmentNormals = [];
const garmentJoints = [];
const garmentWeights = [];
const garmentIndices = [];
let surfaceTriangles = 0;

function sourceVertex(index) {
  const p = index * 3;
  const w = index * 4;
  return {
    point: Array.from(bodySource.positions.slice(p, p + 3)),
    normal: Array.from(bodySource.normals.slice(p, p + 3)),
    joints: Array.from(bodySource.joints.slice(w, w + 4)),
    weights: Array.from(bodySource.weights.slice(w, w + 4))
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

function clipPlane(vertices, distance) {
  const result = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const da = distance(a);
    const db = distance(b);
    if (da >= 0) result.push(a);
    if ((da >= 0) !== (db >= 0)) result.push(mixVertex(a, b, da / (da - db)));
  }
  return result;
}

function displace([x, y, z], normal) {
  const lowerLeg = THREE.MathUtils.clamp((.82 - y) / .68, 0, 1);
  const waist = THREE.MathUtils.clamp((y - .78) / .22, 0, 1);
  const knee = Math.exp(-Math.pow((y - .46) / .12, 2));
  const angle = Math.atan2(normal[2], normal[0]);
  const fold = Math.sin(y * 82 + angle * 2) * .0017 * (.25 + lowerLeg * .75)
    + Math.sin(y * 132 + angle * 3) * .0022 * knee;
  const clothOffset = .016 + lowerLeg * .018 - waist * .003 + knee * .003 + fold;
  const verticalWeight = THREE.MathUtils.smoothstep(y, .09, .15) * (1 - THREE.MathUtils.smoothstep(y, .945, .985));
  return [
    x + normal[0] * clothOffset,
    y + normal[1] * clothOffset * verticalWeight,
    z + normal[2] * clothOffset
  ];
}

function appendVertex(vertex, point = displace(vertex.point, vertex.normal)) {
  const index = garmentPositions.length / 3;
  garmentPositions.push(...point);
  garmentNormals.push(...vertex.normal);
  garmentJoints.push(...vertex.joints);
  garmentWeights.push(...vertex.weights);
  return index;
}

for (let i = 0; i < indices.length; i += 3) {
  const sourceTriangle = [indices[i], indices[i + 1], indices[i + 2]];
  if (!sourceTriangle.every(index => eligible[index])) continue;
  let polygon = clipPlane(sourceTriangle.map(sourceVertex), vertex => vertex.point[1] - .09);
  polygon = clipPlane(polygon, vertex => .985 - vertex.point[1]);
  if (polygon.length < 3) continue;
  for (let corner = 1; corner < polygon.length - 1; corner++) {
    const offset = garmentPositions.length / 3;
    appendVertex(polygon[0]);
    appendVertex(polygon[corner]);
    appendVertex(polygon[corner + 1]);
    garmentIndices.push(offset, offset + 1, offset + 2);
    surfaceTriangles++;
  }
}
assert.ok(surfaceTriangles >= 2000);

const jointIndex = name => {
  const index = sourceSkin.joints.indexOf(humanBones[name].node);
  assert.ok(index >= 0, `Missing pants joint ${name}`);
  return index;
};
const hipsJoint = jointIndex("hips");
const spineJoint = jointIndex("spine");
const legJoints = {
  left: [jointIndex("leftUpperLeg"), jointIndex("leftLowerLeg")],
  right: [jointIndex("rightUpperLeg"), jointIndex("rightLowerLeg")]
};

function appendDetailVertex(point, normal, joints, weights) {
  const index = garmentPositions.length / 3;
  garmentPositions.push(...point);
  garmentNormals.push(...normal);
  garmentJoints.push(...joints);
  garmentWeights.push(...weights);
  return index;
}

function appendTriangle(points, normal, joints, weights) {
  const offset = garmentPositions.length / 3;
  for (const point of points) appendDetailVertex(point, normal, joints, weights);
  garmentIndices.push(offset, offset + 1, offset + 2);
}

function addWaistband() {
  const rows = 3, segments = 48;
  for (let row = 0; row < rows; row++) {
    for (let segment = 0; segment < segments; segment++) {
      const offset = garmentPositions.length / 3;
      for (const [ring, step] of [[row, segment], [row + 1, segment], [row + 1, segment + 1], [row, segment + 1]]) {
        const y = .935 + .05 * ring / rows;
        const theta = Math.PI * 2 * step / segments;
        const rib = Math.cos(theta * 16) * .0012;
        const x = (.150 + rib) * Math.sin(theta);
        const z = (.121 + rib) * Math.cos(theta);
        const normal = new THREE.Vector3(Math.sin(theta) / .150, 0, Math.cos(theta) / .121).normalize().toArray();
        appendDetailVertex([x, y, z], normal, [hipsJoint, spineJoint, 0, 0], [.82, .18, 0, 0]);
      }
      garmentIndices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    }
  }
}

function legFrontZ(y, x) {
  let nearest = Infinity;
  let z = .02;
  for (let i = 0; i < positions.count; i++) {
    const offset = i * 3;
    if (Math.sign(positions.data[offset]) !== Math.sign(x) || positions.data[offset + 2] < -.02) continue;
    const distance = Math.pow((positions.data[offset + 1] - y) * 5, 2) + Math.pow((positions.data[offset] - x) * 3, 2);
    if (distance < nearest) {
      nearest = distance;
      z = positions.data[offset + 2];
    }
  }
  return z + .016 + THREE.MathUtils.clamp((.82 - y) / .68, 0, 1) * .018 + .006;
}

function addCreases() {
  const rows = 24;
  for (const [sideName, sign] of [["left", 1], ["right", -1]]) {
    for (let row = 0; row < rows; row++) {
      const y0 = .18 + .50 * row / rows;
      const y1 = .18 + .50 * (row + 1) / rows;
      const points = [];
      for (const [y, edge] of [[y0, -1], [y1, -1], [y1, 1], [y0, 1]]) {
        const center = sign * (.080 + .004 * (y - .2));
        const x = center + edge * .0016;
        points.push([x, y, legFrontZ(y, center)]);
      }
      const upper = THREE.MathUtils.clamp((y0 - .40) / .18, 0, 1);
      const joints = [...legJoints[sideName], 0, 0];
      const weights = [upper, 1 - upper, 0, 0];
      appendTriangle([points[0], points[1], points[2]], [0, 0, 1], joints, weights);
      appendTriangle([points[0], points[2], points[3]], [0, 0, 1], joints, weights);
    }
  }
}

function addCuffs() {
  const rows = 2, segments = 32;
  for (const [sideName, sign] of [["left", 1], ["right", -1]]) {
    for (let row = 0; row < rows; row++) {
      for (let segment = 0; segment < segments; segment++) {
        const offset = garmentPositions.length / 3;
        for (const [ring, step] of [[row, segment], [row + 1, segment], [row + 1, segment + 1], [row, segment + 1]]) {
          const y = .085 + .050 * ring / rows;
          const theta = Math.PI * 2 * step / segments;
          const fold = Math.cos(theta * 12) * .0012;
          const x = sign * .080 + (.064 + fold) * Math.sin(theta);
          const z = -.030 + (.068 + fold) * Math.cos(theta);
          const normal = new THREE.Vector3(Math.sin(theta) / .064, 0, Math.cos(theta) / .068).normalize().toArray();
          appendDetailVertex([x, y, z], normal, [legJoints[sideName][1], 0, 0, 0], [1, 0, 0, 0]);
        }
        garmentIndices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
      }
    }
  }
}

const detailStart = garmentIndices.length / 3;
addWaistband();
addCreases();
addCuffs();
const detailTriangles = garmentIndices.length / 3 - detailStart;
assert.ok(detailTriangles >= 400);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(garmentPositions), 3));
geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(garmentNormals), 3));
geometry.setAttribute("skinIndex", new THREE.BufferAttribute(new Uint16Array(garmentJoints), 4));
geometry.setAttribute("skinWeight", new THREE.BufferAttribute(new Float32Array(garmentWeights), 4));
geometry.setIndex(garmentIndices);
geometry.computeBoundingBox();
geometry.computeBoundingSphere();

const material = new THREE.MeshStandardMaterial({
  name: "MORI_Pants_Fabric",
  color: 0xffffff,
  roughness: .92,
  metalness: 0,
  side: THREE.DoubleSide
});
const garment = new THREE.SkinnedMesh(geometry, material);
garment.normalizeSkinWeights();
garment.name = "MORI_Straight_Pants";
garment.userData = {
  moriCategory: "bottom",
  moriStyle: "pants",
  moriFeatures: ["straight-leg", "waistband", "pressed-creases", "turned-cuffs"],
  derivativeOf: "VRM1_Constraint_Twist_Sample.vrm",
  copyright: "(c) 2022 pixiv Inc.; derivative garment generated for MORI"
};
garment.castShadow = true;
garment.receiveShadow = true;
garment.frustumCulled = false;

const jointNodes = new Set(sourceSkin.joints);
const hierarchy = createNodeHierarchy(json, jointNodes);
const assetScene = new THREE.Scene();
assetScene.name = "MORI_Straight_Pants_Rig";
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
  vertices: garmentPositions.length / 3,
  triangles: garmentIndices.length / 3,
  surfaceTriangles,
  detailTriangles,
  minimumY: geometry.boundingBox.min.y,
  bones: bones.length
}, null, 2));
