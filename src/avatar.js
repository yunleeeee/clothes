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
const fabricGradient = (id, color) =>
  '<linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2=".18">' +
  '<stop offset="0" stop-color="' + tone(color, -27) + '"/>' +
  '<stop offset=".2" stop-color="' + tone(color, 13) + '"/>' +
  '<stop offset=".48" stop-color="' + color + '"/>' +
  '<stop offset=".78" stop-color="' + tone(color, -8) + '"/>' +
  '<stop offset="1" stop-color="' + tone(color, -31) + '"/>' +
  '</linearGradient>';
const weave = d => path(d, "url(#fabric-weave)", "none", 0);
const group = name => '<g data-layer="' + name + '">';
const end = '</g>';

export function renderAvatar(look = {}, items = [], values = {}) {
  const profile = { ...DEFAULT_PROFILE, ...values };
  const skin = normalizeColor(profile.skin, "#e2b49b");
  const hair = normalizeColor(profile.hair, "#242730");
  const H = tone(hair, -17), hairHighlight = tone(hair, 34);
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
  const leftArmPose = "rotate(" + (dress ? 0 : -4) + " " + SL + " 229)";
  const rightArmPose = "rotate(" + (dress ? 0 : -1.5) + " " + SR + " 229)";
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
  a.push(fabricGradient("top-volume", top ? T : "#e6e7e2"));
  a.push(fabricGradient("bottom-volume", trousers ? B : "#464d52"));
  a.push(fabricGradient("dress-volume", D));
  a.push(fabricGradient("outer-volume", J));
  a.push(fabricGradient("shoe-volume", SH));
  a.push('<pattern id="fabric-weave" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 1H5M1 0V5" stroke="#fff" stroke-opacity=".055" stroke-width=".45"/><path d="M0 3H5M3 0V5" stroke="#18201c" stroke-opacity=".035" stroke-width=".35"/></pattern>');
  a.push('<pattern id="knit-texture" width="7" height="9" patternUnits="userSpaceOnUse"><path d="M1 0L3.5 3L6 0M1 4.5L3.5 7.5L6 4.5" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width=".65"/><path d="M0 2L3.5 5L7 2" fill="none" stroke="#172019" stroke-opacity=".055" stroke-width=".5"/></pattern>');
  a.push('<filter id="garment-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#20281f" flood-opacity=".18"/></filter>');
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
  a.push('<g data-part="left-arm" transform="' + leftArmPose + '">');
  a.push(path("M"+SL+" 229 Q"+(SL-18)+" 226 "+(SL-26)+" 250 Q"+(SL-36)+" 289 121 347 L116 390 Q114 403 121 410 Q132 417 138 404 L143 382 Q145 369 143 352 L"+(SL+17)+" 265 Z",skin,"#987468",1.35));
  a.push(path("M119 386 Q114 402 121 412 L127 419 Q130 422 133 418 L133 404 Q139 415 141 408 L141 390 Z",skin,"#987468",1.2));
  a.push(line("M125 403 L128 414","#a77c6c",1.2,.5));
  a.push(end);
  a.push('<g data-part="right-arm" transform="' + rightArmPose + '">');
  a.push(path("M"+SR+" 229 Q"+(SR+19)+" 230 "+(SR+26)+" 256 Q"+(SR+34)+" 293 299 345 L303 384 Q307 401 297 410 Q285 415 280 402 L273 380 Q271 362 278 345 L"+(SR-17)+" 265 Z",skin,"#987468",1.35));
  a.push(path("M281 387 Q278 402 286 413 L292 418 Q296 420 299 416 L299 400 Q295 409 292 407 L291 390 Z",skin,"#987468",1.2));
  a.push(end);
  // Shirt-underlayer/torso mostly covered by garments.
  a.push(path("M"+SL+" 233 Q177 220 194 222 L210 236 L226 222 Q245 223 "+SR+" 233 L"+WR+" 325 L"+HR+" 361 Q210 372 "+HL+" 361 L"+WL+" 325 Z",skin,"#987468",1.5));
  a.push(end);

  if (!dress) {
    a.push('<g data-layer="bottom" filter="url(#garment-shadow)">');
  if (trousers?.style === "skirt") {
    const skirt = "M"+(WL-5)+" 330 Q210 324 "+(WR+5)+" 330 C"+(WR+10)+" 353 "+(HR+12)+" 385 "+(HR+22)+" 416 Q210 435 "+(HL-22)+" 416 C"+(HL-12)+" 385 "+(WL-10)+" 353 "+(WL-5)+" 330 Z";
    a.push(path(skirt,"url(#bottom-volume)",tone(B,-58),1.35));
    a.push(weave(skirt));
    a.push(path("M"+(WL+8)+" 340 Q"+(HL+3)+" 374 "+(HL-8)+" 416 L"+(HL+8)+" 420 Q"+(HL+15)+" 373 "+(WL+20)+" 339 Z",tone(B,-30),"none",0,'opacity=".2"'));
    a.push(path("M"+(WR-13)+" 339 Q"+(HR-7)+" 377 "+(HR+5)+" 421 L"+(HR+17)+" 417 Q"+(HR+2)+" 373 "+(WR-2)+" 339 Z",tone(B,24),"none",0,'opacity=".13"'));
    a.push(line("M"+(WL+2)+" 342 Q"+(HL+15)+" 384 "+(HL+3)+" 421 M210 341 Q205 381 210 427 M"+(WR-2)+" 342 Q"+(HR-14)+" 384 "+(HR-2)+" 422",tone(B,-45),1.15,.38));
    a.push(line("M"+(HL-17)+" 414 Q210 429 "+(HR+17)+" 414",tone(B,45),1.15,.38));
    a.push(path("M"+(WL-5)+" 330 Q210 324 "+(WR+5)+" 330 L"+(WR+5)+" 342 Q210 336 "+(WL-5)+" 342 Z",tone(B,-15),tone(B,-50),1));
  } else if (trousers?.style === "shorts") {
    const shorts = "M"+(WL-4)+" 330 Q210 324 "+(WR+4)+" 330 L"+(HR+5)+" 396 Q232 405 216 400 L210 374 L203 400 Q185 407 "+(HL-5)+" 398 Z";
    a.push(path(shorts,"url(#bottom-volume)",tone(B,-58),1.4));
    a.push(weave(shorts));
    a.push(path("M207 342 Q204 359 210 376 Q215 357 215 342 Z",tone(B,-35),"none",0,'opacity=".3"'));
    a.push(line("M210 341 L210 374",tone(B,-60),1.15,.65));
    a.push(line("M"+(WL+3)+" 347 Q"+(WL+16)+" 354 "+(WL+19)+" 368 M"+(WR-3)+" 347 Q"+(WR-15)+" 354 "+(WR-18)+" 368",tone(B,-45),1.1,.45));
    a.push(line("M181 371 Q191 377 202 374 M218 374 Q230 379 240 371",tone(B,45),1.2,.32));
    a.push(path("M"+(HL-4)+" 389 Q185 397 204 391 L203 400 Q185 407 "+(HL-5)+" 398 Z",tone(B,-18),"none",0));
    a.push(path("M216 391 Q234 397 "+(HR+4)+" 389 L"+(HR+5)+" 396 Q232 405 216 400 Z",tone(B,-18),"none",0));
    a.push(line("M"+(HL-2)+" 394 Q186 401 202 396 M218 396 Q236 401 "+(HR+2)+" 393",tone(B,48),1,.45));
  } else {
    const fill = trousers ? B : "#464d52";
    const seat = "M"+(WL-4)+" 330 Q210 324 "+(WR+4)+" 330 L"+(HR+2)+" 377 Q236 388 214 383 L210 370 L206 383 Q184 388 "+(HL-2)+" 377 Z";
    const leftLeg = "M"+(HL-2)+" 363 C184 361 200 365 211 377 L207 410 C203 443 204 476 202 "+(bottomY-10)+" Q189 "+(bottomY-4)+" 174 "+(bottomY-10)+" C173 548 170 511 172 478 C174 444 168 411 "+(HL-5)+" 379 Z";
    const rightLeg = "M209 377 C220 365 236 361 "+(HR+2)+" 363 L"+(HR+5)+" 379 C252 411 246 444 246 478 C248 511 245 548 245 "+(bottomY-10)+" Q232 "+(bottomY-4)+" 221 "+(bottomY-10)+" C220 547 218 510 218 477 C217 443 214 421 210 402 Z";
    const outline = "M"+(WL-4)+" 330 Q210 324 "+(WR+4)+" 330 L"+(HR+2)+" 363 L"+(HR+5)+" 379 C252 411 246 444 246 478 C248 511 245 548 245 "+(bottomY-10)+" Q232 "+(bottomY-4)+" 221 "+(bottomY-10)+" C220 547 218 510 218 477 C217 443 214 421 210 402 C207 421 204 443 203 476 L202 "+(bottomY-10)+" Q189 "+(bottomY-4)+" 174 "+(bottomY-10)+" C173 548 170 511 172 478 C174 444 168 411 "+(HL-5)+" 379 L"+(HL-2)+" 363 Z";
    a.push(path(seat,"url(#bottom-volume)","none",0));
    a.push(path(leftLeg,"url(#bottom-volume)","none",0));
    a.push(path(rightLeg,"url(#bottom-volume)","none",0));
    a.push(weave(seat)); a.push(weave(leftLeg)); a.push(weave(rightLeg));
    a.push(path(outline,"none",tone(fill,-58),1.35));
    a.push(path("M204 374 Q199 421 197 465 L195 "+(bottomY-13)+" L202 "+(bottomY-10)+" C204 473 203 440 207 410 L211 377 Z",tone(fill,-35),"none",0,'opacity=".24"'));
    a.push(path("M210 402 Q215 431 218 477 C218 510 220 547 221 "+(bottomY-10)+" L226 "+(bottomY-11)+" Q223 526 224 477 C222 438 217 410 214 383 Z",tone(fill,27),"none",0,'opacity=".12"'));
    a.push(path("M204 342 Q204 365 210 380 Q216 363 215 342 Z",tone(fill,-42),"none",0,'opacity=".17"'));
    a.push(line("M209 342 Q207 360 210 379",tone(fill,-65),1.1,.7));
    a.push(line("M"+(WL+1)+" 345 Q"+(WL+14)+" 351 "+(WL+20)+" 367 M"+(WR-1)+" 345 Q"+(WR-14)+" 351 "+(WR-20)+" 367",tone(fill,-50),1.15,.5));
    a.push(line("M"+(WL+4)+" 346 Q"+(WL+16)+" 351 "+(WL+21)+" 362 M"+(WR-4)+" 346 Q"+(WR-16)+" 351 "+(WR-21)+" 362",tone(fill,52),.8,.35));
    a.push(line("M174 434 Q184 441 199 435 M177 446 Q188 448 201 442 M222 438 Q233 432 247 440 M220 450 Q232 445 244 451",tone(fill,-48),1.05,.32));
    a.push(line("M177 431 Q188 435 199 431 M222 435 Q233 431 244 436",tone(fill,52),.85,.25));
    a.push(line("M174 "+(bottomY-39)+" Q185 "+(bottomY-31)+" 201 "+(bottomY-37)+" M177 "+(bottomY-24)+" Q188 "+(bottomY-28)+" 201 "+(bottomY-22)+" M221 "+(bottomY-37)+" Q233 "+(bottomY-32)+" 245 "+(bottomY-39)+" M222 "+(bottomY-23)+" Q233 "+(bottomY-19)+" 244 "+(bottomY-27),tone(fill,-48),1,.34));
    a.push(line("M178 397 C181 427 176 456 181 478 M240 397 C236 427 242 455 238 477",tone(fill,55),1,.2));
    a.push(path("M"+(WL-4)+" 330 Q210 324 "+(WR+4)+" 330 L"+(WR+4)+" 342 Q210 336 "+(WL-4)+" 342 Z",tone(fill,-16),tone(fill,-50),1));
    a.push(path("M198 332 L221 332 L221 342 L198 342 Z", "#24292a","#3f4241",.9));
    a.push(path("M201 335 L218 335 L218 339 L201 339 Z", "#b4ac9a","none",0));
    for (const x of [WL+5, WR-5]) a.push(line("M"+x+" 331 L"+x+" 341",tone(fill,50),1.4,.45));
  }
    a.push(end);
  }

  a.push('<g data-layer="shoes" filter="url(#garment-shadow)">');
  const boots = shoes?.style === "boots";
  const shoeTop = bottomY - (boots ? 35 : 14);
  const leftShoe = "M176 "+shoeTop+" Q185 "+(shoeTop+4)+" 201 "+shoeTop+" L205 "+(bottomY+12)+" Q199 "+(bottomY+21)+" 184 "+(bottomY+23)+" L145 "+(bottomY+22)+" Q138 "+(bottomY+17)+" 149 "+(bottomY+9)+" L171 "+(bottomY-1)+" Z";
  const rightShoe = "M223 "+shoeTop+" Q237 "+(shoeTop+4)+" 244 "+shoeTop+" L255 "+(bottomY+8)+" Q269 "+(bottomY+16)+" 263 "+(bottomY+21)+" L223 "+(bottomY+22)+" Q214 "+(bottomY+20)+" 218 "+(bottomY+7)+" Z";
  a.push(path(leftShoe,"url(#shoe-volume)",tone(SH,-80),1.3));
  a.push(path(rightShoe,"url(#shoe-volume)",tone(SH,-80),1.3));
  a.push(path("M149 "+(bottomY+9)+" Q168 "+(bottomY+4)+" 184 "+(bottomY+9)+" Q197 "+(bottomY+13)+" 204 "+(bottomY+11)+" L205 "+(bottomY+15)+" Q188 "+(bottomY+22)+" 164 "+(bottomY+18)+" L145 "+(bottomY+17)+" Z",tone(SH,16),"none",0,'opacity=".55"'));
  a.push(path("M220 "+(bottomY+7)+" Q235 "+(bottomY+2)+" 251 "+(bottomY+8)+" L262 "+(bottomY+16)+" Q240 "+(bottomY+19)+" 219 "+(bottomY+15)+" Z",tone(SH,14),"none",0,'opacity=".45"'));
  a.push(path("M144 "+(bottomY+17)+" Q166 "+(bottomY+25)+" 184 "+(bottomY+23)+" Q199 "+(bottomY+22)+" 205 "+(bottomY+14)+" L205 "+(bottomY+18)+" Q197 "+(bottomY+26)+" 183 "+(bottomY+27)+" L145 "+(bottomY+26)+" Q140 "+(bottomY+23)+" 144 "+(bottomY+17)+" Z",tone(SH,-24),tone(SH,-70),.8));
  a.push(path("M218 "+(bottomY+15)+" Q238 "+(bottomY+23)+" 264 "+(bottomY+16)+" L264 "+(bottomY+21)+" Q246 "+(bottomY+27)+" 223 "+(bottomY+26)+" Q215 "+(bottomY+24)+" 218 "+(bottomY+15)+" Z",tone(SH,-24),tone(SH,-70),.8));
  a.push(line("M147 "+(bottomY+19)+" Q169 "+(bottomY+25)+" 201 "+(bottomY+18)+" M221 "+(bottomY+19)+" Q243 "+(bottomY+24)+" 261 "+(bottomY+19),tone(SH,45),1.1,.7));
  if (boots) {
    a.push(path("M175 "+shoeTop+" Q187 "+(shoeTop+5)+" 202 "+shoeTop+" L202 "+(shoeTop+8)+" Q188 "+(shoeTop+12)+" 175 "+(shoeTop+8)+" Z",tone(SH,-22),tone(SH,-65),.9));
    a.push(path("M222 "+shoeTop+" Q234 "+(shoeTop+5)+" 245 "+shoeTop+" L246 "+(shoeTop+8)+" Q234 "+(shoeTop+12)+" 223 "+(shoeTop+8)+" Z",tone(SH,-22),tone(SH,-65),.9));
    a.push(line("M183 "+(shoeTop+11)+" Q180 "+(bottomY-10)+" 181 "+(bottomY+3)+" M237 "+(shoeTop+11)+" Q239 "+(bottomY-8)+" 241 "+(bottomY+4),tone(SH,-65),1.1,.45));
  } else {
    a.push(path("M174 "+(bottomY-5)+" L194 "+(bottomY-4)+" L199 "+(bottomY+10)+" Q184 "+(bottomY+5)+" 169 "+(bottomY+8)+" Z",tone(SH,-8),"none",0,'opacity=".65"'));
    a.push(path("M227 "+(bottomY-5)+" L244 "+(bottomY-4)+" L250 "+(bottomY+8)+" Q237 "+(bottomY+4)+" 224 "+(bottomY+9)+" Z",tone(SH,-8),"none",0,'opacity=".6"'));
    for (let y = 0; y < 3; y++) {
      a.push(line("M"+(177+y)+" "+(bottomY+y*4)+" L"+(194-y)+" "+(bottomY+1+y*4)+" M"+(229+y)+" "+(bottomY+1+y*4)+" L"+(244-y)+" "+(bottomY+y*4),tone(SH,-75),1.05,.58));
    }
    a.push(line("M153 "+(bottomY+10)+" Q165 "+(bottomY+6)+" 174 "+(bottomY+10)+" M248 "+(bottomY+8)+" Q254 "+(bottomY+11)+" 258 "+(bottomY+14),tone(SH,-65),.9,.45));
  }
  a.push(end);

  a.push('<g data-layer="top" filter="url(#garment-shadow)">');
  if (dress) {
    const hem = dress.style === "longdress" ? 501 : 448;
    const dressShape = [
      "M"+SL+" 227",
      "C165 222 176 219 187 216 L193 216 C200 226 220 226 227 216 L233 216 C246 219 263 222 "+SR+" 227",
      "C"+(SR+12)+" 229 "+(SR+21)+" 241 "+(SR+24)+" 256 L"+(SR+29)+" 280 Q"+(SR+16)+" 288 "+(SR+2)+" 283",
      "L"+(SR-9)+" 261 C"+(SR-4)+" 288 "+(WR+2)+" 306 "+(WR+5)+" 318",
      "C"+(WR+12)+" 355 "+(HR+24)+" "+(hem-32)+" "+(HR+36)+" "+hem,
      "Q210 "+(hem+18)+" "+(HL-36)+" "+hem,
      "C"+(HL-24)+" "+(hem-32)+" "+(HL-12)+" 355 "+(WL-5)+" 318",
      "C"+(SL+4)+" 296 "+(SL+4)+" 278 "+(SL+9)+" 261 L"+(SL-2)+" 283 Q"+(SL-16)+" 288 "+(SL-29)+" 280",
      "L"+(SL-24)+" 256 C"+(SL-21)+" 241 "+(SL-12)+" 229 "+SL+" 227 Z"
    ].join(" ");
    a.push(path(dressShape,"url(#dress-volume)",tone(D,-58),1.35));
    a.push(weave(dressShape));
    a.push(path("M"+(WL-3)+" 319 Q210 330 "+(WR+3)+" 319 L"+(WR+5)+" 327 Q210 338 "+(WL-5)+" 327 Z",tone(D,-24),"none",0,'opacity=".55"'));
    a.push(path("M"+(WL+5)+" 329 C186 363 "+(HL+5)+" "+(hem-28)+" "+(HL-12)+" "+(hem+4)+" L"+(HL+5)+" "+(hem+7)+" C"+(HL+18)+" "+(hem-29)+" 195 361 "+(WL+17)+" 329 Z",tone(D,-30),"none",0,'opacity=".2"'));
    a.push(path("M"+(WR-12)+" 329 C232 366 "+(HR-2)+" "+(hem-26)+" "+(HR+12)+" "+(hem+6)+" L"+(HR+25)+" "+(hem+2)+" C"+(HR+9)+" "+(hem-30)+" 242 362 "+(WR-1)+" 329 Z",tone(D,28),"none",0,'opacity=".14"'));
    a.push(line("M"+(WL+15)+" 333 C197 369 "+(HL+22)+" "+(hem-20)+" "+(HL+15)+" "+(hem+7)+" M210 335 C204 373 215 "+(hem-24)+" 210 "+(hem+12)+" M"+(WR-15)+" 333 C224 369 "+(HR-21)+" "+(hem-20)+" "+(HR-14)+" "+(hem+7),tone(D,-43),1.15,.35));
    a.push(line("M"+(HL-29)+" "+(hem-2)+" Q210 "+(hem+13)+" "+(HR+29)+" "+(hem-2),tone(D,48),1.1,.42));
    a.push(line("M"+(SL-27)+" 276 Q"+(SL-15)+" 284 "+(SL-3)+" 279 M"+(SR+3)+" 279 Q"+(SR+15)+" 284 "+(SR+27)+" 276",tone(D,-55),2,.5));
    a.push(path("M185 216 Q210 244 235 216 L229 223 Q210 239 191 223 Z",tone(D,-18),tone(D,-55),.9));
  } else {
    const isShirt = top?.style === "shirt";
    const isSweater = top?.style === "sweater";
    const longSleeve = isShirt || isSweater;
    const fill = top ? T : "#e6e7e2";
    const loose = isSweater ? 5 : isShirt ? 2 : 1;
    const torso = "M"+SL+" 227 C165 222 176 219 187 216 L193 216 C200 226 220 226 227 216 L233 216 C246 219 263 222 "+SR+" 227 L"+(SR-7)+" 248 C"+(SR-2)+" 273 "+(WR+6+loose)+" 309 "+(WR+5+loose)+" 342 Q210 352 "+(WL-5-loose)+" 342 C"+(WL-6-loose)+" 309 "+(SL+2)+" 273 "+(SL+7)+" 248 Z";
    const leftSleeve = longSleeve
      ? "M"+SL+" 227 C"+(SL-14)+" 228 "+(SL-24)+" 244 "+(SL-27)+" 265 C"+(SL-34)+" 294 137 327 129 355 L124 374 Q136 381 149 376 L155 351 C160 324 167 298 169 275 L"+(SL+10)+" 240 Z"
      : "M"+SL+" 227 C"+(SL-12)+" 228 "+(SL-21)+" 241 "+(SL-24)+" 256 L"+(SL-29)+" 278 Q"+(SL-16)+" 287 "+(SL-2)+" 282 L"+(SL+12)+" 258 L"+(SL+10)+" 239 Z";
    const rightSleeve = longSleeve
      ? "M"+SR+" 227 C"+(SR+14)+" 228 "+(SR+24)+" 244 "+(SR+27)+" 265 C"+(SR+34)+" 294 283 327 291 355 L296 374 Q284 381 271 376 L265 351 C260 324 253 298 251 275 L"+(SR-10)+" 240 Z"
      : "M"+SR+" 227 C"+(SR+12)+" 228 "+(SR+21)+" 241 "+(SR+24)+" 256 L"+(SR+29)+" 278 Q"+(SR+16)+" 287 "+(SR+2)+" 282 L"+(SR-12)+" 258 L"+(SR-10)+" 239 Z";
    a.push('<g data-part="left-sleeve" transform="' + leftArmPose + '">');
    a.push(path(leftSleeve,"url(#top-volume)",tone(fill,-58),1.3));
    a.push(weave(leftSleeve));
    if (isSweater) a.push(path(leftSleeve,"url(#knit-texture)","none",0));
    a.push(end);
    a.push('<g data-part="right-sleeve" transform="' + rightArmPose + '">');
    a.push(path(rightSleeve,"url(#top-volume)",tone(fill,-58),1.3));
    a.push(weave(rightSleeve));
    if (isSweater) a.push(path(rightSleeve,"url(#knit-texture)","none",0));
    a.push(end);
    a.push(path(torso,"url(#top-volume)",tone(fill,-58),1.3));
    a.push(weave(torso));
    if (isSweater) a.push(path(torso,"url(#knit-texture)","none",0));
    a.push(path("M"+(SL+8)+" 250 C158 278 "+(WL+3)+" 312 "+(WL-3)+" 340 L"+(WL+5)+" 341 C"+(WL+8)+" 309 166 279 "+(SL+16)+" 254 Z",tone(fill,-38),"none",0,'opacity=".18"'));
    a.push(path("M"+(SR-8)+" 250 C262 278 "+(WR-3)+" 312 "+(WR+3)+" 340 L"+(WR-5)+" 341 C"+(WR-8)+" 309 254 279 "+(SR-16)+" 254 Z",tone(fill,-34),"none",0,'opacity=".16"'));
    a.push(line("M"+(SL+4)+" 230 Q"+(SL+13)+" 242 "+(SL+13)+" 257 M"+(SR-4)+" 230 Q"+(SR-13)+" 242 "+(SR-13)+" 257",tone(fill,-55),1.05,.5));
    a.push(line("M"+(SL+2)+" 231 Q"+(SL+10)+" 241 "+(SL+11)+" 249 M"+(SR-2)+" 231 Q"+(SR-10)+" 241 "+(SR-11)+" 249",tone(fill,55),.85,.38));
    if (longSleeve) {
      a.push('<g data-part="left-sleeve-folds" transform="' + leftArmPose + '">');
      a.push(path("M130 348 Q141 354 155 348 L149 376 Q136 381 124 374 Z",tone(fill,-30),"none",0,'opacity=".18"'));
      a.push(line("M137 313 Q146 320 157 314 M133 327 Q143 335 153 328",tone(fill,-52),1.15,.42));
      a.push(line("M139 309 Q147 313 155 309",tone(fill,55),.9,.3));
      a.push(path("M125 363 Q137 369 152 363 L149 376 Q136 382 124 374 Z",tone(fill,isSweater?-24:-10),tone(fill,-55),.9));
      if (isShirt) a.push(circle(146,369,1.5,tone(fill,-65)));
      else for (let x = 130; x <= 146; x += 4) a.push(line("M"+x+" 367 L"+(x-1)+" 375",tone(fill,45),.7,.35));
      a.push(end);
      a.push('<g data-part="right-sleeve-folds" transform="' + rightArmPose + '">');
      a.push(path("M290 348 Q279 354 265 348 L271 376 Q284 381 296 374 Z",tone(fill,-30),"none",0,'opacity=".18"'));
      a.push(line("M283 313 Q274 320 263 314 M287 327 Q277 335 267 328",tone(fill,-52),1.15,.42));
      a.push(line("M281 309 Q273 313 265 309",tone(fill,55),.9,.3));
      a.push(path("M295 363 Q283 369 268 363 L271 376 Q284 382 296 374 Z",tone(fill,isSweater?-24:-10),tone(fill,-55),.9));
      if (isShirt) a.push(circle(274,369,1.5,tone(fill,-65)));
      else for (let x = 274; x <= 290; x += 4) a.push(line("M"+x+" 375 L"+(x+1)+" 367",tone(fill,45),.7,.35));
      a.push(end);
    } else {
      a.push('<g data-part="left-sleeve-folds" transform="' + leftArmPose + '">');
      a.push(path("M"+(SL-28)+" 276 Q"+(SL-15)+" 284 "+(SL-2)+" 279 L"+(SL-2)+" 283 Q"+(SL-16)+" 289 "+(SL-29)+" 281 Z",tone(fill,-7),"none",0,'opacity=".55"'));
      a.push(line("M"+(SL-27)+" 276 Q"+(SL-15)+" 284 "+(SL-3)+" 280",tone(fill,-55),.9,.45));
      a.push(line("M"+(SL-13)+" 248 Q"+(SL-3)+" 253 "+(SL+3)+" 264",tone(fill,-48),1.05,.32));
      a.push(end);
      a.push('<g data-part="right-sleeve-folds" transform="' + rightArmPose + '">');
      a.push(path("M"+(SR+2)+" 279 Q"+(SR+15)+" 284 "+(SR+28)+" 276 L"+(SR+29)+" 281 Q"+(SR+16)+" 289 "+(SR+2)+" 283 Z",tone(fill,-7),"none",0,'opacity=".55"'));
      a.push(line("M"+(SR+3)+" 280 Q"+(SR+15)+" 284 "+(SR+27)+" 276",tone(fill,-55),.9,.45));
      a.push(line("M"+(SR+13)+" 248 Q"+(SR+3)+" 253 "+(SR-3)+" 264",tone(fill,-48),1.05,.32));
      a.push(end);
    }
    a.push(line("M"+(SL+15)+" 270 Q174 274 183 286 M"+(SR-15)+" 270 Q246 274 237 286",tone(fill,-45),1.05,.3));
    a.push(line("M"+(WL+1)+" 324 Q190 316 201 329 M"+(WR-1)+" 324 Q230 316 219 329 M191 337 Q195 330 201 329 M229 337 Q225 330 219 329",tone(fill,-48),1.1,.38));
    a.push(line("M"+(WL+5)+" 322 Q192 318 199 325 M"+(WR-5)+" 322 Q228 318 221 325",tone(fill,55),.85,.3));
    if (isShirt) {
      a.push(path("M186 216 Q210 242 234 216 L229 229 Q210 250 191 229 Z",tone(fill,-37),"none",0,'opacity=".35"'));
      a.push(path("M186 216 L210 238 L199 253 Q186 243 176 225 Z",tone(fill,12),tone(fill,-55),1));
      a.push(path("M234 216 L210 238 L220 253 Q234 243 245 225 Z",tone(fill,8),tone(fill,-55),1));
      a.push(path("M209 248 L215 248 L216 344 L210 345 Z",tone(fill,-12),"none",0,'opacity=".5"'));
      a.push(line("M211 252 L212 343",tone(fill,-60),.9,.5));
      a.push(line("M215 252 L216 341",tone(fill,50),.7,.35));
      for (let y = 264; y < 335; y += 17) {
        a.push(circle(213,y,1.55,tone(fill,-68)));
        a.push(circle(212.5,y-.5,.45,tone(fill,45)));
      }
      a.push(line("M190 218 L207 238 M230 218 L213 238",tone(fill,55),.8,.45));
    } else {
      a.push(path("M185 216 Q210 244 235 216 L229 223 Q210 239 191 223 Z",tone(fill,isSweater?-25:-16),tone(fill,-55),.9));
      a.push(line("M190 219 Q210 239 230 219",tone(fill,45),.8,.45));
    }
    if (isSweater) {
      a.push(path("M"+(WL-6)+" 332 Q210 342 "+(WR+6)+" 332 L"+(WR+7)+" 345 Q210 355 "+(WL-7)+" 345 Z",tone(fill,-20),"none",0));
      for (let x = WL; x <= WR; x += 7) a.push(line("M"+x+" 338 L"+x+" 347",tone(fill,45),.7,.32));
    } else {
      a.push(path("M"+(WL-5)+" 339 Q210 349 "+(WR+5)+" 339 L"+(WR+5)+" 344 Q210 354 "+(WL-5)+" 344 Z",tone(fill,-12),"none",0,'opacity=".65"'));
      a.push(line("M"+(WL-3)+" 342 Q210 351 "+(WR+3)+" 342",tone(fill,-55),.9,.45));
    }
  }
  a.push(end);

  if (jacket) {
    const longCoat = jacket.style === "coat";
    const hem = longCoat ? 450 : 363;
    const pocketY = longCoat ? 384 : 332;
    const leftSleeve = "M"+SL+" 227 C"+(SL-15)+" 228 "+(SL-26)+" 244 "+(SL-29)+" 265 C"+(SL-35)+" 294 136 327 128 355 L123 372 Q135 380 150 375 L157 350 C162 323 169 298 171 275 L"+(SL+11)+" 240 Z";
    const rightSleeve = "M"+SR+" 227 C"+(SR+15)+" 228 "+(SR+26)+" 244 "+(SR+29)+" 265 C"+(SR+35)+" 294 284 327 292 355 L297 372 Q285 380 270 375 L263 350 C258 323 251 298 249 275 L"+(SR-11)+" 240 Z";
    const leftPanel = "M"+SL+" 227 L185 216 L201 247 L192 278 C188 316 187 "+(hem-18)+" 184 "+hem+" Q169 "+(hem+7)+" "+(WL-28)+" "+(hem+3)+" L"+(SL+12)+" 282 Z";
    const rightPanel = "M"+SR+" 227 L235 216 L219 247 L228 278 C232 316 233 "+(hem-18)+" 236 "+hem+" Q251 "+(hem+7)+" "+(WR+28)+" "+(hem+3)+" L"+(SR-12)+" 282 Z";
    a.push('<g data-layer="outer" filter="url(#garment-shadow)">');
    a.push('<g data-part="left-outer-sleeve" transform="' + leftArmPose + '">');
    a.push(path(leftSleeve,"url(#outer-volume)",tone(J,-62),1.35));
    a.push(weave(leftSleeve));
    a.push(end);
    a.push('<g data-part="right-outer-sleeve" transform="' + rightArmPose + '">');
    a.push(path(rightSleeve,"url(#outer-volume)",tone(J,-62),1.35));
    a.push(weave(rightSleeve));
    a.push(end);
    a.push(path(leftPanel,"url(#outer-volume)",tone(J,-62),1.35));
    a.push(path(rightPanel,"url(#outer-volume)",tone(J,-62),1.35));
    a.push(weave(leftPanel)); a.push(weave(rightPanel));
    a.push(path("M192 278 C184 318 180 "+(hem-12)+" 168 "+(hem+3)+" L"+(WL-28)+" "+(hem+3)+" L"+(SL+12)+" 282 L185 244 Z",tone(J,-34),"none",0,'opacity=".22"'));
    a.push(path("M228 278 C236 318 240 "+(hem-12)+" 252 "+(hem+3)+" L"+(WR+28)+" "+(hem+3)+" L"+(SR-12)+" 282 L235 244 Z",tone(J,22),"none",0,'opacity=".1"'));
    a.push(path("M185 216 L201 247 L190 266 L174 226 Z",tone(J,12),tone(J,-52),1));
    a.push(path("M235 216 L219 247 L230 266 L246 226 Z",tone(J,8),tone(J,-52),1));
    a.push(path("M201 247 L192 278 L185 252 L190 266 Z",tone(J,-34),"none",0,'opacity=".5"'));
    a.push(path("M219 247 L228 278 L235 252 L230 266 Z",tone(J,-30),"none",0,'opacity=".42"'));
    a.push(line("M185 218 L198 247 L189 262 M235 218 L222 247 L231 262",tone(J,55),.85,.4));
    a.push(line("M192 278 C188 320 187 "+(hem-14)+" 184 "+hem+" M228 278 C232 320 233 "+(hem-14)+" 236 "+hem,tone(J,-62),1.1,.7));
    a.push(line("M195 280 C192 320 191 "+(hem-14)+" 188 "+(hem-2)+" M225 280 C228 320 229 "+(hem-14)+" 232 "+(hem-2),tone(J,48),.75,.28));
    a.push('<g data-part="left-outer-folds" transform="' + leftArmPose + '">');
    a.push(line("M137 311 Q147 319 159 312 M132 327 Q143 335 154 328",tone(J,-48),1.2,.48));
    a.push(line("M140 306 Q149 311 157 306",tone(J,52),.9,.32));
    a.push(path("M124 362 Q136 368 153 362 L150 375 Q135 381 123 373 Z",tone(J,-22),tone(J,-58),.9));
    a.push(line("M127 366 Q137 371 150 367",tone(J,48),.8,.4));
    a.push(end);
    a.push('<g data-part="right-outer-folds" transform="' + rightArmPose + '">');
    a.push(line("M283 311 Q273 319 261 312 M288 327 Q277 335 266 328",tone(J,-48),1.2,.48));
    a.push(line("M280 306 Q271 311 263 306",tone(J,52),.9,.32));
    a.push(path("M296 362 Q284 368 267 362 L270 375 Q285 381 297 373 Z",tone(J,-22),tone(J,-58),.9));
    a.push(line("M293 366 Q283 371 270 367",tone(J,48),.8,.4));
    a.push(end);
    a.push(path("M"+(WL-9)+" "+pocketY+" L181 "+(pocketY+2)+" L178 "+(pocketY+15)+" L"+(WL-11)+" "+(pocketY+12)+" Z",tone(J,-15),tone(J,-52),.9));
    a.push(path("M239 "+(pocketY+2)+" L"+(WR+9)+" "+pocketY+" L"+(WR+11)+" "+(pocketY+12)+" L242 "+(pocketY+15)+" Z",tone(J,-12),tone(J,-52),.9));
    a.push(line("M"+(WL-8)+" "+(pocketY+3)+" L180 "+(pocketY+5)+" M240 "+(pocketY+5)+" L"+(WR+8)+" "+(pocketY+3),tone(J,55),.9,.5));
    a.push(line("M"+(SL+5)+" 232 Q"+(SL+14)+" 244 "+(SL+14)+" 260 M"+(SR-5)+" 232 Q"+(SR-14)+" 244 "+(SR-14)+" 260",tone(J,-55),1.05,.5));
    a.push(line("M"+(WL-23)+" "+(hem+1)+" Q169 "+(hem+4)+" 182 "+(hem-2)+" M238 "+(hem-2)+" Q251 "+(hem+4)+" "+(WR+23)+" "+(hem+1),tone(J,52),.9,.35));
    for (let y = 294; y < hem - 12; y += 31) {
      a.push(circle(229,y,1.8,tone(J,-70)));
      a.push(circle(228.5,y-.5,.5,tone(J,48)));
    }
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
