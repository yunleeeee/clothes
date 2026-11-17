import { normalizeColor, normalizeStyle, labelFor } from "./wardrobe.js";

export function garmentIllustration(item) {
  const fill = normalizeColor(item.color, "#aebbaa");
  const shift = amount => "#" + [1, 3, 5].map(i =>
    Math.max(0, Math.min(255, parseInt(fill.slice(i, i + 2), 16) + amount)).toString(16).padStart(2, "0")
  ).join("");
  const dark = shift(-45), light = shift(32), soft = shift(-16);
  const key = String(item.id || item.category).replace(/[^a-zA-Z0-9_-]/g, "");
  const volume = "url(#mini-volume-" + key + ")";
  const P = (d, color = volume, extra = "") =>
    '<path d="' + d + '" fill="' + color + '" stroke="' + dark + '" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round" ' + extra + '/>';
  const seam = (d, opacity = ".38") => '<path d="' + d + '" fill="none" stroke="' + light + '" stroke-width="1.25" stroke-linecap="round" opacity="' + opacity + '"/>';
  const texture = d => '<path d="' + d + '" fill="url(#mini-weave-' + key + ')"/>';
  const style = normalizeStyle(item.category, item.style);
  const art = [];
  art.push('<svg viewBox="0 0 180 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">');
  art.push('<defs><linearGradient id="mini-volume-' + key + '" x1="0" x2="1" y1="0" y2=".15"><stop stop-color="' + shift(-25) + '"/><stop offset=".22" stop-color="' + shift(13) + '"/><stop offset=".5" stop-color="' + fill + '"/><stop offset=".8" stop-color="' + shift(-8) + '"/><stop offset="1" stop-color="' + shift(-28) + '"/></linearGradient><pattern id="mini-weave-' + key + '" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 1H5M1 0V5" stroke="#fff" stroke-opacity=".07" stroke-width=".5"/><path d="M0 3H5M3 0V5" stroke="#172019" stroke-opacity=".04" stroke-width=".4"/></pattern><pattern id="mini-knit-' + key + '" width="7" height="9" patternUnits="userSpaceOnUse"><path d="M1 0L3.5 3L6 0M1 4.5L3.5 7.5L6 4.5" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width=".7"/></pattern><filter id="mini-depth-' + key + '" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#253026" flood-opacity=".16"/></filter></defs>');
  art.push('<g filter="url(#mini-depth-' + key + ')">');
  if (item.category === "top") {
    const longSleeve = style !== "tee";
    const shape = longSleeve
      ? "M48 33L71 27Q90 46 109 27L132 33Q146 41 152 60C149 84 146 109 143 130Q132 135 119 130L117 72C116 101 123 134 121 159Q90 167 58 159C59 134 64 101 63 72L60 130Q47 135 36 130C33 106 30 82 27 60Q34 41 48 33Z"
      : "M48 34L71 27Q90 45 109 27L132 34Q146 41 153 58L158 73Q147 82 135 84L124 68C121 96 124 130 123 158Q91 168 57 159C58 130 60 96 57 68L45 84Q32 82 22 73L28 56Q35 41 48 34Z";
    art.push(P(shape)); art.push(texture(shape));
    if (style === "sweater") art.push('<path d="' + shape + '" fill="url(#mini-knit-' + key + ')"/>');
    art.push(P("M71 28Q90 52 109 28L104 35Q90 51 76 35Z", soft));
    if (style === "shirt") {
      art.push(P("M71 28L90 49L82 62Q70 51 63 36Z", light));
      art.push(P("M109 28L90 49L99 62Q111 51 117 36Z", shift(20)));
      art.push(seam("M90 50Q91 104 91 159", ".55"));
      for (let y = 68; y < 153; y += 18) art.push('<circle cx="92" cy="' + y + '" r="1.5" fill="' + dark + '"/>');
    }
    if (longSleeve) {
      art.push(P("M35 118Q47 124 61 119L60 130Q47 135 36 130Z", soft));
      art.push(P("M119 119Q133 124 145 118L143 130Q132 135 119 130Z", soft));
      art.push(seam("M39 93Q48 99 60 94M121 94Q132 99 142 93M42 103Q50 108 59 104M122 104Q132 108 140 102", ".28"));
    } else {
      art.push(seam("M24 70Q34 77 46 78M134 78Q147 77 156 70", ".5"));
      art.push(seam("M34 53Q43 56 49 66M146 53Q137 56 131 66", ".25"));
    }
    art.push(seam("M65 79Q73 83 77 94M115 79Q107 83 103 94M63 139Q76 133 82 144M117 139Q104 133 98 144", ".24"));
    art.push(P("M58 151Q90 160 122 151L122 159Q90 168 57 159Z", soft, 'opacity=".55"'));
  } else if (item.category === "bottom") {
    if (style === "skirt") {
      const shape = "M54 25Q90 20 126 25C130 67 143 121 151 161Q90 181 29 161C37 121 50 67 54 25Z";
      art.push(P(shape)); art.push(texture(shape));
      art.push(P("M54 25Q90 20 126 25L126 38Q90 33 54 38Z", soft));
      art.push(seam("M66 42Q61 94 48 163M90 41Q84 99 90 170M114 42Q119 94 132 163", ".32"));
      art.push(seam("M34 157Q90 173 146 157", ".42"));
    } else if (style === "shorts") {
      const shape = "M52 25Q90 20 128 25L138 111Q120 121 101 112L90 76L80 112Q61 121 42 112Z";
      art.push(P(shape)); art.push(texture(shape));
      art.push(P("M42 102Q61 111 81 103L80 112Q61 121 42 112ZM100 103Q120 111 138 102L138 111Q120 121 101 112Z", soft));
      art.push(seam("M90 40V74M57 44Q67 50 72 65M123 44Q113 50 108 65M58 78Q69 83 80 79M101 79Q113 84 126 78", ".35"));
    } else {
      const shape = "M52 25Q90 20 128 25L134 78C137 106 140 135 141 159Q123 165 103 161L92 80L84 162Q63 167 41 159C44 129 49 96 46 55Z";
      art.push(P(shape)); art.push(texture(shape));
      art.push(P("M52 25Q90 20 128 25L129 38Q90 33 51 38Z", soft));
      art.push(seam("M91 40Q88 59 92 79M58 44Q69 49 74 63M122 44Q111 49 106 63", ".45"));
      art.push(seam("M47 105Q60 113 79 107M48 117Q61 122 79 116M103 109Q119 103 136 110M104 119Q120 113 137 120M46 146Q60 151 80 146M105 147Q121 142 137 148", ".26"));
      art.push(seam("M59 66Q62 91 59 119M121 66Q117 91 121 119", ".18"));
    }
  } else if (item.category === "outer") {
    const hem = style === "coat" ? 170 : 154;
    const left = "M47 32L74 24L87 49L80 82L78 " + hem + "Q61 " + (hem + 5) + " 45 " + hem + "L58 76L50 130Q38 135 25 130L28 60Q33 42 47 32Z";
    const right = "M133 32L106 24L93 49L100 82L102 " + hem + "Q119 " + (hem + 5) + " 135 " + hem + "L122 76L130 130Q142 135 155 130L152 60Q147 42 133 32Z";
    art.push(P(left)); art.push(P(right)); art.push(texture(left)); art.push(texture(right));
    art.push(P("M74 24L87 49L80 65L64 32Z", shift(12)));
    art.push(P("M106 24L93 49L100 65L116 32Z", shift(8)));
    art.push(seam("M87 51Q80 101 78 " + hem + "M93 51Q100 101 102 " + hem, ".5"));
    art.push(P("M26 119Q38 124 51 119L50 130Q38 135 25 130ZM129 119Q142 124 154 119L155 130Q142 135 130 130Z", soft));
    art.push(P("M51 105L73 106L71 120L49 118ZM107 106L129 105L131 118L109 120Z", soft));
    art.push(seam("M35 88Q44 94 54 89M126 89Q136 94 145 88M52 108L71 109M109 109L128 108", ".3"));
  } else if (item.category === "dress") {
    const hem = style === "longdress" ? 169 : 145;
    const shape = "M53 31L73 25Q90 43 107 25L127 31Q140 39 145 64Q137 75 126 78L117 65C115 88 120 104 127 120L151 " + hem + "Q90 " + (hem + 18) + " 29 " + hem + "L53 120C60 104 65 88 63 65L54 78Q43 75 35 64Q40 39 53 31Z";
    art.push(P(shape)); art.push(texture(shape));
    art.push(P("M72 26Q90 49 108 26L103 34Q90 48 77 34Z", soft));
    art.push(P("M54 91Q90 101 126 91L127 99Q90 109 53 99Z", soft, 'opacity=".6"'));
    art.push(seam("M65 105Q60 129 48 " + (hem + 4) + "M90 106Q84 134 90 " + (hem + 10) + "M115 105Q120 129 132 " + (hem + 4), ".32"));
    art.push(seam("M35 " + (hem - 3) + "Q90 " + (hem + 12) + " 145 " + (hem - 3), ".4"));
  } else if (item.category === "shoes") {
    const left = style === "boots" ? "M37 91L48 55Q59 51 70 58L81 105Q99 112 99 132L27 136Q18 119 37 91Z" : "M37 93L55 65L71 78L81 106Q99 112 99 132L27 136Q18 119 37 93Z";
    const right = style === "boots" ? "M109 91L120 55Q131 51 142 58L153 105Q171 112 171 132L100 136Q92 119 109 91Z" : "M109 93L127 65L142 78L153 106Q171 112 171 132L100 136Q92 119 109 93Z";
    art.push(P(left)); art.push(P(right));
    art.push(P("M25 125Q54 135 98 123L99 133Q61 143 27 137ZM99 124Q137 135 169 123L172 133Q140 142 100 137Z", soft));
    art.push(seam("M43 99L66 103M40 106L68 110M116 99L139 103M113 106L141 110M29 128Q60 136 94 127M104 128Q137 136 166 127", ".55"));
  } else if (style === "scarf") {
    const loop = "M63 65Q90 82 117 65L122 88Q90 108 58 88Z";
    const tail = "M99 91L116 87L110 153L92 148Z";
    art.push(P(loop)); art.push(P(tail)); art.push(texture(loop)); art.push(texture(tail));
    art.push(seam("M64 76Q90 94 117 76M101 103L113 101M99 117L112 115M96 139L109 141", ".4"));
  } else {
    art.push(P("M90 73Q37 25 25 69Q18 115 90 93Q163 115 155 69Q143 25 90 73Z"));
    art.push(P("M82 72Q90 65 98 72L99 91Q90 99 81 91Z", soft));
    art.push(seam("M36 63Q53 53 77 75M104 75Q128 53 145 63", ".4"));
  }
  art.push('</g></svg>');
  return art.join("");
}

function slotNode(category, item, options = {}) {
  const locked = Boolean(options.locked);
  const slot = document.createElement("div");
  slot.className = "flatlay-slot flatlay-" + category + (item ? " filled" : " empty") + (locked ? " locked" : "");
  slot.dataset.category = category;

  if (!item) {
    const hint = document.createElement("span");
    hint.className = "slot-placeholder";
    hint.textContent = labelFor(category);
    slot.append(hint);
    return slot;
  }

  const frame = document.createElement("div");
  frame.className = "slot-media";
  if (item.photo) {
    const img = document.createElement("img");
    img.src = item.photo;
    img.alt = item.name;
    img.className = item.cutout ? "cutout-photo" : "raw-photo";
    frame.append(img);
  } else {
    frame.innerHTML = garmentIllustration(item);
  }
  slot.append(frame);

  const meta = document.createElement("div");
  meta.className = "slot-meta";
  const name = document.createElement("span");
  name.className = "slot-name";
  name.textContent = item.name;
  meta.append(name);

  const actions = document.createElement("div");
  actions.className = "slot-actions";

  const lockBtn = document.createElement("button");
  lockBtn.type = "button";
  lockBtn.className = "slot-action" + (locked ? " is-locked" : "");
  lockBtn.title = locked ? "解锁此单品" : "锁定此单品（智能搭配时保留）";
  lockBtn.setAttribute("aria-label", locked ? "解锁" + item.name : "锁定" + item.name);
  lockBtn.setAttribute("aria-pressed", String(locked));
  lockBtn.textContent = locked ? "已锁定" : "锁定";
  lockBtn.onclick = e => {
    e.stopPropagation();
    options.onToggleLock?.(category);
  };

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "slot-action slot-remove";
  removeBtn.title = "脱下";
  removeBtn.setAttribute("aria-label", "脱下" + item.name);
  removeBtn.textContent = "×";
  removeBtn.onclick = e => {
    e.stopPropagation();
    options.onRemove?.(category);
  };

  actions.append(lockBtn, removeBtn);
  meta.append(actions);
  slot.append(meta);
  return slot;
}

export function renderLookbook(container, look = {}, items = [], options = {}) {
  const showGuides = options.showGuides !== false;
  const lockedSet = new Set(options.lockedCategories || []);
  const worn = Object.fromEntries(
    Object.entries(look).map(([category, id]) => [category, items.find(i => i.id === id)]).filter(([, v]) => Boolean(v))
  );

  const board = document.createElement("div");
  board.className = "flatlay-board" + (showGuides ? " with-guides" : "") + (worn.dress ? " is-dress" : "");
  board.dataset.engine = "lookbook";

  if (showGuides) {
    const guides = document.createElement("div");
    guides.className = "proportion-guides";
    guides.setAttribute("aria-hidden", "true");
    guides.innerHTML = [
      '<div class="guide-line guide-shoulder"><span>SHOULDER</span></div>',
      '<div class="guide-line guide-waist"><span>WAIST</span></div>',
      '<div class="guide-line guide-ankle"><span>ANKLE</span></div>'
    ].join("");
    board.append(guides);
  }

  const slotCategories = worn.dress
    ? ["outer", "dress", "accessory", "shoes"]
    : ["outer", "top", "accessory", "bottom", "shoes"];

  for (const cat of slotCategories) {
    board.append(slotNode(cat, worn[cat], {
      locked: lockedSet.has(cat),
      onToggleLock: options.onToggleLock,
      onRemove: options.onRemove
    }));
  }

  container.dataset.engine = "lookbook";
  container.replaceChildren(board);
}
