import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const ROOT = new URL("../", import.meta.url);
const SOURCE_URL = new URL("assets/models/MORI_Straight_Pants.glb", ROOT);
const OUTPUT_URL = new URL("assets/models/MORI_Casual_Shorts.glb", ROOT);
const HEM_Y = .58;

class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => {
      this.result = result;
      this.onloadend?.();
    });
  }
}

globalThis.FileReader = NodeFileReader;

const buffer = await readFile(SOURCE_URL);
const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const gltf = await new GLTFLoader().parseAsync(data, "");
let source;
gltf.scene.traverse(object => {
  if (!source && object.isSkinnedMesh && object.userData.moriStyle === "pants") source = object;
});
assert.ok(source, "Missing source trousers");

const sourceGeometry = source.geometry;
const position = sourceGeometry.attributes.position;
const normal = sourceGeometry.attributes.normal;
const skinIndex = sourceGeometry.attributes.skinIndex;
const skinWeight = sourceGeometry.attributes.skinWeight;
const sourceIndices = sourceGeometry.index.array;
const used = new Set();
const triangles = [];
for (let i = 0; i < sourceIndices.length; i += 3) {
  const triangle = [sourceIndices[i], sourceIndices[i + 1], sourceIndices[i + 2]];
  const centerY = triangle.reduce((sum, index) => sum + position.getY(index), 0) / 3;
  if (centerY < HEM_Y) continue;
  triangles.push(triangle);
  triangle.forEach(index => used.add(index));
}
assert.ok(used.size >= 500);
assert.ok(triangles.length >= 800);

const ordered = [...used].sort((a, b) => a - b);
const remap = new Map(ordered.map((sourceIndex, targetIndex) => [sourceIndex, targetIndex]));
const positions = new Float32Array(ordered.length * 3);
const normals = new Float32Array(ordered.length * 3);
const joints = new Uint16Array(ordered.length * 4);
const weights = new Float32Array(ordered.length * 4);
for (let target = 0; target < ordered.length; target++) {
  const sourceIndex = ordered[target];
  const x = position.getX(sourceIndex);
  const y = position.getY(sourceIndex);
  const z = position.getZ(sourceIndex);
  const nx = normal.getX(sourceIndex);
  const ny = normal.getY(sourceIndex);
  const nz = normal.getZ(sourceIndex);
  const hem = 1 - THREE.MathUtils.clamp((y - HEM_Y) / .18, 0, 1);
  const angle = Math.atan2(z, x);
  const fold = Math.sin(angle * 7 + y * 36) * .0025 * hem;
  const clearance = .009 * hem + fold;
  positions[target * 3] = x + nx * clearance;
  positions[target * 3 + 1] = y + ny * clearance;
  positions[target * 3 + 2] = z + nz * clearance;
  normals[target * 3] = nx;
  normals[target * 3 + 1] = ny;
  normals[target * 3 + 2] = nz;
  for (let component = 0; component < 4; component++) {
    joints[target * 4 + component] = skinIndex.getComponent(sourceIndex, component);
    weights[target * 4 + component] = skinWeight.getComponent(sourceIndex, component);
  }
}

const indices = [];
for (const triangle of triangles) indices.push(...triangle.map(index => remap.get(index)));
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
geometry.setAttribute("skinIndex", new THREE.BufferAttribute(joints, 4));
geometry.setAttribute("skinWeight", new THREE.BufferAttribute(weights, 4));
geometry.setIndex(indices);
geometry.computeBoundingBox();
geometry.computeBoundingSphere();

const material = source.material.clone();
material.name = "MORI_Shorts_Fabric";
material.roughness = .94;
const garment = new THREE.SkinnedMesh(geometry, material);
garment.name = "MORI_Casual_Shorts";
garment.userData = {
  moriCategory: "bottom",
  moriStyle: "shorts",
  derivativeOf: "MORI_Straight_Pants.glb",
  copyright: "(c) 2022 pixiv Inc.; derivative garment generated for MORI"
};
garment.position.copy(source.position);
garment.quaternion.copy(source.quaternion);
garment.scale.copy(source.scale);
garment.castShadow = true;
garment.receiveShadow = true;
garment.frustumCulled = false;
garment.normalizeSkinWeights();
source.parent.add(garment);
garment.bind(source.skeleton, source.bindMatrix);
source.removeFromParent();

const output = await new GLTFExporter().parseAsync(gltf.scene, {
  binary: true,
  trs: true,
  onlyVisible: true
});
await writeFile(OUTPUT_URL, Buffer.from(output));
console.log(JSON.stringify({
  output: OUTPUT_URL.pathname,
  bytes: output.byteLength,
  vertices: ordered.length,
  triangles: indices.length / 3,
  bones: garment.skeleton.bones.length,
  minimumY: geometry.boundingBox.min.y
}, null, 2));
