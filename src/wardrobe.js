export const CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "top", label: "上衣", icon: "👚" },
  { id: "bottom", label: "下装", icon: "👖" },
  { id: "dress", label: "裙装", icon: "👗" },
  { id: "outer", label: "外套", icon: "🧥" },
  { id: "shoes", label: "鞋子", icon: "👟" },
  { id: "accessory", label: "配饰", icon: "🎀" }
];
export const STYLES = {
  top: [["tee","简约 T 恤"],["shirt","衬衫"],["sweater","针织衫"]],
  bottom: [["pants","长裤"],["skirt","半裙"],["shorts","短裤"]],
  dress: [["dress","连衣裙"],["longdress","长裙"]],
  outer: [["jacket","短外套"],["coat","长外套"]],
  shoes: [["sneakers","运动鞋"],["boots","靴子"]],
  accessory: [["scarf","围巾"],["bow","蝴蝶结"]]
};
export const DEFAULT_PROFILE = {
  shoulders: 100, waist: 100, hips: 100, legs: 100,
  skin: "#f5cdb6", hair: "#594c46", hairStyle: "long"
};
export const SKIN_TONES = ["#f8ddca","#f5cdb6","#dfad91","#b77d60","#91634d"];
export const HAIR_TONES = ["#594c46","#272a31","#a36d54","#d5af7d","#9b7b96"];
export const DEMO_ITEMS = [
  { id:"demo-1",name:"奶油色基础 T 恤",category:"top",style:"tee",color:"#f2e5d1",demo:true },
  { id:"demo-2",name:"鼠尾草针织衫",category:"top",style:"sweater",color:"#9eaf98",demo:true },
  { id:"demo-3",name:"复古牛仔长裤",category:"bottom",style:"pants",color:"#7190af",demo:true },
  { id:"demo-4",name:"樱花粉百褶裙",category:"bottom",style:"skirt",color:"#dca1aa",demo:true },
  { id:"demo-5",name:"雾蓝色外套",category:"outer",style:"jacket",color:"#8fa9bd",demo:true },
  { id:"demo-6",name:"米白色运动鞋",category:"shoes",style:"sneakers",color:"#eee7dc",demo:true }
];
export function normalizeColor(value, fallback="#a9b6a1") {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback;
}
export function normalizeCategory(value) {
  return STYLES[value] ? value : "top";
}
export function normalizeStyle(category, style) {
  const options=STYLES[normalizeCategory(category)];
  return options.some(([id])=>id===style) ? style : options[0][0];
}
export function labelFor(category) {
  return CATEGORIES.find(c=>c.id===category)?.label || "其他";
}
export function iconFor(category) {
  return CATEGORIES.find(c=>c.id===category)?.icon || "🧺";
}
export function applyItem(current, item) {
  const next={...current};
  if(item.category==="dress"){delete next.top;delete next.bottom;}
  if(item.category==="top"||item.category==="bottom"){delete next.dress;}
  next[item.category]=item.id;
  return next;
}
export function pickRandom(items, current={}) {
  let result={...current};
  const available=items.filter(i=>i.category!=="accessory");
  const tops=available.filter(i=>i.category==="top");
  const bottoms=available.filter(i=>i.category==="bottom");
  const dresses=available.filter(i=>i.category==="dress");
  const useDress=dresses.length>0&&(!tops.length||!bottoms.length||Math.random()<0.25);
  if(useDress){result=applyItem(result,dresses[Math.floor(Math.random()*dresses.length)]);}
  else for (const choices of [tops,bottoms]) if(choices.length) result=applyItem(result,choices[Math.floor(Math.random()*choices.length)]);
  for(const category of ["outer","shoes","accessory"]){
    const choices=available.filter(i=>i.category===category);
    if(choices.length) result=applyItem(result,choices[Math.floor(Math.random()*choices.length)]);
  }
  return result;
}
export function parseModelAnalysis(text) {
  if(typeof text!=="string") throw new Error("模型返回内容为空");
  const cleaned=text.trim().replace(/^`json\s*/i,"").replace(/`$/,"").trim();
  let value;
  try { value=JSON.parse(cleaned); }
  catch {
    const start=cleaned.indexOf("{"),end=cleaned.lastIndexOf("}");
    if(start<0||end<start) throw new Error("模型返回的 JSON 无法解析");
    value=JSON.parse(cleaned.slice(start,end+1));
  }
  const category=normalizeCategory(value.category);
  return {
    name: String(value.name || "未命名衣服").slice(0,45),
    category,
    color: normalizeColor(value.color),
    style: normalizeStyle(category,value.style)
  };
}
