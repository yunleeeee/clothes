import { DEFAULT_PROFILE, normalizeColor } from "./wardrobe.js";

// Original, editable male fashion illustration. No third-party character art is included.
// Every garment follows the same shoulder / waist / hip / ankle anchors.
const path = (d, fill, stroke = "#655e56", width = 1.45, attr = "") =>
  '<path d="' + d + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round" ' + attr + '/>';
const ellipse = (x, y, rx, ry, fill, attr = "") =>
  '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '" ' + attr + '/>';
const circle = (x, y, radius, fill, attr = "") =>
  '<circle cx="' + x + '" cy="' + y + '" r="' + radius + '" fill="' + fill + '" ' + attr + '/>';
const r = value => Math.round(value * 10) / 10;
const itemFor = (look, items, category) => items.find(item => item.id === look[category]);
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 100));
function tone(hex, offset) {
  const safe = normalizeColor(hex);
  return "#" + [1, 3, 5].map(start =>
    Math.max(0, Math.min(255, parseInt(safe.slice(start, start + 2), 16) + offset))
      .toString(16).padStart(2, "0")
  ).join("");
}
const line = (d, color = "#fff", width = 1.3, opacity = 0.4) =>
  path(d, "none", color, width, 'opacity="' + opacity + '"');
const group = name => '<g data-layer="' + name + '">';
const end = '</g>';

export function renderAvatar(look = {}, items = [], values = {}) {
  const profile = { ...DEFAULT_PROFILE, ...values };
  const skin = normalizeColor(profile.skin, "#e2b49b");
  const hair = normalizeColor(profile.hair, "#242730");
  const H = tone(hair, -17), hairHighlight = tone(hair, 34);
  const stroke = "#555047";
  const shoulders = clamp(profile.shoulders, 80, 125);
  const waist = clamp(profile.waist, 75, 125);
  const hips = clamp(profile.hips, 80, 125);
  const legs = clamp(profile.legs, 90, 112);
  const S = r((shoulders - 100) * 0.37);
  const W = r((waist - 100) * 0.23);
  const G = r((hips - 100) * 0.19);
  const bottomY = r(591 + (legs - 100) * 0.5);
  const SL = r(145 - S), SR = r(275 + S);
  const WL = r(178 - W), WR = r(242 + W);
  const HL = r(172 - G), HR = r(248 + G);
  const top = itemFor(look, items, "top");
  const trousers = itemFor(look, items, "bottom");
  const dress = itemFor(look, items, "dress");
  const jacket = itemFor(look, items, "outer");
  const shoes = itemFor(look, items, "shoes");
  const accessory = itemFor(look, items, "accessory");
  const T = normalizeColor(top?.color, "#edeae3");
  const B = normalizeColor(trousers?.color, "#545e65");
  const D = normalizeColor(dress?.color, "#b9b8aa");
  const J = normalizeColor(jacket?.color, "#6e817c");
  const SH = normalizeColor(shoes?.color, "#eae7df");

  const a = [];
  a.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 660" role="img" aria-label="成年男性二次元时装角色，可更换服装" data-avatar-gender="male">');
  a.push('<defs>');
  a.push('<linearGradient id="skin-gradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".27"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#754e48" stop-opacity=".12"/></linearGradient>');
  a.push('<linearGradient id="cloth-light" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".42" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#111" stop-opacity=".15"/></linearGradient>');
  a.push('</defs>');
  a.push(ellipse(210, 625, 84, 7, "#777b76", 'opacity=".13"'));

  // Back hair, silhouette and neck, for a modern short, messy male haircut.
  a.push(group("body"));
  a.push(path("M173 111 Q157 83 168 69 Q180 43 214 46 Q246 47 257 68 Q269 91 250 118 L243 150 L180 151 Z", H, "#27272d", 2.1));
  a.push(path("M192 168 L194 213 Q191 228 177 234 L210 256 L244 234 Q230 224 227 208 L228 165 Z", skin, "#8d7164", 1.5));
  a.push(path("M198 186 Q209 193 222 186 L223 210 Q207 224 197 205 Z", tone(skin,-15), "none", 0));
  // Legs continue under all clothing.
  a.push(path("M177 330 Q188 324 210 330 L206 400 L201 490 L197 "+(bottomY-13)+" Q186 "+bottomY+" 176 "+(bottomY-11)+" L174 475 L170 385 Z", skin, "#997666", 1.2));
  a.push(path("M210 331 Q232 323 245 333 L253 386 L243 490 L243 "+(bottomY-13)+" Q236 "+bottomY+" 226 "+(bottomY-12)+" L220 481 L213 402 Z", skin, "#997666", 1.2));
  // Left arm has a slight natural curve and a separate hand.
  a.push(path("M"+SL+" 229 Q"+(SL-18)+" 226 "+(SL-26)+" 250 Q"+(SL-36)+" 289 121 347 L116 390 Q114 403 121 410 Q132 417 138 404 L143 382 Q145 369 143 352 L"+(SL+17)+" 265 Z",skin,"#987468",1.35));
  a.push(path("M119 386 Q114 402 121 412 L127 419 Q130 422 133 418 L133 404 Q139 415 141 408 L141 390 Z",skin,"#987468",1.2));
  a.push(line("M125 403 L128 414","#a77c6c",1.2,.5));
  // Right arm rests beside the torso.
  a.push(path("M"+SR+" 229 Q"+(SR+19)+" 230 "+(SR+26)+" 256 Q"+(SR+34)+" 293 299 345 L303 384 Q307 401 297 410 Q285 415 280 402 L273 380 Q271 362 278 345 L"+(SR-17)+" 265 Z",skin,"#987468",1.35));
  a.push(path("M281 387 Q278 402 286 413 L292 418 Q296 420 299 416 L299 400 Q295 409 292 407 L291 390 Z",skin,"#987468",1.2));
  // Shirt-underlayer/torso mostly covered by garments.
  a.push(path("M"+SL+" 233 Q177 220 194 222 L210 236 L226 222 Q245 223 "+SR+" 233 L"+WR+" 325 L"+HR+" 361 Q210 372 "+HL+" 361 L"+WL+" 325 Z",skin,"#987468",1.5));
  a.push(end);

  // Pants, shorts and optional one-piece garment use shared waist and hip anchors.
  a.push(group("bottom"));
  if (trousers?.style === "skirt") {
    a.push(path("M"+(WL-4)+" 331 Q210 337 "+(WR+4)+" 331 L"+(HR+19)+" 415 Q210 432 "+(HL-19)+" 415 Z",B,stroke,1.7));
    a.push(line("M"+(WL+4)+" 345 L"+(HL-8)+" 415 M"+(WR-4)+" 345 L"+(HR+8)+" 415",tone(B,-42),1.3,.32));
  } else if (trousers?.style === "shorts") {
    a.push(path("M"+WL+" 333 Q210 329 "+WR+" 333 L"+(HR+4)+" 404 L217 407 L210 379 L203 407 L"+(HL-4)+" 403 Z",B,stroke,1.8));
    a.push(path("M210 358 L210 380", "none", tone(B,-55),1.3));
    a.push(line("M"+(HL+4)+" 398 Q184 401 203 397 M216 398 Q237 401 "+(HR-2)+" 396",tone(B,45),1.2,.35));
  } else {
    const fill = trousers ? B : "#464d52";
    // Two independent trouser legs; crotch and seams align precisely with the waist.
    a.push(path("M"+(WL-4)+" 331 Q210 327 "+(WR+4)+" 331 L"+(HR+4)+" 379 L"+(245)+" "+(bottomY-10)+" Q232 "+(bottomY-2)+" 221 "+(bottomY-10)+" L213 402 Q210 384 209 380 Q206 396 205 408 L202 "+(bottomY-9)+" Q187 "+bottomY+" 174 "+(bottomY-10)+" L"+(HL-5)+" 379 Z",fill,tone(fill,-62),1.7));
    a.push(path("M209 342 L209 379 Q207 391 204 402", "none",tone(fill,-60),1.15));
    a.push(line("M"+WL+" 343 Q210 350 "+WR+" 343",tone(fill,52),1.25,.65));
    a.push(line("M"+(HL+2)+" 379 Q175 401 171 427 M"+(HR-2)+" 382 Q235 411 246 429",tone(fill,42),1.1,.25));
    a.push(line("M183 463 Q184 491 181 530 M234 458 L237 518",tone(fill,55),1.4,.19));
    a.push(path("M"+(WL-4)+" 330 Q210 327 "+(WR+4)+" 330 L"+(WR+4)+" 344 Q210 348 "+(WL-4)+" 344 Z",tone(fill,-18),tone(fill,-55),1));
    a.push(path("M198 334 L221 334 L221 344 L198 344 Z", "#24292a","#3f4241",1));
    a.push(path("M201 337 L218 337 L218 341 L201 341 Z", "#b4ac9a","none",0));
    a.push(line("M"+(HL+8)+" 349 Q"+(HL+18)+" 365 191 362 M"+(HR-8)+" 349 Q"+(HR-18)+" 365 230 362",tone(fill,42),1.2,.22));
  }
  a.push(end);

  // Footwear is carefully fitted around the same ankle point as trouser cuffs.
  a.push(group("shoes"));
  const shoeTop = bottomY - (shoes?.style==="boots" ? 33 : 14);
  a.push(path("M176 "+shoeTop+" Q185 "+(shoeTop+4)+" 201 "+shoeTop+" L205 "+(bottomY+13)+" Q199 "+(bottomY+23)+" 184 "+(bottomY+25)+" L145 "+(bottomY+24)+" Q138 "+(bottomY+18)+" 149 "+(bottomY+10)+" L171 "+(bottomY-1)+" Z",SH,tone(SH,-90),1.7));
  a.push(path("M223 "+shoeTop+" Q237 "+(shoeTop+4)+" 244 "+shoeTop+" L255 "+(bottomY+9)+" Q269 "+(bottomY+17)+" 263 "+(bottomY+23)+" L223 "+(bottomY+24)+" Q214 "+(bottomY+21)+" 218 "+(bottomY+7)+" Z",SH,tone(SH,-90),1.7));
  a.push(line("M149 "+(bottomY+17)+" Q169 "+(bottomY+23)+" 203 "+(bottomY+16)+" M221 "+(bottomY+18)+" Q243 "+(bottomY+22)+" 262 "+(bottomY+17),tone(SH,-55),2,.67));
  a.push(line("M175 "+(bottomY+4)+" L193 "+(bottomY+4)+" M230 "+(bottomY+4)+" L245 "+(bottomY+4),tone(SH,-75),1.6,.4));
  a.push(end);

  // Neck collar is a visible anchor: fitted layers wrap around it.
  a.push(group("top"));
  if (dress) {
    const hem = dress.style === "longdress" ? 501 : 448;
    a.push(path("M"+SL+" 230 L189 218 Q210 236 232 218 L"+SR+" 230 Q291 246 294 282 L269 289 L262 277 L"+(WR+3)+" 322 L"+(HR+38)+" "+hem+" Q210 "+(hem+12)+" "+(HL-38)+" "+hem+" L"+(WL-3)+" 322 L155 277 L147 289 L125 282 Q128 245 "+SL+" 230 Z",D,tone(D,-68),1.75));
    a.push(line("M"+WL+" 324 Q210 333 "+WR+" 324 M"+(HL-18)+" "+(hem-12)+" Q210 "+(hem+2)+" "+(HR+18)+" "+(hem-12),tone(D,-45),1.3,.32));
  } else {
    const longSleeve = top?.style === "sweater" || top?.style === "shirt";
    const isShirt = top?.style === "shirt";
    const isSweater = top?.style === "sweater";
    const fill = top ? T : "#e6e7e2";
    const sleeveLeft = longSleeve ? 377 : 288;
    const sleeveRight = longSleeve ? 379 : 288;
    // A single continuous torso and sleeves path, with sleeves over arms.
    a.push(path(
      "M"+SL+" 229 Q165 223 184 217 L193 217 Q210 235 227 217 L236 217 Q254 223 "+SR+" 230 "+
      "Q"+(SR+12)+" 234 "+(SR+20)+" 256 L"+(longSleeve?287:292)+" "+sleeveRight+
      " L"+(longSleeve?266:264)+" "+(sleeveRight+4)+
      " L"+(longSleeve?251:253)+" 279 L"+(WR+5)+" 345 Q210 352 "+(WL-5)+" 345 L167 279 "+
      "L"+(longSleeve?150:155)+" "+(sleeveLeft+4)+" L"+(longSleeve?126:131)+" "+sleeveLeft+
      " L"+(SL-21)+" 256 Q"+(SL-12)+" 234 "+SL+" 229 Z",
      fill,tone(fill,-66),1.75
    ));
    // Clothing-specific collar. The face and neck must never be hidden.
    if (isShirt) {
      a.push(path("M186 217L210 237L199 251L177 225Z",tone(fill,13),tone(fill,-63),1.15));
      a.push(path("M234 217L210 237L220 251L245 225Z",tone(fill,13),tone(fill,-63),1.15));
      a.push(line("M211 250 L211 343",tone(fill,-62),1.3,.55));
      for (let y=265;y<334;y+=17) a.push(circle(213,y,1.6,tone(fill,-75)));
      a.push(line("M185 285 Q200 297 203 307 M242 287 Q229 297 223 311",tone(fill,-42),1.1,.23));
    } else {
      a.push(path("M184 217 Q210 246 236 217 L228 221 Q210 237 192 221 Z",isSweater?tone(fill,-23):tone(fill,-15),tone(fill,-71),1.1));
    }
    if (isSweater) {
      a.push(path("M"+(WL-5)+" 333 Q210 340 "+(WR+5)+" 333 L"+(WR+5)+" 346 Q210 353 "+(WL-5)+" 346 Z",tone(fill,-21),"none",0));
      a.push(line("M128 372 L148 375 M266 374 L284 372",tone(fill,-77),2,.38));
    } else if (!isShirt) {
      a.push(line("M"+(WL-2)+" 339 Q210 347 "+(WR+2)+" 339",tone(fill,-65),1.3,.35));
      a.push(line("M166 276 L174 318 M253 275 L245 316",tone(fill,-55),1.1,.22));
    }
    a.push(line("M"+(SL+5)+" 239 Q164 256 163 268 M"+(SR-5)+" 239 Q257 256 257 270",tone(fill,-70),1.1,.28));
  }
  a.push(end);

  // Outer jacket sleeves physically connect to shoulder and end at the wrists.
  if (jacket) {
    const longCoat = jacket.style === "coat";
    const hem = longCoat ? 446 : 361;
    a.push(group("outer"));
    a.push(path(
      "M"+SL+" 228 L185 217 L197 241 L188 278 L180 "+hem+" L"+(WL-26)+" "+(hem+5)+
      " L"+(SL+8)+" 286 L148 367 L123 372 L"+(SL-26)+" 258 Q"+(SL-18)+" 235 "+SL+" 228 Z",
      J,tone(J,-72),1.75
    ));
    a.push(path(
      "M"+SR+" 229 L235 217 L223 242 L234 279 L242 "+hem+" L"+(WR+27)+" "+(hem+4)+
      " L"+(SR-8)+" 287 L272 368 L296 372 L"+(SR+26)+" 258 Q"+(SR+18)+" 235 "+SR+" 229 Z",
      J,tone(J,-72),1.75
    ));
    a.push(path("M185 219 L201 248 L192 264 L175 230 Z",tone(J,10),tone(J,-50),1));
    a.push(path("M235 219 L219 248 L227 264 L245 230 Z",tone(J,10),tone(J,-50),1));
    a.push(line("M152 274 Q140 315 142 344 M269 275 Q279 318 276 347",tone(J,52),1.4,.27));
    a.push(line("M160 309 Q174 317 178 318 M244 316 Q251 310 259 308",tone(J,-48),1.3,.3));
    a.push(path("M159 334 L181 336 L177 348 L159 346 Z","none",tone(J,-48),1.1));
    a.push(path("M239 336 L260 334 L260 346 L243 348 Z","none",tone(J,-48),1.1));
    a.push(line("M124 368 L147 366 M273 366 L296 369",tone(J,-60),2,.66));
    a.push(end);
  }

  // Face: sharper angular jaw, narrower eyes, asymmetric brows, slight three-quarter angle.
  a.push(group("face"));
  a.push(ellipse(169,136,8,13,skin));
  a.push(ellipse(251,136,8,13,skin));
  a.push(path("M168 104 Q170 71 200 66 Q233 60 251 97 L251 141 Q250 170 230 184 L215 193 Q204 197 193 190 L179 179 Q164 161 166 135 Z",skin,"#8d6e60",1.7));
  a.push(path("M174 148 Q180 171 197 185 L215 193 Q229 188 236 176", "none",tone(skin,-33),.95,'opacity=".33"'));
  a.push(path("M169 117 L167 141 L175 150", "none",tone(skin,-32),1.2,'opacity=".38"'));
  a.push(path("M181 124 Q191 121 201 125", "none","#34383c",2.8));
  a.push(path("M219 124 Q230 118 240 120", "none","#34383c",2.7));
  a.push(path("M182 141 Q193 134 201 141 Q195 149 183 145", "#f9f4ee", "#4e4d4c",1.3));
  a.push(path("M219 140 Q229 132 239 139 Q232 147 220 144", "#f9f4ee", "#4e4d4c",1.3));
  a.push(ellipse(193,142,4.4,6.8,"#5e6f73"));
  a.push(ellipse(228,140,4.4,6.8,"#5e6f73"));
  a.push(circle(194,139,1.5,"#fff"));
  a.push(circle(229,137,1.5,"#fff"));
  a.push(line("M207 148 L205 156 Q209 159 213 156",tone(skin,-70),1.15,.67));
  a.push(path("M200 169 Q210 172 219 168", "none","#976f6c",1.2,'opacity=".77"'));
  a.push(line("M201 176 Q210 179 219 175",tone(skin,-48),.8,.4));
  a.push(end);

  // Textured windswept hair, fully above the face and never below the shoulders.
  a.push(group("hair"));
  a.push(path("M165 123 Q157 111 161 100 L154 108 Q156 89 168 75 L157 80 Q169 57 187 53 L180 48 Q201 46 216 52 Q239 44 248 61 L263 62 L252 72 Q266 80 265 95 L257 92 Q263 113 249 126 L245 108 L241 95 Q231 103 225 105 Q209 103 198 92 Q184 109 171 110 Z",hair,"#23272e",2.1));
  a.push(path("M169 93 Q185 63 213 60 Q237 57 249 74 Q230 67 213 78 Q190 89 182 107 Z",H,"none",0));
  a.push(path("M165 113 Q178 93 193 88 Q209 76 220 69 Q218 91 202 104 Q191 112 174 118 Z",hair,"#23272e",1.2));
  a.push(path("M217 75 Q239 69 249 84 Q243 100 233 109 Q235 91 217 75 Z",tone(hair,5),"none",0));
  a.push(line("M173 91 Q188 66 211 61 M196 88 Q212 69 230 66 M229 78 Q244 79 251 96",hairHighlight,2.2,.55));
  a.push(line("M161 103 L155 117 M247 106 L252 119",hairHighlight,1.1,.36));
  a.push(end);

  if (accessory) {
    const A = normalizeColor(accessory.color, "#c5bab0");
    a.push(group("accessory"));
    if (accessory.style === "scarf") {
      a.push(path("M190 208 Q210 223 231 209 L238 232 Q211 255 183 231 Z",A,tone(A,-66),1.4));
      a.push(path("M222 226 L238 233 L231 299 L214 294 Z",A,tone(A,-66),1.3));
    } else if (accessory.style === "bow") {
      // A small removable lapel pin rather than a large feminine hair bow.
      a.push(path("M255 284 L264 279 L267 287 L258 294 Z",A,tone(A,-60),1.2));
      a.push(circle(261,285,2.1,"#e9e1d3"));
    }
    a.push(end);
  }
  a.push('</svg>');
  return a.join("");
}
