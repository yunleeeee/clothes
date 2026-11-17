import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeColor, normalizeCategory, normalizeStyle, normalizeSeason,
  applyItem, parseModelAnalysis, pickRandom, suggestOutfit,
  evaluateColorHarmony, hexToHsl, isNeutralColor, DEMO_ITEMS
} from "../src/wardrobe.js";
import { garmentIllustration } from "../src/lookbook.js";
import { renderAvatar } from "../src/avatar.js";

test("category and SVG color values are sanitized", () => {
  assert.equal(normalizeCategory("unknown"), "top");
  assert.equal(normalizeColor("red"), "#a9b6a1");
  assert.equal(normalizeColor("#Ff00aA"), "#ff00aa");
  assert.equal(normalizeStyle("top", "not-an-option"), "tee");
  assert.equal(normalizeSeason("invalid"), "all");
});

test("a dress replaces separate top and bottom", () => {
  const look = applyItem({ top: "t", bottom: "b", shoes: "s" }, { id: "d", category: "dress" });
  assert.deepEqual(look, { shoes: "s", dress: "d" });
});

test("a top removes an existing dress", () => {
  const look = applyItem({ dress: "d", shoes: "s" }, { id: "t", category: "top" });
  assert.deepEqual(look, { shoes: "s", top: "t" });
});

test("DeepSeek analysis is normalized to available styles and season", () => {
  const item = parseModelAnalysis('{"name":"条纹长裤","category":"bottom","color":"#224466","style":"pants","season":"winter"}');
  assert.deepEqual(item, { name: "条纹长裤", category: "bottom", color: "#224466", style: "pants", season: "winter" });
});

test("DeepSeek analysis handles Markdown JSON wrapper", () => {
  const item = parseModelAnalysis('`json\n{"name":"针织","category":"top","style":"sweater","color":"#AABBCC"}\n`');
  assert.equal(item.style, "sweater");
  assert.equal(item.season, "all");
});

test("generated SVG responds to body proportions", () => {
  const first = renderAvatar({ top: "demo-1" }, DEMO_ITEMS, { shoulders: 80 });
  const second = renderAvatar({ top: "demo-1" }, DEMO_ITEMS, { shoulders: 120 });
  assert.match(first, /<svg/);
  assert.match(first, /<path/);
  assert.notEqual(first, second);
});

test("random outfit uses existing wardrobe IDs", () => {
  const result = pickRandom(DEMO_ITEMS, {});
  for (const id of Object.values(result)) assert.ok(DEMO_ITEMS.some(item => item.id === id));
});

test("color harmony evaluates neutral and chromatic outfits", () => {
  const neutralResult = evaluateColorHarmony([
    { id: "1", name: "白T", category: "top", color: "#f2f1ed" },
    { id: "2", name: "黑裤", category: "bottom", color: "#252724" }
  ]);
  assert.ok(neutralResult.score >= 90);
  assert.match(neutralResult.label, /中性极简/);

  const multiColor = evaluateColorHarmony([
    { id: "1", name: "红衣", category: "top", color: "#d93838" },
    { id: "2", name: "绿裤", category: "bottom", color: "#2e8b57" },
    { id: "3", name: "蓝鞋", category: "shoes", color: "#2962ff" }
  ]);
  assert.ok(multiColor.score < 70);
});

test("hexToHsl and isNeutralColor detect neutrals accurately", () => {
  assert.equal(hexToHsl("#ffffff").l, 100);
  assert.equal(isNeutralColor("#ece9e1"), true);
  assert.equal(isNeutralColor("#343f44"), true);
  assert.equal(isNeutralColor("#d93838"), false);
});

test("suggestOutfit preserves locked categories and respects season", () => {
  const lockedLook = { top: "demo-2", bottom: "demo-3" };
  const suggested = suggestOutfit(DEMO_ITEMS, lockedLook, {
    lockedCategories: ["top"],
    season: "summer"
  });
  assert.equal(suggested.top, "demo-2");
  assert.ok(suggested.bottom);
  assert.ok(suggested.shoes);
});

test("garmentIllustration renders flat-lay SVG for every category", () => {
  for (const item of DEMO_ITEMS) {
    const svg = garmentIllustration(item);
    assert.match(svg, /<svg/);
    assert.match(svg, /<path/);
  }
});
