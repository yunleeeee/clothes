import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { installBodyMorphs } from "../src/bodyMorphs.js";

function skinnedPerson() {
  const geometry = new THREE.CylinderGeometry(.5, .5, 2, 12, 12);
  geometry.translate(0, 1, 0);
  const face = new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.array), 3);
  face.name = "smile";
  geometry.morphAttributes.position = [face];
  const faceNormal = new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3);
  faceNormal.name = "smile";
  geometry.morphAttributes.normal = [faceNormal];
  const body = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  body.morphTargetDictionary = { smile: 0 };
  body.morphTargetInfluences = [0];
  const shirt = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  shirt.morphTargetDictionary = { smile: 0 };
  shirt.morphTargetInfluences = [0];
  const root = new THREE.Group();
  root.add(body, shirt);
  return { root, body, shirt, geometry };
}

test("body morphs preserve facial targets and deform skin and clothing together", () => {
  const { root, body, shirt, geometry } = skinnedPerson();
  const controller = installBodyMorphs(root);
  assert.deepEqual(controller.names, ["MORI_SHOULDERS", "MORI_WAIST", "MORI_HIPS", "MORI_LEG_LENGTH"]);
  assert.equal(body.morphTargetDictionary.smile, 0);
  assert.equal(shirt.morphTargetDictionary.MORI_WAIST, body.morphTargetDictionary.MORI_WAIST);
  assert.equal(geometry.morphAttributes.position.length, 5);
  assert.equal(geometry.morphAttributes.normal.length, 5);
  assert.ok(geometry.morphAttributes.normal.slice(1).every(attribute => attribute.array.every(value => value === 0)));
  controller.setProfile({ shoulders: 120, waist: 80, hips: 110, legs: 120 });
  assert.deepEqual(controller.getInfluences(), { shoulders: 1, waist: -1, hips: .5, legs: 1 });
  assert.equal(shirt.morphTargetInfluences[shirt.morphTargetDictionary.MORI_SHOULDERS], 1);
  const legIndex = body.morphTargetDictionary.MORI_LEG_LENGTH;
  const legTarget = geometry.morphAttributes.position[legIndex];
  let legChanged = false;
  for (let i = 0; i < legTarget.count; i++) {
    if (Math.abs(legTarget.getY(i) - geometry.attributes.position.getY(i)) > .001) legChanged = true;
  }
  assert.ok(legChanged);
});

test("body morph values are normalized and clamped", () => {
  const { root } = skinnedPerson();
  const controller = installBodyMorphs(root);
  controller.setProfile({ shoulders: 200, waist: 0, hips: Number.NaN, legs: undefined });
  assert.deepEqual(controller.getInfluences(), { shoulders: 1, waist: -1, hips: 0, legs: 0 });
});

test("body morph installation requires a skinned character", () => {
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  assert.throws(() => installBodyMorphs(root), /没有可添加体型变形的骨骼网格/);
});
