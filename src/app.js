import {
  CATEGORIES, STYLES, DEFAULT_PROFILE, DEMO_ITEMS,
  normalizeColor, normalizeCategory, normalizeStyle, labelFor, applyItem
} from "./wardrobe.js";
import { listItems, saveItem, deleteItem, readPreference, savePreference } from "./storage.js";
import { renderAvatar } from "./avatar.js";
import { renderModel } from "./model.js";

const $ = id => document.getElementById(id);
const state = {
  items: [],
  look: readPreference("look", {}),
  profile: { ...DEFAULT_PROFILE, ...readPreference("profile", {}), skin: DEFAULT_PROFILE.skin, hair: DEFAULT_PROFILE.hair, hairStyle: "short" },
  filter: "all",
  file: null
};
let toastTimer;
let imageURL;

function node(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value != null) element.textContent = String(value);
  return element;
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2500);
}
function saveLook() { savePreference("look", state.look); }
function setLook(item) {
  state.look = state.look[item.category] === item.id
    ? Object.fromEntries(Object.entries(state.look).filter(([key]) => key !== item.category))
    : applyItem(state.look, item);
  saveLook();
  render();
}
function garmentIllustration(item) {
  // Miniature clothing drawings echo the garment contours used by the male avatar.
  const fill = normalizeColor(item.color, "#aebbaa");
  const dark = "#" + [1,3,5].map(i =>
    Math.max(0, parseInt(fill.slice(i,i+2),16)-45).toString(16).padStart(2,"0")
  ).join("");
  const light = "#" + [1,3,5].map(i =>
    Math.min(255, parseInt(fill.slice(i,i+2),16)+32).toString(16).padStart(2,"0")
  ).join("");
  const P = (d, color=fill, extra="") =>
    '<path d="' + d + '" fill="' + color + '" stroke="' + dark + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" ' + extra + '/>';
  const seam = (d, opacity=".38") => '<path d="' + d + '" fill="none" stroke="' + light + '" stroke-width="1.4" stroke-linecap="round" opacity="' + opacity + '"/>';
  const style = normalizeStyle(item.category,item.style);
  const art = [];
  art.push('<svg viewBox="0 0 180 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">');
  art.push('<defs><linearGradient id="miniShade" x1="0" x2="1"><stop stop-color="#fff" stop-opacity=".23"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient></defs>');
  if(item.category==="top") {
    const longSleeve=style!=="tee";
    art.push(P(longSleeve ?
      "M48 33L71 27Q90 46 109 27L132 33Q145 44 153 64L142 132L120 127L117 71L121 160Q90 166 59 160L63 71L60 127L38 132L27 64Q35 44 48 33Z" :
      "M48 34L71 27Q90 44 109 27L132 34Q150 43 156 71L134 84L122 67L122 161Q90 168 58 161L58 67L46 84L24 71Q31 43 48 34Z"));
    art.push(seam("M71 29Q90 52 109 29"));
    if(style==="shirt"){
      art.push(seam("M90 47V161"));
      art.push(P("M71 28L90 49L82 61L64 36Z",light));
      art.push(P("M109 28L90 49L99 61L116 36Z",light));
      for(let y=68;y<153;y+=18)art.push('<circle cx="91" cy="'+y+'" r="1.5" fill="'+dark+'"/>');
    }else if(style==="sweater"){
      art.push(seam("M59 149Q90 157 121 149M38 120L60 124M121 124L142 120"));
    }else art.push(seam("M58 156Q90 164 122 156"));
    art.push(seam("M63 78Q67 97 66 124M117 78Q113 97 114 124",".19"));
  }else if(item.category==="bottom"){
    if(style==="skirt"){
      art.push(P("M55 24L125 24L149 164Q90 181 31 164Z"));
      art.push(seam("M55 38H125M68 52L54 163M113 52L128 163"));
    }else if(style==="shorts"){
      art.push(P("M52 24L128 24L138 113Q116 122 100 112L90 76L80 112Q61 122 42 113Z"));
      art.push(seam("M90 42V72M50 102L80 103M100 103L132 102"));
    }else{
      art.push(P("M52 24L128 24L141 160L98 163L91 76L84 163L41 160Z"));
      art.push(seam("M52 37H128M91 42V76M49 150L79 151M104 151L133 150"));
      art.push(seam("M59 64L66 125M123 63L115 124",".18"));
    }
  }else if(item.category==="outer"){
    const hem=style==="coat"?172:155;
    art.push(P("M47 32L74 24L87 49L78 "+hem+"L47 "+hem+"L58 75L49 132L25 130L28 60Z"));
    art.push(P("M133 32L106 24L93 49L102 "+hem+"L133 "+hem+"L122 75L131 132L155 130L152 60Z"));
    art.push(seam("M73 27L66 53L81 66M107 27L114 53L99 66"));
    art.push(seam("M48 117L69 117M111 117L132 117"));
  }else if(item.category==="shoes"){
    art.push(P("M37 93L55 65L71 78L81 106Q99 112 99 132L27 136Q18 119 37 93Z"));
    art.push(P("M109 93L127 65L142 80L153 106Q171 113 171 133L100 137Q92 119 109 93Z"));
    art.push(seam("M27 128L99 125M100 129L171 126M43 99L65 103M116 99L139 103"));
  }else{
    art.push(P("M90 73Q37 25 25 69Q18 115 90 93Q163 115 155 69Q143 25 90 73Z"));
    art.push('<circle cx="90" cy="83" r="12" fill="'+dark+'"/>');
  }
  art.push('</svg>');
  return art.join("");
}
function renderFilters() {
  const target = $("filters");
  target.replaceChildren();
  const visible = CATEGORIES.filter(cat => cat.id === "all" || state.items.some(item => item.category === cat.id));
  for (const cat of visible) {
    const button = node("button", "filter" + (state.filter === cat.id ? " active" : ""), cat.label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(state.filter === cat.id));
    button.onclick = () => { state.filter = cat.id; render(); };
    target.append(button);
  }
}
function renderWardrobe() {
  $("item-count").textContent = String(state.items.length).padStart(2, "0");
  const target = $("wardrobe-grid");
  target.replaceChildren();
  const filtered = state.items.filter(item => state.filter === "all" || state.filter === item.category);
  $("wardrobe-empty").hidden = filtered.length > 0;
  for (const item of filtered) {
    const active = state.look[item.category] === item.id;
    const card = node("div", "garment" + (active ? " active" : ""));
    card.setAttribute("role", "button"); card.tabIndex = 0;
    card.setAttribute("aria-label", "试穿" + item.name);
    card.setAttribute("aria-pressed", String(active));
    const media = node("div", "garment-image");
    if (item.photo) {
      const image = node("img"); image.src = item.photo;
      image.alt = item.name; image.loading = "lazy"; media.append(image);
    } else media.innerHTML = garmentIllustration(item);
    if (active) media.append(node("span", "garment-indicator"));
    card.append(media, node("span", "garment-name", item.name));
    card.append(node("span", "garment-label", labelFor(item.category)));
    const remove = node("button", "garment-delete", "×");
    remove.type = "button"; remove.title = "删除衣服";
    remove.setAttribute("aria-label", "删除" + item.name);
    remove.onclick = async event => {
      event.stopPropagation();
      if (!confirm("从衣柜中删除「" + item.name + "」？")) return;
      try {
        await deleteItem(item.id);
        state.items = state.items.filter(other => other.id !== item.id);
        if (state.look[item.category] === item.id) delete state.look[item.category];
        saveLook(); render(); toast("已移除");
      } catch { toast("删除失败，请再试一次"); }
    };
    card.append(remove);
    card.onclick = () => setLook(item);
    card.onkeydown = event => {
      if (event.target === card && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault(); setLook(item);
      }
    };
    target.append(card);
  }
}
function render() {
  renderFilters();
  renderWardrobe();
  renderModel($("avatar"), state.look, state.items).catch(() => {
    $("avatar").innerHTML = renderAvatar(state.look, state.items, state.profile);
  });
  const activeItems = Object.values(state.look).filter(id => state.items.some(item => item.id === id)).length;
  $("current-summary").textContent = activeItems ? activeItems + " 件已选 · 当前为高精度立绘换色预览" : "点击左侧衣服试穿";
}
function updateStyles(preferred) {
  const select = $("item-style"); select.replaceChildren();
  const category = normalizeCategory($("item-category").value);
  for (const [id, label] of STYLES[category]) {
    const option = node("option", "", label); option.value = id; select.append(option);
  }
  select.value = normalizeStyle(category, preferred);
}
function showUpload() {
  $("upload-form").reset();
  $("item-category").value = "top";
  $("item-color").value = "#d4c6b9";
  updateStyles();
  state.file = null;
  $("analyze-button").disabled = true;
  $("analysis-message").textContent = "照片保存在本浏览器。小人采用简化插画效果。";
  $("upload-preview").replaceChildren(
    node("span", "upload-sign", "＋"),
    node("strong", "", "选择一张衣服照片"),
    node("small", "", "JPG、PNG、WebP · 最大 8 MB")
  );
  $("upload-dialog").showModal();
}
function imageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("无法读取图片")); };
    image.src = url;
  });
}
async function compressPhoto(file) {
  const image = await imageFromFile(file);
  const ratio = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", .8);
}
async function sampleColor(file) {
  const image = await imageFromFile(file);
  const canvas = document.createElement("canvas"); canvas.width = 32; canvas.height = 32;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, 32, 32);
  const bytes = context.getImageData(0, 0, 32, 32).data;
  const sums = [0, 0, 0]; let count = 0;
  for (let y = 6; y < 26; y += 2) for (let x = 6; x < 26; x += 2) {
    const offset = (y * 32 + x) * 4;
    if (bytes[offset + 3] < 128) continue;
    for (let k = 0; k < 3; k++) sums[k] += bytes[offset + k];
    count++;
  }
  if (count) $("item-color").value = "#" + sums.map(v => Math.round(v / count).toString(16).padStart(2, "0")).join("");
}
function selectPhoto(event) {
  const file = event.target.files?.[0]; if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
    toast("请选择小于 8 MB 的 JPG、PNG 或 WebP 图片"); event.target.value = ""; return;
  }
  state.file = file;
  $("analyze-button").disabled = false;
  if (imageURL) URL.revokeObjectURL(imageURL);
  imageURL = URL.createObjectURL(file);
  const image = node("img"); image.src = imageURL; image.alt = "预览";
  $("upload-preview").replaceChildren(image);
  if (!$("item-name").value) $("item-name").value = file.name.replace(/\.[^.]+$/, "").slice(0, 45);
  sampleColor(file).catch(() => {});
}
async function analyzePhoto() {
  if (!state.file) return;
  const photoType = document.querySelector('input[name="photoType"]:checked')?.value || "item";
  if (photoType === "worn" && !confirm("这张上身照可能包含人脸。确认发送到学校 DeepSeek API 进行识别？")) return;
  const button = $("analyze-button"); button.disabled = true; button.textContent = "识别中…";
  try {
    const image = await compressPhoto(state.file);
    const response = await fetch("/api/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, photoType })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "识别失败");
    $("item-name").value = data.name;
    $("item-category").value = normalizeCategory(data.category);
    updateStyles(data.style);
    $("item-color").value = normalizeColor(data.color);
    $("analysis-message").textContent = "识别完成。保存前可以修改名称、分类和颜色。";
    toast("识别完成");
  } catch (error) {
    $("analysis-message").textContent = "AI 暂不可用：" + error.message + "。你仍可以手动添加。";
  } finally { button.disabled = false; button.textContent = "AI 识别 ↗"; }
}
async function saveUpload(event) {
  event.preventDefault();
  if (!state.file) { toast("请选择照片"); return; }
  const submit = event.submitter; if (submit) submit.disabled = true;
  try {
    const category = normalizeCategory($("item-category").value);
    const item = {
      id: crypto.randomUUID(),
      name: $("item-name").value.trim().slice(0, 45) || "我的衣服",
      category,
      style: normalizeStyle(category, $("item-style").value),
      color: normalizeColor($("item-color").value),
      photoType: document.querySelector('input[name="photoType"]:checked')?.value || "item",
      photo: await compressPhoto(state.file),
      createdAt: Date.now()
    };
    await saveItem(item);
    state.items.unshift(item);
    state.look = applyItem(state.look, item);
    saveLook(); $("upload-dialog").close();
    render(); toast("已经加入衣柜");
  } catch { toast("保存失败，请检查浏览器存储空间"); }
  finally { if (submit) submit.disabled = false; }
}
function bindEvents() {
  $("add-garment").onclick = showUpload;
  $("close-dialog").onclick = () => $("upload-dialog").close();
  $("photo").onchange = selectPhoto;
  $("item-category").onchange = () => updateStyles();
  $("analyze-button").onclick = analyzePhoto;
  $("upload-form").onsubmit = saveUpload;
  $("upload-dialog").addEventListener("close", () => {
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = null;
  });
}
async function init() {
  bindEvents();
  try {
    state.items = (await listItems()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    // Update built-in examples for male clothing without touching user-added photos.
    const latestDemos = new Map(DEMO_ITEMS.map(item => [item.id, item]));
    for (let i = 0; i < state.items.length; i++) {
      const previous = state.items[i];
      const latest = previous.demo === true && latestDemos.get(previous.id);
      if (latest && JSON.stringify(previous) !== JSON.stringify(latest)) {
        state.items[i] = latest;
        await saveItem(latest);
      }
    }
    if (!state.items.length && !readPreference("seeded", false)) {
      for (const item of DEMO_ITEMS) await saveItem(item);
      state.items = [...DEMO_ITEMS];
      savePreference("seeded", true);
    }
    if (!Object.values(state.look).some(id => state.items.some(item => item.id === id))) {
      const top = state.items.find(item => item.category === "top");
      const bottom = state.items.find(item => item.category === "bottom");
      const shoes = state.items.find(item => item.category === "shoes");
      state.look = Object.fromEntries([
        top && ["top", top.id], bottom && ["bottom", bottom.id], shoes && ["shoes", shoes.id]
      ].filter(Boolean));
      saveLook();
    }
    render();
  } catch {
    $("wardrobe-empty").hidden = false;
    $("wardrobe-empty").textContent = "衣柜存储不可用，请检查浏览器设置。";
    toast("无法读取本地衣柜");
  }
}
init();
