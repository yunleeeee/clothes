import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAvatarModel } from "../src/avatar3d.js";
import { DEMO_ITEMS, STYLES } from "../src/wardrobe.js";

function eachGeometry(model, callback) {
  model.traverse(object => {
    if (object.isMesh) callback(object.geometry, object);
  });
}

test("lookbook stays lightweight while VRM is loaded only on demand", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<script type="importmap">/);
  assert.doesNotMatch(html, /<script[^>]+src="\/node_modules\/three/);
  assert.match(html, /id="smart-style"/);
  assert.match(html, /id="toggle-guides"/);
  assert.match(html, /id="open-3d"/);
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(app, /renderLookbook/);
  assert.match(app, /import\("\.\/assetAvatar\.js"\)/);
  assert.doesNotMatch(app, /^import .*assetAvatar/m);
});

test("3D avatar contains a volumetric body and selected garments", () => {
  const model = createAvatarModel({ top: "demo-1", bottom: "demo-3", shoes: "demo-6" }, DEMO_ITEMS);
  assert.equal(model.userData.engine, "three");
  assert.deepEqual(model.userData.garments, ["bottom", "top", "shoes"]);
  assert.ok(model.getObjectByName("body"));
  for (const layer of ["top", "bottom", "shoes"]) {
    const garment = model.getObjectByName(layer);
    assert.ok(garment, layer);
    garment.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.computeBoundingBox();
      const box = object.geometry.boundingBox;
      assert.ok(box.max.z - box.min.z > .01, layer + " has real depth");
    });
  }
});

test("3D dress replaces separate top and bottom", () => {
  const item = { id: "dress", category: "dress", style: "longdress", color: "#87978d" };
  const model = createAvatarModel({ dress: item.id }, [item]);
  assert.deepEqual(model.userData.garments, ["dress"]);
  assert.ok(model.getObjectByName("dress-body"));
  assert.ok(!model.getObjectByName("top"));
  assert.ok(!model.getObjectByName("bottom"));
});

test("every 3D garment style produces finite geometry at proportion limits", () => {
  for (const [category, styles] of Object.entries(STYLES)) {
    for (const [style] of styles) {
      const item = { id: category + "-" + style, category, style, color: "#87978d" };
      const model = createAvatarModel({ [category]: item.id }, [item], {
        shoulders: 80, waist: 125, hips: 125, legs: 112
      });
      let count = 0;
      eachGeometry(model, geometry => {
        count++;
        for (const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value), category + "/" + style);
      });
      assert.ok(count > 20, category + "/" + style);
    }
  }
});

test("long sleeves and trousers use continuous surfaces without joint pieces", () => {
  const model = createAvatarModel({ top: "demo-2", bottom: "demo-3", outer: "demo-5" }, DEMO_ITEMS);
  for (const name of ["long-sleeve", "trouser-leg"]) assert.ok(model.getObjectByName(name), name);
  for (const removed of ["sleeve-elbow", "trouser-knee", "lower-trouser-leg"]) assert.ok(!model.getObjectByName(removed), removed);
  assert.ok(model.getObjectByName("open-coat-body"));
});
