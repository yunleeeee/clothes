import * as THREE from "three";

const REGIONS = [
  ["MORI_SHOULDERS", "shoulders"],
  ["MORI_WAIST", "waist"],
  ["MORI_HIPS", "hips"],
  ["MORI_LEG_LENGTH", "legs"]
];
const clamp = value => Math.max(-1, Math.min(1, value));

function band(y, center, width) {
  const distance = Math.abs(y - center) / width;
  if (distance >= 1) return 0;
  const value = 1 - distance;
  return value * value * (3 - 2 * value);
}

function displacedPoint(source, region, minY, height) {
  const point = source.clone();
  const y = (point.y - minY) / height;
  if (region === "shoulders") {
    point.x *= 1 + .18 * band(y, .77, .17);
  } else if (region === "waist") {
    const weight = 1 + .16 * band(y, .56, .14);
    point.x *= weight;
    point.z *= weight;
  } else if (region === "hips") {
    const weight = 1 + .16 * band(y, .46, .14);
    point.x *= weight;
    point.z *= weight;
  } else if (region === "legs") {
    const hipY = minY + height * .48;
    if (point.y < hipY) point.y = minY + (point.y - minY) * 1.12;
    else point.y += (hipY - minY) * .12;
  }
  return point;
}

function assetBounds(root) {
  const box = new THREE.Box3();
  const vertex = new THREE.Vector3();
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  root.traverse(object => {
    if (!object.isSkinnedMesh) return;
    const transform = rootInverse.clone().multiply(object.matrixWorld);
    const positions = object.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(transform);
      box.expandByPoint(vertex);
    }
  });
  if (box.isEmpty()) throw new Error("glTF 人物没有可添加体型变形的骨骼网格");
  return box;
}

function prepareMesh(object, rootInverse, box, caches) {
  const geometry = object.geometry;
  let cache = caches.get(geometry);
  if (cache) return cache.indices;
  const positions = geometry.attributes.position;
  if (!positions || positions.itemSize !== 3) return null;
  const morphPositions = geometry.morphAttributes.position || [];
  const morphNormals = geometry.morphAttributes.normal;
  const morphColors = geometry.morphAttributes.color;
  const indices = {};
  const minY = box.min.y, height = box.max.y - box.min.y || 1;
  const transform = rootInverse.clone().multiply(object.matrixWorld);
  const inverse = transform.clone().invert();
  const source = new THREE.Vector3();
  for (const [name, region] of REGIONS) {
    const values = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      source.fromBufferAttribute(positions, i).applyMatrix4(transform);
      const displaced = displacedPoint(source, region, minY, height).applyMatrix4(inverse);
      const offset = i * 3;
      if (geometry.morphTargetsRelative) {
        values[offset] = displaced.x - positions.getX(i);
        values[offset + 1] = displaced.y - positions.getY(i);
        values[offset + 2] = displaced.z - positions.getZ(i);
      } else {
        values[offset] = displaced.x;
        values[offset + 1] = displaced.y;
        values[offset + 2] = displaced.z;
      }
    }
    const attribute = new THREE.BufferAttribute(values, 3);
    attribute.name = name;
    indices[name] = morphPositions.length;
    morphPositions.push(attribute);
    if (morphNormals) {
      const normal = new THREE.BufferAttribute(new Float32Array(positions.count * 3), 3);
      normal.name = name + "_NORMAL";
      morphNormals.push(normal);
    }
    if (morphColors) {
      const color = new THREE.BufferAttribute(new Float32Array(positions.count * (morphColors[0]?.itemSize || 3)), morphColors[0]?.itemSize || 3);
      color.name = name + "_COLOR";
      morphColors.push(color);
    }
  }
  geometry.morphAttributes.position = morphPositions;
  cache = { indices };
  caches.set(geometry, cache);
  return indices;
}

export function installBodyMorphs(root) {
  const box = assetBounds(root);
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const caches = new WeakMap();
  const targets = [];
  root.traverse(object => {
    if (!object.isSkinnedMesh) return;
    const indices = prepareMesh(object, rootInverse, box, caches);
    if (!indices) return;
    object.morphTargetDictionary = object.morphTargetDictionary || {};
    object.morphTargetInfluences = object.morphTargetInfluences || [];
    for (const [name, profileKey] of REGIONS) {
      const index = indices[name];
      object.morphTargetDictionary[name] = index;
      if (object.morphTargetInfluences[index] == null) object.morphTargetInfluences[index] = 0;
      targets.push({ object, index, profileKey });
    }
  });
  return {
    names: REGIONS.map(([name]) => name),
    setProfile(profile = {}) {
      for (const { object, index, profileKey } of targets) {
        const value = (Number(profile[profileKey] ?? 100) - 100) / 20;
        object.morphTargetInfluences[index] = clamp(Number.isFinite(value) ? value : 0);
      }
    },
    getInfluences() {
      const result = {};
      for (const [name, profileKey] of REGIONS) {
        const target = targets.find(item => item.profileKey === profileKey);
        result[profileKey] = target ? target.object.morphTargetInfluences[target.index] : 0;
      }
      return result;
    }
  };
}
