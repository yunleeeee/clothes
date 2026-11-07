import { DEFAULT_PROFILE, normalizeColor } from "./wardrobe.js";

const p = (d, fill, stroke = "#706e67", width = 1.8, extra = "") =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const ell = (x, y, rx, ry, fill, extra = "") =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const round = value => Number(value.toFixed(1));
function itemAt(look, items, category) { return items.find(item => item.id === look[category]); }

/**
 * A hand-drawn, original 2D fashion illustration.
 * This is not photographic virtual try-on: garment types and colors are mapped to SVG shapes.
 */
export function renderAvatar(look = {}, items = [], values = {}) {
  const profile = { ...DEFAULT_PROFILE, ...values };
  const skin = normalizeColor(profile.skin, "#f5cdb6");
  const hair = normalizeColor(profile.hair, "#594c46");
  const shoulderL = round(151 - (Number(profile.shoulders) - 100) * 0.23);
  const shoulderR = round(229 + (Number(profile.shoulders) - 100) * 0.23);
  const waistL = round(167 - (Number(profile.waist) - 100) * 0.15);
  const waistR = round(215 + (Number(profile.waist) - 100) * 0.15);
  const hipL = round(157 - (Number(profile.hips) - 100) * 0.17);
  const hipR = round(225 + (Number(profile.hips) - 100) * 0.17);
  const ankle = round(544 + (Number(profile.legs) - 100) * 0.58);
  const top = itemAt(look, items, "top");
  const bottom = itemAt(look, items, "bottom");
  const dress = itemAt(look, items, "dress");
  const outer = itemAt(look, items, "outer");
  const shoes = itemAt(look, items, "shoes");
  const accessory = itemAt(look, items, "accessory");
  const topColor = normalizeColor(top?.color, "#ece9e0");
  const bottomColor = normalizeColor(bottom?.color, "#8195aa");
  const dressColor = normalizeColor(dress?.color, "#bdc4ad");
  const coatColor = normalizeColor(outer?.color, "#a3b0a6");
  const shoeColor = normalizeColor(shoes?.color, "#ede9df");
  const result = [];
  result.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 610" role="img" aria-label="二次元人物穿搭插画">');
  result.push(`<defs>
    <linearGradient id="skinShade" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#a16f5b" stop-opacity=".12"/></linearGradient>
    <linearGradient id="garmentGlow" x1="0" x2="1"><stop stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5a5245" stop-opacity=".12"/></linearGradient>
  </defs>`);
  // Long hair is behind the neck and clothing, not over the arms.
  if (profile.hairStyle === "bob") {
    result.push(p("M146 129Q131 79 162 57Q186 39 214 58Q245 82 233 145L230 203Q193 221 149 200Z", hair, "#655b52", 2));
  } else {
    result.push(p("M145 120Q134 75 160 54Q187 34 217 58Q245 77 234 141L239 290Q220 316 200 301Q178 321 144 303L139 226Z", hair, "#5c554c", 2));
    result.push(p("M143 145Q144 220 154 292", "none", "#fff", 1.8, 'opacity=".14"'));
    result.push(p("M230 142Q222 246 230 290", "none", "#fff", 1.8, 'opacity=".12"'));
  }

  // Legs are drawn with soft contours and asymmetry.
  result.push(p(`M${hipL+7} 338Q169 328 195 340L189 417L188 ${ankle-12}Q184 ${ankle+2} 176 ${ankle+1}Q168 ${ankle-6} 170 ${ankle-19}L163 415Q158 376 ${hipL+7} 338Z`, skin, "#a98272", 1.5));
  result.push(p(`M194 340Q215 328 ${hipR-6} 338L225 414L214 ${ankle-16}Q214 ${ankle+2} 206 ${ankle+1}Q198 ${ankle-5} 198 ${ankle-15}L195 418Z`, skin, "#a98272", 1.5));
  result.push(p(`M173 412Q182 424 190 411M199 414Q211 425 220 408`, "none", "#bb8e7c", 1.1, 'opacity=".35"'));

  // Slightly bent arms, hands and wrists.
  result.push(p(`M${shoulderL+5} 224Q${shoulderL-13} 220 ${shoulderL-20} 248Q${shoulderL-29} 278 128 347Q121 371 125 394L130 418Q138 431 146 420Q152 414 145 395L145 371Q154 316 ${shoulderL+13} 263Z`, skin, "#a98272", 1.55));
  result.push(p(`M${shoulderR-4} 225Q${shoulderR+17} 224 ${shoulderR+25} 251L270 348Q277 373 273 393L270 414Q264 425 256 420Q247 415 252 399L252 371Q249 320 ${shoulderR-11} 263Z`, skin, "#a98272", 1.55));
  result.push(p("M130 409Q135 415 141 409M256 410Q262 415 267 410", "none", "#ac8072", .9));
  // Base neck and torso.
  result.push(p("M177 183L176 209Q175 220 164 228Q190 240 218 228Q203 220 203 209L202 181Z", skin, "#a98272", 1.4));
  result.push(p(`M${shoulderL} 231Q174 220 190 227Q208 220 ${shoulderR} 231L${waistR} 324Q224 337 ${hipR} 362L${hipL} 362Q154 337 ${waistL} 324Z`, skin, "#a98272", 1.5));

  // Bottom garment or bare base layer.
  if (!dress) {
    if (bottom?.style === "skirt") {
      result.push(p(`M${waistL-3} 320Q190 326 ${waistR+3} 320L${hipR+26} 420Q190 437 ${hipL-26} 420Z`, bottomColor, "#70716c", 1.8));
      result.push(p(`M${waistL+4} 341L${hipL-12} 420M${waistR-4} 341L${hipR+12} 420M190 339V427`, "none", "#fff", 1.6, 'opacity=".23"'));
    } else if (bottom?.style === "shorts") {
      result.push(p(`M${waistL-2} 325L${waistR+2} 325L${hipR+1} 385Q213 393 196 384L190 364L184 384Q164 392 ${hipL-1} 384Z`, bottomColor, "#70716c", 1.8));
    } else {
      result.push(p(`M${waistL-3} 323L${waistR+3} 323Q${hipR+3} 350 ${hipR+2} 390L218 ${ankle-22}L193 ${ankle-22}L190 389L186 ${ankle-22}L162 ${ankle-22}Q158 425 ${hipL-2} 389Q${hipL-3} 353 ${waistL-3} 323Z`, bottom ? bottomColor : "#e3dcd3", "#6c716f", 1.9));
      result.push(p(`M190 363L191 ${ankle-23}M${waistL+1} 333Q190 343 ${waistR-1} 333`, "none", "#fff", 1.4, 'opacity=".3"'));
    }
  }

  // Dress body and hem.
  if (dress) {
    const hem = dress.style === "longdress" ? 474 : 421;
    result.push(p(`M${shoulderL} 232Q166 222 177 221Q189 237 202 221Q216 222 ${shoulderR} 232L${shoulderR+20} 272Q${shoulderR+12} 289 ${shoulderR-1} 287L${waistR} 319L${hipR+42} ${hem}Q192 ${hem+23} ${hipL-42} ${hem}L${waistL} 319L${shoulderL+1} 287Q${shoulderL-12} 289 ${shoulderL-20} 272Z`, dressColor, "#6e726b", 1.9));
    result.push(p(`M${waistL} 326Q190 336 ${waistR} 326M${hipL-12} ${hem-7}Q190 ${hem+9} ${hipR+12} ${hem-7}`, "none", "#fff", 1.7, 'opacity=".3"'));
  } else {
    const sweater = top?.style === "sweater";
    const shirt = top?.style === "shirt";
    const cuff = sweater ? 316 : 275;
    result.push(p(`M${shoulderL} 233L176 221Q188 240 203 221L${shoulderR} 233Q${shoulderR+12} 234 ${shoulderR+19} 263L${shoulderR+11} ${cuff}L${shoulderR-6} ${cuff+2}L${shoulderR-13} 276L${waistR+1} 338Q189 345 ${waistL-1} 338L${shoulderL+13} 276L${shoulderL+6} ${cuff+2}L${shoulderL-11} ${cuff}L${shoulderL-19} 263Q${shoulderL-12} 234 ${shoulderL} 233Z`, topColor, "#70716c", 1.9));
    result.push(p(`M${waistL} 329Q190 335 ${waistR} 329`, "none", "#fff", 2, 'opacity=".32"'));
    if (shirt) {
      result.push(p("M190 235L190 333M177 226L185 246L190 240L196 245L204 225", "none", "#fff", 1.5, 'opacity=".55"'));
      for (let y = 258; y < 324; y += 17) result.push(ell(191, y, 1.5, 1.5, "#746f66"));
    }
    if (sweater) {
      result.push(p(`M${shoulderL+4} 239Q190 250 ${shoulderR-4} 239M${shoulderL+6} ${cuff-5}L${shoulderL-10} ${cuff-5}M${shoulderR-6} ${cuff-5}L${shoulderR+11} ${cuff-5}`, "none", "#fff", 2, 'opacity=".27"'));
    }
  }

  // Coat panels sit above other clothes; center stays open.
  if (outer) {
    const hem = outer.style === "coat" ? 434 : 349;
    result.push(p(`M${shoulderL} 232L177 224L182 247L${waistL-7} ${hem}L${hipL-18} ${hem}L${shoulderL+8} 268L${shoulderL+4} 307L${shoulderL-17} 310L${shoulderL-22} 264Q${shoulderL-18} 238 ${shoulderL} 232Z`, coatColor, "#70716c", 1.8));
    result.push(p(`M${shoulderR} 232L203 224L198 247L${waistR+7} ${hem}L${hipR+18} ${hem}L${shoulderR-8} 268L${shoulderR-4} 307L${shoulderR+17} 310L${shoulderR+22} 264Q${shoulderR+18} 238 ${shoulderR} 232Z`, coatColor, "#70716c", 1.8));
    result.push(p("M177 226L164 251L178 260M203 226L216 251L202 260", "none", "#fff", 1.7, 'opacity=".35"'));
  }
  // Shoes with a softly arched sole.
  result.push(p(`M171 ${ankle-14}L190 ${ankle-13}L191 ${ankle+3}Q186 ${ankle+15} 164 ${ankle+16}L154 ${ankle+13}Q150 ${ankle+8} 158 ${ankle+2}Z`, shoeColor, "#7a7d77", 1.6));
  result.push(p(`M202 ${ankle-13}L218 ${ankle-14}L227 ${ankle+2}Q240 ${ankle+10} 230 ${ankle+15}Q209 ${ankle+18} 200 ${ankle+7}Z`, shoeColor, "#7a7d77", 1.6));
  result.push(p(`M154 ${ankle+12}Q172 ${ankle+18} 191 ${ankle+4}M201 ${ankle+7}Q219 ${ankle+20} 232 ${ankle+13}`, "none", "#fff", 2));

  // Ears, face and soft manga-style details.
  result.push(ell(147, 142, 10, 14, skin), ell(232, 143, 10, 14, skin));
  result.push(p("M145 112Q143 74 173 67Q190 61 209 69Q239 80 235 114L232 154Q226 188 193 201Q156 196 149 162Z", skin, "#a98272", 1.6));
  result.push(ell(164, 161, 13, 7, "#d99e97", 'opacity=".31"'));
  result.push(ell(217, 161, 13, 7, "#d99e97", 'opacity=".31"'));
  // Eyes are expressive but deliberately not exaggerated.
  result.push(p("M155 140Q167 131 176 140M204 140Q214 131 225 140", "none", "#4b433e", 2.1));
  result.push(ell(166, 145, 5.9, 9.5, "#4a423c"), ell(214, 145, 5.9, 9.5, "#4a423c"));
  result.push(ell(164, 141, 2, 3.3, "#fff"), ell(212, 141, 2, 3.3, "#fff"));
  result.push(p("M160 126Q169 123 176 128M205 128Q214 123 221 126", "none", "#796058", 1.4));
  result.push(p("M189 145Q187 157 192 159", "none", "#b4877c", 1.05));
  result.push(p("M181 173Q190 178 198 173", "none", "#b26e6e", 1.6));

  // Top hair and framing bangs.
  result.push(p("M143 125Q135 97 148 78Q160 54 190 52Q222 52 235 76Q244 95 236 125Q229 104 226 94Q220 112 201 109Q186 109 174 97Q162 117 145 125Z", hair, "#65584d", 1.9));
  result.push(p("M177 65Q175 88 157 108M211 69Q221 88 228 104", "none", "#fff", 1.55, 'opacity=".16"'));
  if (profile.hairStyle === "bob") {
    result.push(p("M144 113Q142 152 153 187L164 187Q153 156 157 129Z", hair, "#65584d", 1.3));
    result.push(p("M235 113Q236 155 227 187L217 188Q230 156 221 130Z", hair, "#65584d", 1.3));
  }
  if (accessory) {
    const ac = normalizeColor(accessory.color, "#b6a2a2");
    if (accessory.style === "bow") {
      result.push(p("M215 92Q241 74 236 98L224 104Q246 111 237 123Q221 115 215 103Z", ac, "#77716f", 1.4));
      result.push(ell(218, 102, 5, 5, "#f9eee7"));
    } else {
      result.push(p("M170 212Q189 226 212 211L219 226Q190 245 165 228Z", ac, "#77716f", 1.4));
      result.push(p("M203 224L216 234L208 292L194 290Z", ac, "#77716f", 1.4));
    }
  }
  result.push('</svg>');
  return result.join("");
}
