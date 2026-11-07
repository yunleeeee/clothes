import {
  CATEGORIES, STYLES, DEFAULT_PROFILE, DEMO_ITEMS,
  normalizeColor, normalizeCategory, normalizeStyle, labelFor, applyItem
} from "./wardrobe.js";
import { listItems, saveItem, deleteItem, readPreference, savePreference } from "./storage.js";
import { renderAvatar } from "./avatar.js";

const $ = id => document.getElementById(id);
const state = {
  items: [],
  look: readPreference("look", {}),
  profile: { ...DEFAULT_PROFILE, ...readPreference("profile", {}) },
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
  const fill = normalizeColor(item.color, "#aebbaa");
  const line = "#8a8b81";
  const common = `fill="${fill}" stroke="${line}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  const inset = 'fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="1.5"';
  const style = normalizeStyle(item.category, item.style);
  let figure;
  if (item.category === "top") {
    figure = `<path d="M46 29 59 23Q76 32 89 23L102 29 118 52 105 63 97 51 97 132 51 132 51 51 38 63 26 52Z" ${common}/><path d="M59 24Q74 46 89 24" ${inset}/><path d="M51 121H97" ${inset}/>`;
    if (style === "shirt") figure += `<path d="M74 38V130" ${inset}/>`;
    if (style === "sweater") figure += `<path d="M48 37H100M51 116H97" ${inset}/>`;
  } else if (item.category === "bottom") {
    figure = style === "skirt" ?
      `<path d="M51 25H98L116 129Q76 140 33 129Z" ${common}/><path d="M51 36H98M62 49L50 128M88 49L101 128" ${inset}/>` :
      `<path d="M50 24H99L106 132H79L75 71 69 132H43Z" ${common}/><path d="M51 35H99M75 39V66" ${inset}/>`;
  } else if (item.category === "dress") {
    figure = `<path d="M57 25Q75 38 91 25L105 32 120 57 107 67 99 51 95 79 119 137Q75 146 31 137L54 79 51 51 39 67 26 57 42 32Z" ${common}/><path d="M57 27Q74 45 91 27M54 80H95" ${inset}/>`;
  } else if (item.category === "outer") {
    figure = `<path d="M55 22L73 34 92 22 107 29 117 65 105 70 95 54 101 140 76 140 70 54 66 140 43 140 50 54 36 70 24 65 37 29Z" ${common}/><path d="M73 34 63 54 70 67 76 140" ${inset}/>`;
  } else if (item.category === "shoes") {
    figure = `<path d="M28 81Q39 75 45 54L58 62 68 81Q73 90 70 100L18 100Q11 89 28 81Z" ${common}/><path d="M84 81Q95 75 101 54L114 62 124 81Q130 90 127 100L75 100Q68 89 84 81Z" ${common}/><path d="M18 94H70M75 94H127" ${inset}/>`;
  } else {
    figure = `<path d="M74 45Q39 18 29 52Q23 83 74 76Q125 83 119 52Q109 18 74 45Z" ${common}/><circle cx="74" cy="60" r="11" ${common}/>`;
  }
  return `<svg viewBox="0 0 148 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${figure}</svg>`;
}
function renderFilters() {
  const target = $("filters");
  target.replaceChildren();
  const visible = CATEGORIES.filter(cat => cat.id !== "accessory");
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
  $("avatar").innerHTML = renderAvatar(state.look, state.items, state.profile);
  const activeItems = Object.values(state.look).filter(id => state.items.some(item => item.id === id)).length;
  $("current-summary").textContent = activeItems ? activeItems + " 件单品 · 点击左侧切换" : "点击左侧衣服试穿";
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
