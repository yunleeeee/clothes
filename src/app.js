import {
  CATEGORIES, STYLES, DEMO_ITEMS, DEFAULT_PROFILE,
  normalizeColor, normalizeCategory, normalizeStyle, normalizeSeason, labelFor, applyItem,
  evaluateColorHarmony, suggestOutfit
} from "./wardrobe.js";
import { listItems, saveItem, deleteItem, readPreference, savePreference } from "./storage.js";
import { renderAvatar } from "./avatar.js";
import { renderModel } from "./model.js";
import { garmentIllustration, renderLookbook } from "./lookbook.js";

const $ = id => document.getElementById(id);
const state = {
  items: [],
  look: readPreference("look", {}),
  savedLooks: readPreference("savedLooks", []),
  locked: new Set(),
  showGuides: readPreference("showGuides", true),
  season: readPreference("season", "all"),
  filter: "all",
  file: null,
  processedPhoto: null,
  processedCutout: false,
  viewMode: "lookbook",
  profile: { ...DEFAULT_PROFILE, ...readPreference("bodyProfile", {}) },
  autoRotate: false
};
let toastTimer;
let imageURL;
let assetViewer;
let assetViewerPromise;
let assetLoadId = 0;

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
  if (state.look[item.category] === item.id) {
    delete state.look[item.category];
    state.locked.delete(item.category);
  } else {
    state.look = applyItem(state.look, item);
  }
  saveLook();
  render();
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
      const image = node("img");
      image.src = item.photo;
      image.alt = item.name;
      image.loading = "lazy";
      if (item.cutout) image.className = "cutout-thumb";
      media.append(image);
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
        if (state.look[item.category] === item.id) {
          delete state.look[item.category];
          state.locked.delete(item.category);
        }
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
function renderHarmonyBar(wornItems) {
  const bar = $("harmony-bar");
  const result = evaluateColorHarmony(wornItems);
  bar.replaceChildren();

  const left = node("div", "harmony-left");
  const swatches = node("div", "harmony-swatches");
  if (result.palette.length) {
    for (const p of result.palette) {
      const dot = node("span", "harmony-swatch");
      dot.style.backgroundColor = p.hex;
      dot.title = p.name + " (" + p.hex + ")";
      swatches.append(dot);
    }
  } else {
    swatches.append(node("span", "harmony-empty-dot"));
  }
  const badge = node("span", "harmony-label", result.score ? result.score + "分 · " + result.label : result.label);
  left.append(swatches, badge);

  const tip = node("span", "harmony-tip", result.tip);
  bar.append(left, tip);
}
function renderSavedLooks() {
  const container = $("saved-looks");
  container.replaceChildren();
  if (!state.savedLooks.length) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.append(node("span", "saved-label", "常用穿搭"));
  const list = node("div", "saved-list");
  for (const saved of state.savedLooks) {
    const chip = node("div", "saved-chip");
    const applyBtn = node("button", "saved-apply", saved.name);
    applyBtn.type = "button";
    applyBtn.onclick = () => {
      const validLook = {};
      for (const [cat, id] of Object.entries(saved.look || {})) {
        if (state.items.some(i => i.id === id)) validLook[cat] = id;
      }
      state.look = validLook;
      state.locked.clear();
      saveLook();
      render();
      toast("已切换至「" + saved.name + "」");
    };
    const delBtn = node("button", "saved-del", "×");
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", "删除收藏" + saved.name);
    delBtn.onclick = () => {
      state.savedLooks = state.savedLooks.filter(s => s.id !== saved.id);
      savePreference("savedLooks", state.savedLooks);
      renderSavedLooks();
    };
    chip.append(applyBtn, delBtn);
    list.append(chip);
  }
  container.append(list);
}
function updateViewerControls(wornItems) {
  $("toggle-guides").setAttribute("aria-pressed", String(state.showGuides));
  $("season-filter").value = state.season;
  $("save-look").disabled = wornItems.length === 0;
  $("clear-look").disabled = wornItems.length === 0;
  $("smart-style").disabled = state.items.length === 0;
}
function syncAssetControls() {
  const active = state.viewMode === "3d";
  $("asset-controls").hidden = !active;
  $("open-3d").textContent = active ? "返回平铺" : "3D 试穿";
  $("open-3d").setAttribute("aria-pressed", String(active));
  $("toggle-guides").hidden = active;
  $("rotate-3d").setAttribute("aria-pressed", String(state.autoRotate));
  for (const input of document.querySelectorAll("[data-profile]")) {
    const key = input.dataset.profile;
    input.value = state.profile[key] ?? DEFAULT_PROFILE[key];
    $(input.id + "-value").textContent = input.value;
  }
}
function showAssetResult(result) {
  if (!result) return;
  $("viewer-mode").textContent = result.mode === "fallback" ? "3D / FALLBACK" : "VRM / 3D";
  $("asset-status").textContent = result.message;
}
async function ensureAssetViewer() {
  if (assetViewer) return assetViewer;
  if (assetViewerPromise) return assetViewerPromise;
  const request = ++assetLoadId;
  $("asset-status").textContent = "正在加载本地骨骼人物、面部表情与体型 Morph…";
  assetViewerPromise = (async () => {
    try {
      const { mountAssetAvatar } = await import("./assetAvatar.js");
      const viewer = await mountAssetAvatar($("avatar"), {
        look: state.look,
        items: state.items,
        profile: state.profile
      });
      if (state.viewMode !== "3d" || request !== assetLoadId) {
        viewer.dispose();
        return null;
      }
      assetViewer = viewer;
      viewer.setAutoRotate(state.autoRotate);
      renderAvatarStage();
      return viewer;
    } catch (error) {
      if (state.viewMode === "3d" && request === assetLoadId) {
        state.viewMode = "illustration";
        toast("3D 模型加载失败，已返回立绘模式");
        console.error(error);
        render();
      }
      return null;
    } finally {
      assetViewerPromise = null;
      if (state.viewMode === "3d" && !assetViewer) queueMicrotask(renderAvatarStage);
    }
  })();
  return assetViewerPromise;
}
function leaveAssetViewer() {
  assetLoadId++;
  if (assetViewer) assetViewer.dispose();
  assetViewer = null;
  state.autoRotate = false;
}
function renderAvatarStage() {
  const element = $("avatar");
  if (state.viewMode === "3d") {
    if (assetViewer) {
      showAssetResult(assetViewer.update(state.look, state.items, state.profile));
    } else {
      element.dataset.engine = "loading";
      $("viewer-mode").textContent = "VRM / LOADING";
      if (!assetViewerPromise) {
        element.replaceChildren(node("div", "asset-loading", "正在加载本地 VRM 人物…"));
        ensureAssetViewer();
      }
    }
    return;
  }
  if (state.viewMode === "illustration") {
    element.dataset.engine = "illustration";
    $("viewer-mode").textContent = "ILLUSTRATION";
    element.replaceChildren();
    renderModel(element, state.look, state.items).catch(() => {
      element.innerHTML = renderAvatar(state.look, state.items, state.profile);
    });
    return;
  }
  $("viewer-mode").textContent = "LOOKBOOK";
  renderLookbook(element, state.look, state.items, {
    showGuides: state.showGuides,
    lockedCategories: state.locked,
    onToggleLock: cat => {
      if (state.locked.has(cat)) state.locked.delete(cat);
      else state.locked.add(cat);
      renderAvatarStage();
    },
    onRemove: cat => {
      delete state.look[cat];
      state.locked.delete(cat);
      saveLook();
      render();
    }
  });
}
function render() {
  renderFilters();
  renderWardrobe();
  renderAvatarStage();
  const wornItems = Object.entries(state.look)
    .map(([, id]) => state.items.find(item => item.id === id))
    .filter(Boolean);
  $("current-summary").textContent = wornItems.length
    ? String(wornItems.length).padStart(2, "0") + " PIECES"
    : "00 PIECES";
  renderHarmonyBar(wornItems);
  renderSavedLooks();
  updateViewerControls(wornItems);
  syncAssetControls();
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
  $("item-season").value = "all";
  $("auto-cutout").checked = true;
  updateStyles();
  state.file = null;
  state.processedPhoto = null;
  state.processedCutout = false;
  $("analyze-button").disabled = true;
  $("analysis-message").textContent = "照片仅保存在本浏览器。单品照会自动去除纯色背景，直接用于平铺穿搭拼贴。";
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
function removeSolidBackground(canvas) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Sample 4 corners to check if the photo has a uniform solid/light background
  const corners = [
    0,
    (w - 1) * 4,
    ((h - 1) * w) * 4,
    ((h - 1) * w + w - 1) * 4
  ];
  let sumR = 0, sumG = 0, sumB = 0, opaqueCount = 0;
  for (const idx of corners) {
    if (data[idx + 3] < 200) return false; // Already transparent
    sumR += data[idx]; sumG += data[idx + 1]; sumB += data[idx + 2];
    opaqueCount++;
  }
  if (!opaqueCount) return false;
  const bgR = sumR / opaqueCount, bgG = sumG / opaqueCount, bgB = sumB / opaqueCount;

  // Verify corners are reasonably uniform
  for (const idx of corners) {
    const dist = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
    if (dist > 95) return false;
  }

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const push = (x, y) => {
    const pos = y * w + x;
    if (!visited[pos]) { visited[pos] = 1; queue[tail++] = pos; }
  };

  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { push(0, y); push(w - 1, y); }

  const hardThresh = 58;
  const softThresh = 95;
  let removed = 0;

  while (head < tail) {
    const pos = queue[head++];
    const idx = pos * 4;
    const dist = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
    if (dist <= softThresh) {
      if (dist <= hardThresh) {
        data[idx + 3] = 0;
      } else {
        const factor = (dist - hardThresh) / (softThresh - hardThresh);
        data[idx + 3] = Math.round(data[idx + 3] * factor);
      }
      removed++;
      const x = pos % w, y = (pos - x) / w;
      if (x > 0) push(x - 1, y);
      if (x < w - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < h - 1) push(x, y + 1);
    }
  }

  // Only commit if we removed a meaningful border (>5%) without wiping the whole image (<95%)
  const ratio = removed / (w * h);
  if (ratio < 0.05 || ratio > 0.95) return false;
  ctx.putImageData(imgData, 0, 0);
  return true;
}
async function processPhoto(file, doCutout) {
  const image = await imageFromFile(file);
  const ratio = Math.min(1, 760 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  let cutoutApplied = false;
  if (doCutout) {
    cutoutApplied = removeSolidBackground(canvas);
  }
  const dataUrl = canvas.toDataURL("image/webp", 0.85);

  // Sample dominant color from non-transparent center pixels
  const bytes = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const sums = [0, 0, 0];
  let count = 0;
  const stepX = Math.max(1, Math.floor(canvas.width / 24));
  const stepY = Math.max(1, Math.floor(canvas.height / 24));
  for (let y = Math.floor(canvas.height * 0.15); y < canvas.height * 0.85; y += stepY) {
    for (let x = Math.floor(canvas.width * 0.15); x < canvas.width * 0.85; x += stepX) {
      const offset = (y * canvas.width + x) * 4;
      if (bytes[offset + 3] < 160) continue;
      sums[0] += bytes[offset];
      sums[1] += bytes[offset + 1];
      sums[2] += bytes[offset + 2];
      count++;
    }
  }
  const color = count
    ? "#" + sums.map(v => Math.round(v / count).toString(16).padStart(2, "0")).join("")
    : null;

  return { dataUrl, cutout: cutoutApplied, color };
}
async function refreshUploadPreview() {
  if (!state.file) return;
  const doCutout = $("auto-cutout").checked;
  try {
    const { dataUrl, cutout, color } = await processPhoto(state.file, doCutout);
    state.processedPhoto = dataUrl;
    state.processedCutout = cutout;
    const image = node("img");
    image.src = dataUrl;
    image.alt = "预览";
    if (cutout) image.className = "cutout-preview";
    $("upload-preview").replaceChildren(image);
    if (color) $("item-color").value = color;
    if (doCutout && cutout) {
      $("analysis-message").textContent = "已自动去除纯色背景，平铺画布将呈现干净的抠图效果。";
    } else if (doCutout && !cutout) {
      $("analysis-message").textContent = "背景较复杂，已保留原图（仍可正常平铺展示）。";
    } else {
      $("analysis-message").textContent = "已保留原图。照片仅保存在本浏览器。";
    }
  } catch {
    toast("无法处理该图片");
  }
}
async function selectPhoto(event) {
  const file = event.target.files?.[0]; if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
    toast("请选择小于 8 MB 的 JPG、PNG 或 WebP 图片"); event.target.value = ""; return;
  }
  state.file = file;
  $("analyze-button").disabled = false;
  if (!$("item-name").value) $("item-name").value = file.name.replace(/\.[^.]+$/, "").slice(0, 45);
  await refreshUploadPreview();
}
async function analyzePhoto() {
  if (!state.file) return;
  const photoType = document.querySelector('input[name="photoType"]:checked')?.value || "item";
  if (photoType === "worn" && !confirm("这张上身照可能包含人脸。确认发送到学校 DeepSeek API 进行识别？")) return;
  const button = $("analyze-button"); button.disabled = true; button.textContent = "识别中…";
  try {
    const image = state.processedPhoto || (await processPhoto(state.file, false)).dataUrl;
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
    if (data.season) $("item-season").value = normalizeSeason(data.season);
    $("analysis-message").textContent = "识别完成。保存前可以修改名称、分类、季节和颜色。";
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
    const result = state.processedPhoto
      ? { dataUrl: state.processedPhoto, cutout: state.processedCutout }
      : await processPhoto(state.file, $("auto-cutout").checked);
    const item = {
      id: crypto.randomUUID(),
      name: $("item-name").value.trim().slice(0, 45) || "我的衣服",
      category,
      style: normalizeStyle(category, $("item-style").value),
      color: normalizeColor($("item-color").value),
      season: normalizeSeason($("item-season").value),
      photoType: document.querySelector('input[name="photoType"]:checked')?.value || "item",
      photo: result.dataUrl,
      cutout: result.cutout,
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
  $("open-3d").onclick = () => {
    if (state.viewMode === "3d") {
      state.viewMode = "lookbook";
      leaveAssetViewer();
    } else {
      state.viewMode = "3d";
    }
    renderAvatarStage();
    syncAssetControls();
  };
  $("rotate-3d").onclick = () => {
    state.autoRotate = !state.autoRotate;
    assetViewer?.setAutoRotate(state.autoRotate);
    syncAssetControls();
  };
  $("reset-3d").onclick = () => {
    state.autoRotate = false;
    assetViewer?.reset();
    syncAssetControls();
  };
  for (const input of document.querySelectorAll("[data-profile]")) {
    input.oninput = () => {
      const key = input.dataset.profile;
      state.profile = { ...state.profile, [key]: Number(input.value) };
      $(input.id + "-value").textContent = input.value;
      savePreference("bodyProfile", state.profile);
      if (assetViewer) renderAvatarStage();
    };
  }
  $("smart-style").onclick = () => {
    if (!state.items.length) return;
    state.look = suggestOutfit(state.items, state.look, {
      lockedCategories: state.locked,
      season: state.season
    });
    saveLook();
    render();
    toast("已为你生成协调穿搭");
  };
  $("toggle-guides").onclick = () => {
    state.showGuides = !state.showGuides;
    savePreference("showGuides", state.showGuides);
    renderAvatarStage();
    updateViewerControls(Object.values(state.look).map(id => state.items.find(i => i.id === id)).filter(Boolean));
  };
  $("season-filter").onchange = event => {
    state.season = event.target.value;
    savePreference("season", state.season);
  };
  $("clear-look").onclick = () => {
    state.look = {};
    state.locked.clear();
    saveLook();
    render();
  };
  $("save-look").onclick = () => {
    const worn = Object.entries(state.look)
      .map(([cat, id]) => [cat, state.items.find(i => i.id === id)])
      .filter(([, item]) => Boolean(item));
    if (!worn.length) return;
    const defaultName = worn.slice(0, 2).map(([, item]) => item.name).join(" + ");
    const name = prompt("为这套穿搭起个名字：", defaultName);
    if (!name || !name.trim()) return;
    const entry = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 28),
      look: { ...state.look },
      createdAt: Date.now()
    };
    state.savedLooks = [entry, ...state.savedLooks].slice(0, 12);
    savePreference("savedLooks", state.savedLooks);
    renderSavedLooks();
    toast("已收藏穿搭");
  };
  $("add-garment").onclick = showUpload;
  $("close-dialog").onclick = () => $("upload-dialog").close();
  $("photo").onchange = selectPhoto;
  $("auto-cutout").onchange = refreshUploadPreview;
  document.querySelectorAll('input[name="photoType"]').forEach(radio => {
    radio.onchange = () => {
      $("auto-cutout").checked = radio.value === "item";
      refreshUploadPreview();
    };
  });
  $("item-category").onchange = () => updateStyles();
  $("analyze-button").onclick = analyzePhoto;
  $("upload-form").onsubmit = saveUpload;
  $("upload-dialog").addEventListener("close", () => {
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = null;
    state.file = null;
    state.processedPhoto = null;
  });
}
async function init() {
  bindEvents();
  try {
    state.items = (await listItems()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
