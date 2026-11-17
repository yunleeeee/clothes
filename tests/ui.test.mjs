import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderAvatar } from "../src/avatar.js";
import { DEMO_ITEMS, STYLES } from "../src/wardrobe.js";

test("styling board exposes core actions and lookbook controls", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const id of ["avatar", "wardrobe-grid", "add-garment", "upload-dialog", "smart-style", "open-3d", "asset-controls", "rotate-3d", "reset-3d", "profile-shoulders", "profile-waist", "profile-hips", "profile-legs", "toggle-guides", "save-look", "clear-look", "harmony-bar", "saved-looks", "auto-cutout"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  for (const removed of ["shoulders", "waist", "hair-options"]) {
    assert.ok(!html.includes('id="' + removed + '"'), "unexpected control " + removed);
  }
});
test("avatar renders multiple garment styles", () => {
  const noGarment = renderAvatar();
  const dressed = renderAvatar({ top: "demo-1", bottom: "demo-3", shoes: "demo-6" }, DEMO_ITEMS);
  assert.match(dressed, /<svg/);
  assert.match(dressed, /<path/);
  assert.notEqual(noGarment, dressed);
});

test("male character and worn garment layers use explicit anatomy anchors", () => {
  const dressed=renderAvatar(
    {top:"demo-2",bottom:"demo-3",outer:"demo-5",shoes:"demo-6"},
    DEMO_ITEMS
  );
  assert.match(dressed,/data-avatar-gender="male"/);
  for (const layer of ["body","bottom","shoes","top","outer","face","hair"]) {
    assert.match(dressed,new RegExp('data-layer="' + layer + '"'));
  }
  assert.ok(dressed.indexOf('data-layer="bottom"') < dressed.indexOf('data-layer="top"'));
  assert.ok(dressed.indexOf('data-layer="face"') > dressed.indexOf('data-layer="outer"'));
});
test("shirt, knit, trousers and coat produce distinct fitted silhouettes", () => {
  const shirt=renderAvatar({top:"demo-2"},DEMO_ITEMS);
  const tee=renderAvatar({top:"demo-1"},DEMO_ITEMS);
  const pants=renderAvatar({bottom:"demo-3"},DEMO_ITEMS);
  const shorts=renderAvatar({bottom:"demo-4"},DEMO_ITEMS);
  assert.notEqual(shirt,tee);
  assert.notEqual(pants,shorts);
});

test("original anime illustration is present as a real JPEG asset", async () => {
  const jpeg = await readFile(new URL("../assets/mori-anime-boy.jpg", import.meta.url));
  assert.ok(jpeg.byteLength > 4000);
  assert.equal(jpeg[0], 0xff);
  assert.equal(jpeg[1], 0xd8);
  assert.equal(jpeg[2], 0xff);
});
test("the UI loads the illustrated model with clothing color regions", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const renderer = await readFile(new URL("../src/model.js", import.meta.url), "utf8");
  assert.match(app, /renderModel\(/);
  assert.match(renderer, /mori-anime-boy\.jpg/);
  for(const region of ["top","bottom","shoes"]) assert.match(renderer,new RegExp(region + ": \\["));
});
test("every garment style renders numeric fabric geometry at proportion limits", () => {
  for (const [category, styles] of Object.entries(STYLES)) {
    for (const [style] of styles) {
      const item = { id: category + "-" + style, category, style, color: "#87978d" };
      const svg = renderAvatar({ [category]: item.id }, [item], {
        shoulders: 80, waist: 125, hips: 125, legs: 112
      });
      assert.match(svg, /url\(#garment-shadow\)/);
      assert.doesNotMatch(svg, /NaN|undefined/);
    }
  }
});

test("a dress replaces the default trouser layer", () => {
  const item = { id: "dress", category: "dress", style: "longdress", color: "#87978d" };
  const svg = renderAvatar({ dress: item.id }, [item]);
  assert.match(svg, /url\(#dress-volume\)/);
  assert.doesNotMatch(svg, /data-layer="bottom"/);
});

test("arms, top sleeves and outer sleeves share the same shoulder pose", () => {
  const svg = renderAvatar({ top: "demo-1", outer: "demo-5" }, DEMO_ITEMS);
  for (const part of ["left-arm", "left-sleeve", "left-outer-sleeve"]) {
    assert.match(svg, new RegExp('data-part="' + part + '" transform="rotate\\(-4 145 229\\)"'));
  }
  for (const part of ["right-arm", "right-sleeve", "right-outer-sleeve"]) {
    assert.match(svg, new RegExp('data-part="' + part + '" transform="rotate\\(-1.5 275 229\\)"'));
  }
});
