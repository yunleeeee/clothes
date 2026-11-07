import test from "node:test";
import assert from "node:assert/strict";
import {normalizeColor,normalizeCategory,normalizeStyle,applyItem,parseModelAnalysis,pickRandom,DEMO_ITEMS} from "../src/wardrobe.js";
import {renderAvatar} from "../src/avatar.js";

test("category and SVG color values are sanitized",()=>{
  assert.equal(normalizeCategory("unknown"),"top");
  assert.equal(normalizeColor("red"),"#a9b6a1");
  assert.equal(normalizeColor("#Ff00aA"),"#ff00aa");
  assert.equal(normalizeStyle("top","not-an-option"),"tee");
});
test("a dress replaces separate top and bottom",()=>{
  const look=applyItem({top:"t",bottom:"b",shoes:"s"},{id:"d",category:"dress"});
  assert.deepEqual(look,{shoes:"s",dress:"d"});
});
test("a top removes an existing dress",()=>{
  const look=applyItem({dress:"d",shoes:"s"},{id:"t",category:"top"});
  assert.deepEqual(look,{shoes:"s",top:"t"});
});
test("DeepSeek analysis is normalized to available styles",()=>{
  const item=parseModelAnalysis('{"name":"条纹长裤","category":"bottom","color":"#224466","style":"pants"}');
  assert.deepEqual(item,{name:"条纹长裤",category:"bottom",color:"#224466",style:"pants"});
});
test("DeepSeek analysis handles Markdown JSON wrapper",()=>{
  const item=parseModelAnalysis('`json\n{"name":"针织","category":"top","style":"sweater","color":"#AABBCC"}\n`');
  assert.equal(item.style,"sweater");
});
test("generated SVG responds to body proportions",()=>{
  const first=renderAvatar({top:"demo-1"},DEMO_ITEMS,{shoulders:80});
  const second=renderAvatar({top:"demo-1"},DEMO_ITEMS,{shoulders:120});
  assert.match(first,/<svg/);assert.match(first,/<path/);
  assert.notEqual(first,second);
});
test("random outfit uses existing wardrobe IDs",()=>{
  const result=pickRandom(DEMO_ITEMS,{});
  for(const id of Object.values(result))assert.ok(DEMO_ITEMS.some(item=>item.id===id));
});
