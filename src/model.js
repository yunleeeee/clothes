// High-quality original male anime illustration, with non-destructive color previews.
// A selected top/bottom/shoe changes pigment within calibrated garment regions.
// This is a color preview, not an AI virtual try-on or garment-shape replacement.
const source = "/assets/mori-anime-boy.jpg";
let cachedImage;
function image() {
  if (!cachedImage) {
    cachedImage = new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("角色素材加载失败"));
      element.src = source;
    });
  }
  return cachedImage;
}
function hexToRGB(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) return [220, 220, 210];
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
}
const polygonMasks = {
  top: [
    [53,79],[61,75],[100,75],[119,81],[139,95],[150,151],[137,158],
    [132,143],[124,173],[122,217],[93,222],[53,220],[39,213],[37,165],
    [28,160],[13,151],[22,107],[32,91]
  ],
  bottom: [
    [43,216],[119,216],[126,286],[123,387],[117,522],[87,522],
    [82,313],[77,315],[70,522],[43,522],[38,377],[36,287]
  ],
  shoes: [
    [37,513],[71,513],[80,526],[74,548],[23,548],[23,528],
    [86,515],[115,515],[138,532],[137,550],[86,550]
  ]
};
const defaultRGB = {
  top: [235, 226, 215],
  bottom: [61, 62, 64],
  shoes: [230, 226, 216]
};
const pendingDraws = new WeakMap();
function selected(items, look, category) {
  return items.find(item => item.id === look[category]);
}
function recolor(ctx, key, color) {
  const vertices = polygonMasks[key];
  const mask = document.createElement("canvas");
  mask.width = ctx.canvas.width;
  mask.height = ctx.canvas.height;
  const m = mask.getContext("2d");
  m.fillStyle = "#fff";
  m.beginPath();
  vertices.forEach(([x, y], i) => i === 0 ? m.moveTo(x, y) : m.lineTo(x, y));
  m.closePath();
  m.fill();
  const region = m.getImageData(0, 0, mask.width, mask.height).data;
  const imageData = ctx.getImageData(0, 0, mask.width, mask.height);
  const pixels = imageData.data;
  const target = hexToRGB(color);
  const reference = defaultRGB[key];
  for (let i = 0; i < pixels.length; i += 4) {
    if (!region[i + 3]) continue;
    const red = pixels[i], green = pixels[i + 1], blue = pixels[i + 2];
    const luminance = (red + green + blue) / 3;
    // Avoid recoloring hands and skin that meet garment contours.
    if (key === "top" && (red < 95 || red - green > 24 || green - blue > 23)) continue;
    if (key === "bottom" && luminance > 162) continue;
    if (key === "shoes" && (red - green > 27 || green - blue > 28)) continue;
    const strength = key === "bottom" ? .93 : .85;
    for (let c = 0; c < 3; c++) {
      let next = pixels[i + c] * target[c] / Math.max(36, reference[c]);
      if (key === "bottom") next = pixels[i + c] * (target[c] / Math.max(24, reference[c]));
      pixels[i + c] = Math.max(0, Math.min(255, Math.round(pixels[i + c] * (1 - strength) + next * strength)));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
export async function renderModel(target, look = {}, items = []) {
  const n = (pendingDraws.get(target) || 0) + 1;
  pendingDraws.set(target, n);
  const img = await image();
  if (pendingDraws.get(target) !== n) return;
  const canvas = target.querySelector("canvas") || document.createElement("canvas");
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  canvas.setAttribute("aria-label", "精致男性动漫立绘，服饰支持颜色预览");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  for (const [category, key] of [["top", "top"], ["bottom", "bottom"], ["shoes", "shoes"]]) {
    const piece = selected(items, look, category);
    if (piece) recolor(ctx, key, piece.color);
  }
  if (pendingDraws.get(target) !== n) return;
  if (!canvas.isConnected) target.replaceChildren(canvas);
}
