import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderAvatar } from "../src/avatar.js";
import { DEMO_ITEMS } from "../src/wardrobe.js";

test("minimal interface exposes exactly the three main actions", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const id of ["avatar", "wardrobe-grid", "add-garment", "upload-dialog"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  for (const removed of ["save-look", "shuffle", "shoulders", "waist", "hair-options", "saved-looks"]) {
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
