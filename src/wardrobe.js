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
export const SEASONS = [
  { id: "all", label: "四季通用" },
  { id: "summer", label: "春夏轻薄" },
  { id: "spring_autumn", label: "春秋适中" },
  { id: "winter", label: "冬季保暖" }
];
export const DEFAULT_PROFILE = {
  shoulders: 100, waist: 100, hips: 100, legs: 100,
  skin: "#e7b9a2", hair: "#252830", hairStyle: "short"
};
export const SKIN_TONES = ["#f8ddca","#f5cdb6","#dfad91","#b77d60","#91634d"];
export const HAIR_TONES = ["#594c46","#272a31","#a36d54","#d5af7d","#9b7b96"];
export const DEMO_ITEMS = [
  { id:"demo-1", name:"奶油白圆领 T 恤", category:"top", style:"tee", color:"#ece9e1", season:"all", demo:true },
  { id:"demo-2", name:"墨绿色质感衬衫", category:"top", style:"shirt", color:"#526b5f", season:"spring_autumn", demo:true },
  { id:"demo-3", name:"深灰直筒牛仔裤", category:"bottom", style:"pants", color:"#535e66", season:"all", demo:true },
  { id:"demo-4", name:"砂岩色休闲短裤", category:"bottom", style:"shorts", color:"#b5a18a", season:"summer", demo:true },
  { id:"demo-5", name:"炭黑工装外套", category:"outer", style:"jacket", color:"#343f44", season:"spring_autumn", demo:true },
  { id:"demo-6", name:"米白复古运动鞋", category:"shoes", style:"sneakers", color:"#eae7dd", season:"all", demo:true },
  { id:"demo-7", name:"雾灰长款风衣", category:"outer", style:"coat", color:"#707a76", season:"winter", demo:true }
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
export function normalizeSeason(season) {
  return SEASONS.some(s => s.id === season) ? season : "all";
}
export function labelFor(category) {
  return CATEGORIES.find(c=>c.id===category)?.label || "其他";
}
export function seasonLabelFor(season) {
  return SEASONS.find(s=>s.id===season)?.label || "四季通用";
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
export function hexToHsl(hex) {
  const safe = normalizeColor(hex, "#888888");
  const r = parseInt(safe.slice(1, 3), 16) / 255;
  const g = parseInt(safe.slice(3, 5), 16) / 255;
  const b = parseInt(safe.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
}
export function isNeutralColor(hex) {
  const { h, s, l } = hexToHsl(hex);
  if (s <= 18 || l <= 16 || l >= 90) return true;
  // Warm earth / khaki / olive-gray / navy neutrals
  if (s <= 28 && (l <= 30 || l >= 72)) return true;
  if (h >= 25 && h <= 50 && s <= 35 && l >= 45) return true;
  return false;
}
function hueDistance(h1, h2) {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff);
}
export function evaluateColorHarmony(wornItems = []) {
  if (!wornItems.length) {
    return { score: 0, label: "等待搭配", tip: "点击左侧单品或使用「智能搭配」生成一套穿搭", palette: [] };
  }
  const palette = wornItems.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    hex: normalizeColor(item.color),
    hsl: hexToHsl(item.color),
    neutral: isNeutralColor(item.color)
  }));
  const chromatic = palette.filter(p => !p.neutral);
  const neutrals = palette.filter(p => p.neutral);
  const lightRange = Math.max(...palette.map(p => p.hsl.l)) - Math.min(...palette.map(p => p.hsl.l));

  if (palette.length === 1) {
    return {
      score: 78,
      label: "单品预览",
      tip: "再选一件下装或鞋履，或点击「智能搭配」一键补全。",
      palette
    };
  }
  if (chromatic.length === 0) {
    const score = lightRange >= 25 ? 95 : 86;
    return {
      score,
      label: "中性极简 · 高级稳妥",
      tip: lightRange >= 25 ? "黑/白/灰/大地色明暗层次清晰，日常极简耐看。" : "全身偏同明度中性色，加一件浅色内搭或亮色配饰会更透气。",
      palette
    };
  }
  if (chromatic.length === 1) {
    return {
      score: 94,
      label: "一点亮色 · 主次分明",
      tip: `以${neutrals.length ? "中性色" : "基础色"}托底，视觉焦点集中在${chromatic[0].name}，协调不凌乱。`,
      palette
    };
  }
  // 2 or more chromatic items
  const hues = chromatic.map(c => c.hsl.h);
  let maxHueDiff = 0;
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      maxHueDiff = Math.max(maxHueDiff, hueDistance(hues[i], hues[j]));
    }
  }
  if (chromatic.length >= 3 && maxHueDiff > 70) {
    return {
      score: 64,
      label: "色彩偏多 · 建议收敛",
      tip: "身上超过 2 种高存在感彩色，建议将其中一件替换为黑白灰或卡其色。",
      palette
    };
  }
  if (maxHueDiff <= 25) {
    return {
      score: 92,
      label: "同色系渐变 · 质感统一",
      tip: lightRange >= 20 ? "同色系深浅呼应，整体感很强。" : "同色系搭配，可通过鞋履或包袋拉开明暗反差。",
      palette
    };
  }
  if (maxHueDiff <= 65) {
    return {
      score: 88,
      label: "邻近色呼应 · 柔和耐看",
      tip: "色相相邻过渡自然，适合日常通勤与出街。",
      palette
    };
  }
  if (maxHueDiff >= 145) {
    return {
      score: 82,
      label: "冷暖撞色 · 醒目有型",
      tip: "互补对比带来视觉张力，保持鞋履或外套为中性色会更稳。",
      palette
    };
  }
  return {
    score: 76,
    label: "多色混搭 · 略显跳跃",
    tip: "色相跨度中等，建议增加中性色单品来平衡过渡。",
    palette
  };
}
function matchSeason(item, season) {
  if (!season || season === "all") return true;
  const itemSeason = normalizeSeason(item.season);
  return itemSeason === "all" || itemSeason === season;
}
function pairScore(candidate, anchors) {
  if (!anchors.length) return Math.random() * 10;
  const items = [...anchors, candidate];
  const harmony = evaluateColorHarmony(items).score;
  return harmony + Math.random() * 6;
}
export function suggestOutfit(items, current = {}, options = {}) {
  const locked = new Set(options.lockedCategories || []);
  const season = options.season || "all";
  const pool = items.filter(i => matchSeason(i, season));
  const usable = pool.length ? pool : items;
  const result = {};

  // Keep locked items first
  for (const cat of locked) {
    if (current[cat] && items.some(i => i.id === current[cat])) {
      result[cat] = current[cat];
    }
  }
  const currentWorn = () => Object.values(result).map(id => items.find(i => i.id === id)).filter(Boolean);
  const pickBest = (category, excludeCurrent = true) => {
    const candidates = usable.filter(i => i.category === category);
    if (!candidates.length) return;
    const filtered = excludeCurrent && candidates.length > 1
      ? candidates.filter(c => c.id !== current[category])
      : candidates;
    const list = filtered.length ? filtered : candidates;
    const anchors = currentWorn();
    let best = list[0];
    let bestScore = -1;
    for (const c of list) {
      const s = pairScore(c, anchors);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    result[category] = best.id;
  };

  if (result.dress) {
    // Dress is locked, skip top and bottom
  } else if (result.top || result.bottom) {
    if (!result.top) pickBest("top");
    if (!result.bottom) pickBest("bottom");
  } else {
    const dresses = usable.filter(i => i.category === "dress");
    const tops = usable.filter(i => i.category === "top");
    const bottoms = usable.filter(i => i.category === "bottom");
    const useDress = dresses.length > 0 && (!tops.length || !bottoms.length || Math.random() < 0.22);
    if (useDress) {
      pickBest("dress");
    } else {
      pickBest("top");
      pickBest("bottom");
    }
  }

  if (!result.shoes) pickBest("shoes");
  if (!result.outer && (season === "winter" || season === "spring_autumn" || Math.random() < 0.55)) {
    pickBest("outer");
  }
  if (!result.accessory && Math.random() < 0.35) {
    pickBest("accessory");
  }
  return result;
}
export function pickRandom(items, current={}) {
  return suggestOutfit(items, current);
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
    style: normalizeStyle(category,value.style),
    season: normalizeSeason(value.season)
  };
}
