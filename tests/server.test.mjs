import test from "node:test";
import assert from "node:assert/strict";
import {createAppServer,analyzeGarment} from "../server/index.mjs";

test("health endpoint and local static frontend",async()=>{
  const server=createAppServer();
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  try{
    const base="http://127.0.0.1:"+server.address().port;
    const health=await fetch(base+"/api/health");
    assert.equal(health.status,200);
    assert.equal((await health.json()).status,"ok");
    const html=await fetch(base+"/");
    assert.equal(html.status,200);
    assert.match(await html.text(),/MORI/);
    const hidden=await fetch(base+"/server/index.mjs");
    assert.equal(hidden.status,403);
    const js=await fetch(base+"/src/app.js");
    assert.equal(js.status,200);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
test("vision API is explicitly optional",async()=>{
  await assert.rejects(()=>analyzeGarment({image:"invalid"},{DEEPSEEK_BASE_URL:"",DEEPSEEK_API_KEY:"",DEEPSEEK_MODEL:""}),/尚未配置/);
});
