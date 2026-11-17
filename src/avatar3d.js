import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DEFAULT_PROFILE, normalizeColor, normalizeStyle } from "./wardrobe.js";

const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (a, b, t) => a + (b - a) * t;
const point = (x, y, z = 0) => new THREE.Vector3(x, y, z);
let fabricTexture;

function weaveTexture() {
  if (fabricTexture) return fabricTexture;
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const value = 128 + (x % 4 === 0 ? 24 : 0) - (y % 4 === 0 ? 22 : 0) + ((x * 17 + y * 31) % 9);
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  fabricTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  fabricTexture.wrapS = fabricTexture.wrapT = THREE.RepeatWrapping;
  fabricTexture.repeat.set(5, 8);
  fabricTexture.needsUpdate = true;
  return fabricTexture;
}

function standard(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: 0, ...options });
}

function cloth(color, style = "") {
  return standard(normalizeColor(color), {
    roughness: style === "sweater" ? .96 : .86,
    side: THREE.DoubleSide,
    bumpMap: weaveTexture(),
    bumpScale: style === "sweater" ? .035 : .018
  });
}

function tint(color, amount) {
  const base = color?.isColor ? color.clone() : new THREE.Color(normalizeColor(color));
  return base.offsetHSL(0, 0, amount);
}

function mesh(geometry, material, name = "") {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function ellipsoid(material, position, scale, name = "") {
  const result = mesh(new THREE.SphereGeometry(1, 28, 20), material, name);
  result.position.copy(position);
  result.scale.set(...scale);
  return result;
}

function tube(points, radius, material, name = "") {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(new THREE.TubeGeometry(curve, 16, radius, 6, false), material, name);
}

function ringGeometry(profiles, options = {}) {
  const radial = options.radial || 48;
  const subdivision = options.subdivision || 3;
  const gap = options.gap || 0;
  const rings = [];
  for (let i = 0; i < profiles.length - 1; i++) {
    const a = profiles[i], b = profiles[i + 1];
    for (let step = 0; step < subdivision; step++) {
      const t = step / subdivision;
      rings.push({
        y: mix(a.y, b.y, t), rx: mix(a.rx, b.rx, t), rz: mix(a.rz, b.rz, t),
        x: mix(a.x || 0, b.x || 0, t), z: mix(a.z || 0, b.z || 0, t),
        fold: mix(a.fold || 0, b.fold || 0, t)
      });
    }
  }
  rings.push({ x: 0, z: 0, fold: 0, ...profiles[profiles.length - 1] });
  const positions = [], uvs = [], indices = [];
  const minY = rings[0].y, height = rings[rings.length - 1].y - minY || 1;
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    for (let j = 0; j <= radial; j++) {
      const theta = gap + (TAU - gap * 2) * j / radial;
      const fold = ring.fold * (Math.sin(theta * 9 + ring.y * 4.1) * .68 + Math.sin(theta * 15 - ring.y * 6.2) * .32);
      positions.push(
        ring.x + (ring.rx + fold) * Math.sin(theta),
        ring.y,
        ring.z + (ring.rz + fold * .72) * Math.cos(theta)
      );
      uvs.push(j / radial, (ring.y - minY) / height);
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  if (!gap && options.capBottom) {
    const center = positions.length / 3;
    positions.push(rings[0].x || 0, rings[0].y, rings[0].z || 0); uvs.push(.5, .5);
    for (let j = 0; j < radial; j++) indices.push(center, j + 1, j);
  }
  if (!gap && options.capTop) {
    const center = positions.length / 3;
    const last = rings[rings.length - 1], offset = (rings.length - 1) * (radial + 1);
    positions.push(last.x || 0, last.y, last.z || 0); uvs.push(.5, .5);
    for (let j = 0; j < radial; j++) indices.push(center, offset + j, offset + j + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function panel(vertices, material, name = "") {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3));
  geometry.setIndex(vertices.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]);
  geometry.computeVertexNormals();
  return mesh(geometry, material, name);
}

function limb(start, end, radiusStart, radiusEnd, material, options = {}) {
  const length = start.distanceTo(end);
  const rings = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const muscle = Math.sin(Math.PI * t) * (options.muscle || 0);
    const radius = mix(radiusStart, radiusEnd, t) + muscle;
    rings.push({
      y: length * t,
      rx: radius,
      rz: radius * (options.ellipse || .9),
      fold: options.fold ? options.fold * (.3 + .7 * Math.abs(t - .5) * 2) : 0
    });
  }
  const result = mesh(ringGeometry(rings, { radial: options.radial || 28, subdivision: 1, capTop: true, capBottom: true }), material, options.name);
  result.position.copy(start);
  result.quaternion.setFromUnitVectors(UP, end.clone().sub(start).normalize());
  return result;
}

function sweepLimb(points, radii, material, options = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const segments = options.segments || 24, radial = options.radial || 28;
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const center = curve.getPoint(t), tangent = curve.getTangent(t).normalize();
    let depth = point(0, 0, 1).addScaledVector(tangent, -tangent.z);
    if (depth.lengthSq() < .001) depth = point(1, 0, 0).addScaledVector(tangent, -tangent.x);
    depth.normalize();
    const width = new THREE.Vector3().crossVectors(tangent, depth).normalize();
    const position = t * (radii.length - 1), index = Math.min(radii.length - 2, Math.floor(position));
    const radius = mix(radii[index], radii[index + 1], position - index) + Math.sin(Math.PI * t) * (options.muscle || 0);
    for (let j = 0; j <= radial; j++) {
      const theta = TAU * j / radial;
      const fold = (options.fold || 0) * (.35 + .65 * Math.abs(t - .5) * 2) * (Math.sin(theta * 8 + t * 18) * .7 + Math.sin(theta * 13 - t * 11) * .3);
      const vertex = center.clone()
        .addScaledVector(width, Math.cos(theta) * (radius + fold))
        .addScaledVector(depth, Math.sin(theta) * (radius + fold * .72) * (options.ellipse || .92));
      positions.push(vertex.x, vertex.y, vertex.z); uvs.push(j / radial, t);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  if (options.capStart !== false) {
    const startCenter = positions.length / 3;
    positions.push(points[0].x, points[0].y, points[0].z); uvs.push(.5, 0);
    for (let j = 0; j < radial; j++) indices.push(startCenter, j, j + 1);
  }
  if (options.capEnd !== false) {
    const endCenter = positions.length / 3, offset = segments * (radial + 1), last = points[points.length - 1];
    positions.push(last.x, last.y, last.z); uvs.push(.5, 1);
    for (let j = 0; j < radial; j++) indices.push(endCenter, offset + j + 1, offset + j);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return mesh(geometry, material, options.name);
}

function proportions(values = {}) {
  const merged = { ...DEFAULT_PROFILE, ...values };
  return {
    shoulders: clamp(Number(merged.shoulders) / 100 || 1, .78, 1.28),
    waist: clamp(Number(merged.waist) / 100 || 1, .78, 1.3),
    hips: clamp(Number(merged.hips) / 100 || 1, .78, 1.3),
    legs: clamp(Number(merged.legs) / 100 || 1, .88, 1.14),
    skin: normalizeColor(merged.skin, DEFAULT_PROFILE.skin),
    hair: normalizeColor(merged.hair, DEFAULT_PROFILE.hair)
  };
}

function anchors(p) {
  return {
    left: {
      shoulder: point(-.81 * p.shoulders, 4.39, .01),
      elbow: point(-1.01 * p.shoulders, 3.55, .08),
      wrist: point(-1.07 * p.shoulders, 2.78, .17)
    },
    right: {
      shoulder: point(.81 * p.shoulders, 4.39, .01),
      elbow: point(1.01 * p.shoulders, 3.55, .08),
      wrist: point(1.07 * p.shoulders, 2.78, .17)
    }
  };
}

function createHead(p) {
  const group = new THREE.Group(); group.name = "head";
  const skin = standard(p.skin, { roughness: .72 });
  const skinShade = standard(tint(p.skin, -.055), { roughness: .78 });
  const hair = standard(p.hair, { roughness: .67 });
  const hairLight = standard(tint(p.hair, .035), { roughness: .7 });
  group.add(ellipsoid(skin, point(-.455, 5.22, 0), [.082, .14, .072], "left-ear"));
  group.add(ellipsoid(skin, point(.455, 5.22, 0), [.082, .14, .072], "right-ear"));
  const face = mesh(ringGeometry([
    { y: 4.77, rx: .045, rz: .075, z: .025 },
    { y: 4.84, rx: .26, rz: .27, z: .01 },
    { y: 5.10, rx: .435, rz: .39 },
    { y: 5.42, rx: .465, rz: .415 },
    { y: 5.69, rx: .41, rz: .365, z: -.015 },
    { y: 5.87, rx: .18, rz: .19, z: -.025 },
    { y: 5.91, rx: .025, rz: .04, z: -.025 }
  ], { capTop: true, capBottom: true }), skin, "face");
  group.add(face);
  const eyeWhite = standard("#fbfaf6", { roughness: .45 });
  const iris = standard("#344b48", { roughness: .35 });
  const pupil = standard("#172321", { roughness: .3 });
  const highlight = standard("#ffffff", { roughness: .2 });
  for (const side of [-1, 1]) {
    const eye = ellipsoid(eyeWhite, point(side * .18, 5.34, .39), [.112, .073, .027], "eye");
    eye.rotation.y = side * -.1;
    group.add(eye);
    group.add(ellipsoid(iris, point(side * .18, 5.335, .418), [.046, .052, .016], "iris"));
    group.add(ellipsoid(pupil, point(side * .18, 5.333, .431), [.021, .034, .009], "pupil"));
    group.add(ellipsoid(highlight, point(side * .166, 5.357, .439), [.011, .013, .005], "eye-highlight"));
    group.add(tube([
      point(side * .29, 5.51, .358), point(side * .19, 5.535, .39), point(side * .085, 5.505, .405)
    ], .014, hair, "eyebrow"));
  }
  group.add(ellipsoid(skinShade, point(0, 5.15, .405), [.038, .061, .041], "nose"));
  group.add(tube([point(-.075, 5.005, .348), point(0, 4.99, .365), point(.075, 5.005, .348)], .008, standard("#a86662"), "mouth"));
  group.add(ellipsoid(hair, point(0, 5.54, -.12), [.495, .50, .39], "hair-back"));
  for (const side of [-1, 1]) {
    group.add(ellipsoid(hair, point(side * .425, 5.38, -.025), [.075, .25, .12], "sideburn"));
  }
  const tufts = [
    [-.31, 5.65, .20, -.28, .12, .28], [-.16, 5.68, .27, -.16, .13, .31],
    [0, 5.69, .28, .09, .135, .32], [.17, 5.67, .25, .22, .13, .29], [.32, 5.65, .18, .30, .11, .25]
  ];
  for (const [x, y, z, rotation, width, height] of tufts) {
    const tuft = ellipsoid(hair, point(x, y, z), [width, height, .085], "fringe");
    tuft.rotation.z = rotation;
    group.add(tuft);
  }
  group.add(tube([point(-.31, 5.78, .18), point(-.12, 5.91, .14), point(.13, 5.91, .10)], .018, hairLight, "hair-highlight"));
  return group;
}

function createBody(p) {
  const group = new THREE.Group(); group.name = "body";
  const skin = standard(p.skin, { roughness: .76 });
  group.add(mesh(ringGeometry([
    { y: 2.89, rx: .57 * p.hips, rz: .29 },
    { y: 3.25, rx: .54 * p.waist, rz: .28 },
    { y: 3.82, rx: .67 * p.shoulders, rz: .30 },
    { y: 4.31, rx: .79 * p.shoulders, rz: .31 },
    { y: 4.42, rx: .72 * p.shoulders, rz: .28 }
  ], { capTop: true, capBottom: true }), skin, "torso"));
  const neck = mesh(new THREE.CylinderGeometry(.20, .235, .51, 28), skin, "neck");
  neck.position.set(0, 4.64, -.005); group.add(neck);
  const bodyAnchors = anchors(p);
  for (const side of ["left", "right"]) {
    const a = bodyAnchors[side];
    group.add(sweepLimb([a.shoulder, a.elbow, a.wrist], [.195, .153, .108], skin, { muscle: .012, ellipse: .90, name: side + "-arm" }));
    const hand = ellipsoid(skin, a.wrist.clone().add(point(0, -.17, .025)), [.135, .235, .095], side + "-hand");
    hand.rotation.z = side === "left" ? -.07 : .07; group.add(hand);
  }
  for (const side of [-1, 1]) {
    const hip = point(side * .34 * p.hips, 3.03, 0);
    const knee = point(side * .375, 1.73, .025);
    const ankle = point(side * .38, .52, .035);
    group.add(sweepLimb([hip, knee, ankle], [.265 * p.hips, .19, .125], skin, { muscle: .024, ellipse: .94, name: "leg" }));
    group.add(ellipsoid(skin, point(side * .38, .24, .16), [.22, .16, .40], "foot"));
  }
  group.add(createHead(p));
  group.traverse(object => { if (object.isMesh) object.receiveShadow = false; });
  return group;
}

function addSleeves(group, p, material, style, outer = false) {
  const bodyAnchors = anchors(p);
  const short = style === "tee" || style === "dress" || style === "longdress";
  const base = outer ? .265 : .225;
  for (const side of ["left", "right"]) {
    const a = bodyAnchors[side];
    const sleeve = new THREE.Group(); sleeve.name = side + (outer ? "-outer-sleeve" : "-sleeve");
    sleeve.add(ellipsoid(material, a.shoulder.clone().add(point(0, .015, 0)), [base * 1.02, base * .52, base * .98], "sleeve-cap"));
    const end = short ? a.shoulder.clone().lerp(a.elbow, .58) : a.wrist;
    if (short) {
      sleeve.add(sweepLimb([a.shoulder, end], [base, base * .90], material, { muscle: .012, fold: .007, ellipse: .96, name: "short-sleeve" }));
      const cuffStart = a.shoulder.clone().lerp(a.elbow, .51);
      sleeve.add(limb(cuffStart, end, base * .92, base * .90, standard(tint(material.color, -.018), { side: THREE.DoubleSide }), { ellipse: .96, name: "sleeve-hem" }));
    } else {
      sleeve.add(sweepLimb([a.shoulder, a.elbow, a.wrist], [base, base * .80, base * .57], material, { muscle: .014, fold: .011, ellipse: .95, name: "long-sleeve" }));
      const cuffStart = a.elbow.clone().lerp(a.wrist, .86);
      sleeve.add(limb(cuffStart, a.wrist, base * .61, base * .58, standard(tint(material.color, -.025), { side: THREE.DoubleSide }), { ellipse: .94, name: "cuff" }));
    }
    group.add(sleeve);
  }
}

function createTop(item, p) {
  const style = normalizeStyle("top", item.style);
  const group = new THREE.Group(); group.name = "top"; group.userData.style = style;
  const material = cloth(item.color, style);
  const hem = style === "sweater" ? 3.00 : 3.04;
  group.add(mesh(ringGeometry([
    { y: hem, rx: .635 * p.hips, rz: .342, fold: .012 },
    { y: 3.28, rx: .575 * p.waist, rz: .318, fold: .009 },
    { y: 3.83, rx: .70 * p.shoulders, rz: .35, fold: .005 },
    { y: 4.28, rx: .825 * p.shoulders, rz: .35, fold: .002 },
    { y: 4.40, rx: .79 * p.shoulders, rz: .325 }
  ]), material, "top-body"));
  group.add(mesh(ringGeometry([
    { y: 4.38, rx: .80 * p.shoulders, rz: .33 },
    { y: 4.60, rx: .255, rz: .215, z: -.005 }
  ]), material, "shoulders"));
  group.add(mesh(ringGeometry([
    { y: 4.565, rx: .26, rz: .22 }, { y: 4.635, rx: .245, rz: .205 }
  ], { subdivision: 1 }), standard(tint(item.color, -.035), { side: THREE.DoubleSide }), "neck-band"));
  addSleeves(group, p, material, style);
  if (style === "sweater") {
    group.add(mesh(ringGeometry([
      { y: hem - .005, rx: .64 * p.hips, rz: .345 }, { y: hem + .12, rx: .625 * p.hips, rz: .34 }
    ], { subdivision: 1 }), standard(tint(item.color, -.03), { side: THREE.DoubleSide, bumpMap: weaveTexture(), bumpScale: .04 }), "ribbed-hem"));
  }
  if (style === "shirt") {
    const collarMaterial = standard(tint(item.color, .055), { side: THREE.DoubleSide, roughness: .88 });
    group.add(panel([[-.255, 4.59, .20], [-.02, 4.48, .34], [-.17, 4.27, .36], [-.35, 4.46, .29]], collarMaterial, "left-collar"));
    group.add(panel([[.255, 4.59, .20], [.02, 4.48, .34], [.17, 4.27, .36], [.35, 4.46, .29]], collarMaterial, "right-collar"));
    const buttonMaterial = standard(tint(item.color, -.12), { roughness: .5 });
    for (let y = 4.25; y > 3.18; y -= .22) group.add(ellipsoid(buttonMaterial, point(0, y, .358), [.024, .024, .012], "button"));
  }
  return group;
}

function createBottom(item, p) {
  const style = normalizeStyle("bottom", item.style);
  const group = new THREE.Group(); group.name = "bottom"; group.userData.style = style;
  const material = cloth(item.color, style);
  if (style === "skirt") {
    group.add(mesh(ringGeometry([
      { y: 1.92, rx: .90 * p.hips, rz: .53, fold: .048 },
      { y: 2.45, rx: .76 * p.hips, rz: .43, fold: .030 },
      { y: 3.23, rx: .59 * p.waist, rz: .33, fold: .005 }
    ]), material, "skirt"));
    group.add(mesh(ringGeometry([
      { y: 3.15, rx: .60 * p.waist, rz: .335 }, { y: 3.29, rx: .585 * p.waist, rz: .33 }
    ], { subdivision: 1 }), standard(tint(item.color, -.035), { side: THREE.DoubleSide }), "waistband"));
    return group;
  }
  const short = style === "shorts";
  group.add(mesh(ringGeometry([
    { y: 2.72, rx: .63 * p.hips, rz: .345, fold: .005 },
    { y: 3.06, rx: .65 * p.hips, rz: .35 },
    { y: 3.30, rx: .595 * p.waist, rz: .335 }
  ]), material, "trouser-seat"));
  group.add(mesh(ringGeometry([
    { y: 3.22, rx: .61 * p.waist, rz: .34 }, { y: 3.34, rx: .59 * p.waist, rz: .33 }
  ], { subdivision: 1 }), standard(tint(item.color, -.04), { side: THREE.DoubleSide }), "waistband"));
  for (const side of [-1, 1]) {
    const hip = point(side * .34 * p.hips, 3.00, 0);
    const knee = point(side * .375, short ? 2.12 : 1.73, .025);
    const ankle = point(side * .38, .53, .035);
    if (!short) {
      group.add(sweepLimb([hip, knee, ankle], [.315 * p.hips, .242, .205], material, { muscle: .014, fold: .014, ellipse: 1.02, capStart: false, capEnd: false, name: "trouser-leg" }));
    } else {
      group.add(sweepLimb([hip, knee], [.315 * p.hips, .285], material, { muscle: .014, fold: .012, ellipse: 1.03, capStart: false, capEnd: false, name: "shorts-leg" }));
      const hemStart = hip.clone().lerp(knee, .88);
      group.add(limb(hemStart, knee, .29, .285, standard(tint(item.color, -.018), { side: THREE.DoubleSide }), { ellipse: 1.03, name: "shorts-hem" }));
    }
  }
  return group;
}

function createDress(item, p) {
  const style = normalizeStyle("dress", item.style);
  const group = new THREE.Group(); group.name = "dress"; group.userData.style = style;
  const material = cloth(item.color, style);
  const long = style === "longdress";
  group.add(mesh(ringGeometry([
    { y: long ? 1.15 : 1.78, rx: long ? 1.00 : .91, rz: long ? .62 : .54, fold: .058 },
    { y: 2.15, rx: .83 * p.hips, rz: .47, fold: .039 },
    { y: 3.18, rx: .575 * p.waist, rz: .325, fold: .006 },
    { y: 3.82, rx: .69 * p.shoulders, rz: .345, fold: .005 },
    { y: 4.38, rx: .79 * p.shoulders, rz: .325 }
  ]), material, "dress-body"));
  group.add(mesh(ringGeometry([
    { y: 4.37, rx: .80 * p.shoulders, rz: .33 },
    { y: 4.59, rx: .255, rz: .215 }
  ]), material, "dress-shoulders"));
  group.add(mesh(ringGeometry([
    { y: 4.56, rx: .26, rz: .22 }, { y: 4.63, rx: .245, rz: .205 }
  ], { subdivision: 1 }), standard(tint(item.color, -.035), { side: THREE.DoubleSide }), "dress-neckline"));
  group.add(mesh(ringGeometry([
    { y: 3.14, rx: .59 * p.waist, rz: .335 }, { y: 3.29, rx: .58 * p.waist, rz: .33 }
  ], { subdivision: 1 }), standard(tint(item.color, -.045), { side: THREE.DoubleSide }), "dress-waist"));
  addSleeves(group, p, material, style);
  return group;
}

function createOuter(item, p) {
  const style = normalizeStyle("outer", item.style);
  const group = new THREE.Group(); group.name = "outer"; group.userData.style = style;
  const material = cloth(item.color, style);
  const long = style === "coat";
  const hem = long ? 1.82 : 2.91;
  const gap = long ? .22 : .19;
  group.add(mesh(ringGeometry([
    { y: hem, rx: (long ? .78 : .70) * p.hips, rz: .405, fold: .017 },
    { y: 3.27, rx: .65 * p.waist, rz: .385, fold: .008 },
    { y: 3.85, rx: .77 * p.shoulders, rz: .40, fold: .004 },
    { y: 4.40, rx: .875 * p.shoulders, rz: .375 }
  ], { gap }), material, "open-coat-body"));
  group.add(mesh(ringGeometry([
    { y: 4.38, rx: .875 * p.shoulders, rz: .375 },
    { y: 4.61, rx: .265, rz: .23 }
  ], { gap }), material, "coat-shoulders"));
  addSleeves(group, p, material, style, true);
  const lapel = standard(tint(item.color, .045), { side: THREE.DoubleSide, roughness: .86 });
  group.add(panel([[-.27, 4.59, .23], [-.075, 4.30, .40], [-.25, 3.96, .41], [-.47, 4.43, .32]], lapel, "left-lapel"));
  group.add(panel([[.27, 4.59, .23], [.075, 4.30, .40], [.25, 3.96, .41], [.47, 4.43, .32]], lapel, "right-lapel"));
  const pocketMaterial = standard(tint(item.color, -.025), { roughness: .9 });
  for (const side of [-1, 1]) {
    const pocket = mesh(new THREE.BoxGeometry(.27, .24, .026), pocketMaterial, "pocket");
    pocket.position.set(side * .47 * p.hips, long ? 2.69 : 3.28, .383);
    pocket.rotation.y = side * -.16;
    group.add(pocket);
  }
  return group;
}

function createShoes(item) {
  const style = normalizeStyle("shoes", item.style);
  const group = new THREE.Group(); group.name = "shoes"; group.userData.style = style;
  const material = cloth(item.color, style);
  const soleMaterial = standard(style === "boots" ? "#292c2b" : "#d6d2c7", { roughness: .88 });
  for (const side of [-1, 1]) {
    const x = side * .38;
    group.add(ellipsoid(material, point(x, .255, .18), [.295, .19, .51], "shoe-upper"));
    group.add(ellipsoid(soleMaterial, point(x, .105, .19), [.305, .072, .525], "sole"));
    if (style === "boots") {
      group.add(limb(point(x, .34, .02), point(x, 1.16, .015), .235, .245, material, { fold: .009, ellipse: .96, name: "boot-shaft" }));
      group.add(limb(point(x, 1.07, .015), point(x, 1.18, .015), .252, .252, standard(tint(item.color, -.04)), { name: "boot-cuff" }));
    } else {
      const lace = standard("#f5f1e7", { roughness: .8 });
      for (let i = 0; i < 3; i++) {
        group.add(tube([point(x - .11, .355 + i * .018, .38 - i * .055), point(x, .37 + i * .018, .39 - i * .055), point(x + .11, .355 + i * .018, .38 - i * .055)], .012, lace, "lace"));
      }
    }
  }
  return group;
}

function createAccessory(item) {
  const style = normalizeStyle("accessory", item.style);
  const group = new THREE.Group(); group.name = "accessory"; group.userData.style = style;
  const material = cloth(item.color, style);
  if (style === "scarf") {
    const loop = mesh(new THREE.TorusGeometry(.31, .09, 12, 48), material, "scarf-loop");
    loop.position.set(0, 4.59, .005); loop.rotation.x = Math.PI / 2; loop.scale.x = 1.08;
    group.add(loop);
    const tail = mesh(new THREE.BoxGeometry(.20, .78, .055, 1, 8, 1), material, "scarf-tail");
    tail.position.set(.12, 4.13, .385); tail.rotation.z = -.10; group.add(tail);
  } else {
    for (const side of [-1, 1]) {
      const wing = ellipsoid(material, point(side * .16, 4.51, .36), [.20, .12, .065], "bow-wing");
      wing.rotation.z = side * .38; group.add(wing);
    }
    group.add(ellipsoid(standard(tint(item.color, -.04)), point(0, 4.51, .40), [.085, .09, .07], "bow-knot"));
  }
  return group;
}

export function createAvatarModel(look = {}, items = [], values = {}) {
  const p = proportions(values);
  const root = new THREE.Group(); root.name = "mori-avatar";
  root.rotation.y = -.10;
  root.add(createBody(p));
  const worn = Object.fromEntries(Object.entries(look).map(([category, id]) => [category, items.find(item => item.id === id)]));
  const garments = [];
  if (worn.dress) {
    root.add(createDress(worn.dress, p)); garments.push("dress");
  } else {
    if (worn.bottom) { root.add(createBottom(worn.bottom, p)); garments.push("bottom"); }
    if (worn.top) { root.add(createTop(worn.top, p)); garments.push("top"); }
  }
  if (worn.shoes) { root.add(createShoes(worn.shoes)); garments.push("shoes"); }
  if (worn.outer) { root.add(createOuter(worn.outer, p)); garments.push("outer"); }
  if (worn.accessory) { root.add(createAccessory(worn.accessory)); garments.push("accessory"); }
  root.userData.engine = "three";
  root.userData.garments = garments;
  return root;
}

function disposeModel(model) {
  const materials = new Set();
  model.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
    else materials.add(object.material);
  });
  materials.forEach(material => material.dispose());
}

export function mountAvatar3D(element, initial = {}) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xefeee9, 0);
  renderer.domElement.dataset.engine = "three";
  renderer.domElement.setAttribute("aria-label", "3D 人物，拖动旋转，滚轮或双指缩放");
  renderer.domElement.tabIndex = 0;
  element.replaceChildren(renderer.domElement);
  element.dataset.engine = "three";

  const camera = new THREE.PerspectiveCamera(32, 1, .1, 60);
  camera.position.set(.1, 3.25, 12.2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2.92, 0);
  controls.enableDamping = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  controls.dampingFactor = .065;
  controls.enablePan = false;
  controls.minDistance = 7.4;
  controls.maxDistance = 15;
  controls.minPolarAngle = .68;
  controls.maxPolarAngle = 1.72;
  controls.autoRotateSpeed = 1.25;
  controls.update();
  controls.saveState();

  scene.add(new THREE.HemisphereLight(0xfffcf5, 0x788078, 2.1));
  const key = new THREE.DirectionalLight(0xfff7e9, 2.35);
  key.position.set(-3, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.camera.left = key.shadow.camera.bottom = -4;
  key.shadow.camera.right = key.shadow.camera.top = 4;
  key.shadow.camera.near = .5; key.shadow.camera.far = 20;
  key.shadow.bias = -.0004;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdde8e4, 1.1); fill.position.set(4, 4, 1); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.5); rim.position.set(1, 6, -5); scene.add(rim);

  const floor = mesh(new THREE.CircleGeometry(2.15, 64), standard("#e5e4de", { roughness: 1, transparent: true, opacity: .68 }), "studio-floor");
  floor.rotation.x = -Math.PI / 2; floor.position.y = .015; floor.castShadow = false; scene.add(floor);
  const shadow = mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ color: 0x3b443c, opacity: .13 }), "contact-shadow");
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .022; shadow.castShadow = false; scene.add(shadow);

  let model;
  function update(look = {}, items = [], values = {}) {
    if (model) { scene.remove(model); disposeModel(model); }
    model = createAvatarModel(look, items, values);
    scene.add(model);
    element.dataset.garments = model.userData.garments.join(" ");
  }
  function resize() {
    const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(element); resize();
  const dragging = () => element.classList.add("dragging");
  const released = () => element.classList.remove("dragging");
  controls.addEventListener("start", dragging); controls.addEventListener("end", released);
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
  update(initial.look, initial.items, initial.profile);
  return {
    update,
    reset() { controls.reset(); controls.autoRotate = false; },
    setAutoRotate(value) { controls.autoRotate = Boolean(value); },
    dispose() {
      renderer.setAnimationLoop(null); observer.disconnect(); controls.dispose();
      if (model) disposeModel(model);
      floor.geometry.dispose(); floor.material.dispose(); shadow.geometry.dispose(); shadow.material.dispose();
      renderer.dispose(); renderer.domElement.remove();
    }
  };
}
