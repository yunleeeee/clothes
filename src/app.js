import {
  CATEGORIES,STYLES,DEFAULT_PROFILE,SKIN_TONES,HAIR_TONES,DEMO_ITEMS,
  normalizeColor,normalizeCategory,normalizeStyle,labelFor,iconFor,applyItem,pickRandom
} from "./wardrobe.js";
import { listItems,saveItem,deleteItem,readPreference,savePreference } from "./storage.js";
import { renderAvatar } from "./avatar.js";

const $=id=>document.getElementById(id);
const state={
  items:[],look:readPreference("look",{}),
  profile:{...DEFAULT_PROFILE,...readPreference("profile",{})},
  looks:readPreference("looks",[]),filter:"all",search:"",file:null
};
let toastTimer;
let previewURL;
function toast(message){
  const node=$("toast");node.textContent=message;node.classList.add("visible");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove("visible"),2900);
}
function persist(){
  savePreference("look",state.look);
  savePreference("profile",state.profile);
  savePreference("looks",state.looks);
}
function safeText(value){return String(value??"");}
function make(tag,className,text){
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!==undefined)element.textContent=safeText(text);
  return element;
}
function renderFilters(){
  const target=$("filters");target.replaceChildren();
  for(const category of CATEGORIES){
    const button=make("button","filter"+(state.filter===category.id?" active":""),category.label);
    button.type="button";
    button.setAttribute("aria-pressed",String(state.filter===category.id));
    button.addEventListener("click",()=>{state.filter=category.id;render();});
    target.append(button);
  }
}
function renderWardrobe(){
  $("item-count").textContent=state.items.length+" 件";
  const target=$("wardrobe-grid");target.replaceChildren();
  const items=state.items.filter(item=>(state.filter==="all"||item.category===state.filter)&&item.name.toLowerCase().includes(state.search.toLowerCase()));
  $("wardrobe-empty").hidden=items.length>0;
  for(const item of items){
    const card=make("div","item-card"+(state.look[item.category]===item.id?" active":""));
    card.tabIndex=0;card.setAttribute("role","button");
    card.setAttribute("aria-label","换上 "+item.name);
    const image=make("div","item-image");
    if(item.photo){
      const img=make("img");img.src=item.photo;img.alt=item.name;img.loading="lazy";image.append(img);
    }else{
      image.style.backgroundColor=normalizeColor(item.color)+"30";
      image.append(make("span","item-placeholder",iconFor(item.category)));
    }
    card.append(image,make("div","item-name",item.name),make("div","item-meta",labelFor(item.category)+(item.demo?" · 示例":"")));
    if(state.look[item.category]===item.id)card.append(make("span","chosen-pill","✓ 已穿上"));
    const remove=make("button","item-delete","×");remove.type="button";remove.title="删除这件衣服";
    remove.setAttribute("aria-label","删除 "+item.name);
    remove.addEventListener("click",async event=>{
      event.stopPropagation();
      if(!confirm("确定从衣橱删除「"+item.name+"」吗？"))return;
      try{await deleteItem(item.id);state.items=state.items.filter(x=>x.id!==item.id);
        if(state.look[item.category]===item.id)delete state.look[item.category];
        persist();render();toast("已从衣橱移除");
      }catch{toast("删除失败，请重试");}
    });
    card.append(remove);
    const wear=()=>{
      if(state.look[item.category]===item.id){delete state.look[item.category];}
      else state.look=applyItem(state.look,item);
      persist();render();
    };
    card.addEventListener("click",wear);
    card.addEventListener("keydown",event=>{if((event.key==="Enter"||event.key===" ")&&event.target===card){event.preventDefault();wear();}});
    target.append(card);
  }
}
function renderProfile(){
  for(const key of ["shoulders","waist","hips","legs"]){
    $(key).value=state.profile[key];
    $(key+"-value").textContent=state.profile[key]+"%";
  }
  $("hair-style").value=state.profile.hairStyle;
  const configs=[["skin-options",SKIN_TONES,"skin"],["hair-options",HAIR_TONES,"hair"]];
  for(const [targetId,palette,key] of configs){
    const target=$(targetId);target.replaceChildren();
    for(const color of palette){
      const swatch=make("button","swatch"+(state.profile[key]===color?" active":""));
      swatch.type="button";swatch.style.backgroundColor=color;swatch.title=color;
      swatch.setAttribute("aria-label","选择"+(key==="skin"?"肤色":"发色")+color);
      swatch.setAttribute("aria-pressed",String(state.profile[key]===color));
      swatch.addEventListener("click",()=>{state.profile[key]=color;persist();render();});
      target.append(swatch);
    }
  }
}
function renderSlots(){
  const target=$("outfit-slots");target.replaceChildren();
  for(const category of CATEGORIES.filter(x=>x.id!=="all")){
    const item=state.items.find(x=>x.id===state.look[category.id]);
    const slot=make("div","outfit-slot"),icon=make("div","slot-icon",category.icon);
    const details=make("div");details.append(make("strong","",category.label),make("small","",item?.name||"还没有选择"));
    slot.append(icon,details);
    if(item){
      const clear=make("button","","×");clear.title="移除 "+item.name;
      clear.setAttribute("aria-label","移除 "+item.name);
      clear.addEventListener("click",()=>{delete state.look[category.id];persist();render();});
      slot.append(clear);
    }
    target.append(slot);
  }
}
function renderSaved(){
  const target=$("saved-looks");target.replaceChildren();
  $("look-count").textContent=state.looks.length+" 套收藏";
  if(!state.looks.length){target.append(make("div","saved-empty","还没有收藏的搭配，试着保存第一套吧 ♡"));return;}
  for(const item of state.looks.slice().reverse()){
    const button=make("button","saved-chip","♡ "+item.name);
    button.title="点击穿上这套搭配";
    button.addEventListener("click",()=>{
      const validIds=new Set(state.items.map(x=>x.id));
      state.look=Object.fromEntries(Object.entries(item.look).filter(([,id])=>validIds.has(id)));
      persist();render();toast("已换上「"+item.name+"」");
    });
    const remove=make("span","","×");remove.title="删除收藏";
    remove.addEventListener("click",event=>{
      event.stopPropagation();state.looks=state.looks.filter(x=>x.id!==item.id);persist();render();
    });
    button.append(remove);target.append(button);
  }
}
function render(){
  renderFilters();renderWardrobe();renderProfile();renderSlots();renderSaved();
  $("avatar").innerHTML=renderAvatar(state.look,state.items,state.profile);
  const count=Object.values(state.look).filter(id=>state.items.some(x=>x.id===id)).length;
  $("current-summary").textContent=count?count+" 件单品已搭配":"等待你的灵感";
}
function openDialog(){
  $("upload-form").reset();$("item-category").value="top";updateStyles();
  state.file=null;$("analyze-button").disabled=true;
  $("upload-preview").replaceChildren(make("span","upload-emoji","▧"),make("strong","","点击选择衣服照片"),make("small","","单品照或上身照均可 · JPG / PNG / WebP · 最大 8 MB"));
  $("analysis-message").textContent="上传后可以选择 AI 识别；未经点击不会发送照片。";
  $("upload-dialog").showModal();
}
function updateStyles(preferred){
  const category=$("item-category").value,select=$("item-style");
  select.replaceChildren();
  for(const [id,label] of STYLES[category]){
    const option=make("option","",label);option.value=id;select.append(option);
  }
  select.value=normalizeStyle(category,preferred);
}
function fileToImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const image=new Image();
    image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("图片无法读取"));};
    image.src=url;
  });
}
async function resizedDataURL(file){
  const image=await fileToImage(file),max=900,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext("2d");ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/webp",0.8);
}
async function suggestColor(file){
  const image=await fileToImage(file);
  const canvas=document.createElement("canvas");canvas.width=36;canvas.height=36;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(image,0,0,36,36);
  const data=ctx.getImageData(0,0,36,36).data,buckets=[];
  for(let y=6;y<30;y+=3)for(let x=7;x<29;x+=3){
    const offset=(y*36+x)*4;
    if(data[offset+3]<160)continue;
    buckets.push([data[offset],data[offset+1],data[offset+2]]);
  }
  if(!buckets.length)return;
  const channel=n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0");
  const rgb=[0,1,2].map(i=>buckets.reduce((sum,pixel)=>sum+pixel[i],0)/buckets.length);
  $("item-color").value="#"+rgb.map(channel).join("");
}
function handlePhoto(event){
  const file=event.target.files?.[0];if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>8*1024*1024){
    toast("请选择小于 8 MB 的 JPG、PNG 或 WebP 图片");event.target.value="";return;
  }
  state.file=file;$("analyze-button").disabled=false;
  if(previewURL)URL.revokeObjectURL(previewURL);
  previewURL=URL.createObjectURL(file);
  const image=make("img");image.src=previewURL;image.alt="衣物照片预览";
  $("upload-preview").replaceChildren(image);
  if(!$("item-name").value)$("item-name").value=file.name.replace(/\.[^.]+$/,"").slice(0,45);
  suggestColor(file).catch(()=>{});
}
async function analyze(){
  if(!state.file)return;
  const photoType=document.querySelector('input[name="photoType"]:checked')?.value;
  if(photoType==="worn"&&!confirm("上身照可能含有人脸。AI 识别会把该图片发送到你配置的学校模型 API，是否继续？"))return;
  const button=$("analyze-button");button.disabled=true;button.textContent="识别中...";
  try{
    const image=await resizedDataURL(state.file);
    const response=await fetch("/api/analyze",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({image,photoType})
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"识别失败");
    $("item-name").value=result.name;
    $("item-category").value=normalizeCategory(result.category);updateStyles(result.style);
    $("item-color").value=normalizeColor(result.color);
    $("analysis-message").textContent="AI 建议已填入，可随时手动调整。照片未保存到服务端。";
    toast("AI 识别完成");
  }catch(error){$("analysis-message").textContent="AI 识别不可用："+error.message+"。仍可手动录入。";}
  finally{button.disabled=false;button.textContent="✧ AI 识别";}
}
async function submitUpload(event){
  event.preventDefault();
  if(!state.file){toast("请先选择一张照片");return;}
  const button=event.submitter;
  if(button)button.disabled=true;
  try{
    const image=await resizedDataURL(state.file);
    const category=normalizeCategory($("item-category").value);
    const item={
      id:crypto.randomUUID(),name:$("item-name").value.trim().slice(0,45)||"我的衣服",
      category,style:normalizeStyle(category,$("item-style").value),
      color:normalizeColor($("item-color").value),
      photoType:document.querySelector('input[name="photoType"]:checked')?.value||"item",
      photo:image,createdAt:Date.now()
    };
    await saveItem(item);
    state.items.unshift(item);state.look=applyItem(state.look,item);persist();
    $("upload-dialog").close();render();toast("新衣服已经加入衣橱 ♡");
  }catch(error){toast("保存失败，可能是浏览器存储空间不足");}
  finally{if(button)button.disabled=false;}
}
function bindEvents(){
  $("header-add").addEventListener("click",openDialog);
  $("close-dialog").addEventListener("click",()=>$("upload-dialog").close());
  $("photo").addEventListener("change",handlePhoto);
  $("item-category").addEventListener("change",()=>updateStyles());
  $("analyze-button").addEventListener("click",analyze);
  $("upload-form").addEventListener("submit",submitUpload);
  $("search").addEventListener("input",event=>{state.search=event.target.value.trim();renderWardrobe();});
  for(const key of ["shoulders","waist","hips","legs"]){
    $(key).addEventListener("input",event=>{
      state.profile[key]=Number(event.target.value);
      $(key+"-value").textContent=state.profile[key]+"%";
      $("avatar").innerHTML=renderAvatar(state.look,state.items,state.profile);
      persist();
    });
  }
  $("hair-style").addEventListener("change",event=>{state.profile.hairStyle=event.target.value;persist();render();});
  $("shuffle").addEventListener("click",()=>{state.look=pickRandom(state.items,state.look);persist();render();toast("今日穿搭已更新 ✿");});
  $("reset-look").addEventListener("click",()=>{state.look={};persist();render();});
  $("save-look").addEventListener("click",()=>{
    if(!Object.keys(state.look).length){toast("请先选几件衣服");return;}
    const name=prompt("给这套穿搭取个名字：","今日心情穿搭");
    if(!name?.trim())return;
    state.looks.push({id:crypto.randomUUID(),name:name.trim().slice(0,35),look:{...state.look},createdAt:Date.now()});
    state.looks=state.looks.slice(-50);
    persist();render();toast("穿搭已保存 ♡");
  });
  $("upload-dialog").addEventListener("close",()=>{if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}});
}
async function init(){
  $("today").textContent=new Date().toLocaleDateString("zh-CN",{month:"long",day:"numeric"});
  bindEvents();
  try{
    state.items=(await listItems()).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if(!state.items.length&&!readPreference("seeded",false)){
      for(const item of DEMO_ITEMS)await saveItem(item);
      state.items=DEMO_ITEMS.slice();
      state.look={top:"demo-1",bottom:"demo-3",shoes:"demo-6"};
      savePreference("seeded",true);persist();
    }
    render();
  }catch(error){
    $("wardrobe-empty").hidden=false;
    $("wardrobe-empty").textContent="无法打开浏览器衣橱数据库，请检查浏览器隐私设置。";
    toast("本地数据库初始化失败");
  }
}
init();
