import { DEFAULT_PROFILE, normalizeColor } from "./wardrobe.js";

function itemFor(look,items,slot){return items.find(item=>item.id===look[slot]);}
function shape(d,fill,stroke="#6e625e",width=2.4,extra=""){
  return '<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linejoin="round" stroke-linecap="round" '+extra+'/>';
}
function rect(x,y,w,h,color,rx=0){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+color+'"/>';}
function circle(x,y,r,color){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+color+'"/>';}
function n(value){return Math.round(value*10)/10;}
export function renderAvatar(look={},items=[],values={}){
  const profile={...DEFAULT_PROFILE,...values};
  const skin=normalizeColor(profile.skin,DEFAULT_PROFILE.skin);
  const hair=normalizeColor(profile.hair,DEFAULT_PROFILE.hair);
  const s=n(41*profile.shoulders/100),w=n(28*profile.waist/100),h=n(36*profile.hips/100);
  const bottom=n(512+(profile.legs-100)*1.25);
  const left=n(180-h),right=n(180+h),shoulderL=n(180-s),shoulderR=n(180+s);
  const dress=itemFor(look,items,"dress");
  const top=dress?null:itemFor(look,items,"top");
  const bottomItem=dress?null:itemFor(look,items,"bottom");
  const outer=itemFor(look,items,"outer"),shoes=itemFor(look,items,"shoes"),accessory=itemFor(look,items,"accessory");
  const topColor=normalizeColor(top?.color,"#f2e5d1"),bottomColor=normalizeColor(bottomItem?.color,"#7c9eb2"),dressColor=normalizeColor(dress?.color,"#dca1aa");
  const outerColor=normalizeColor(outer?.color),shoesColor=normalizeColor(shoes?.color,"#f3eadd");
  const art=[];
  art.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 560" role="img" aria-label="二次元换装小人">');
  art.push('<defs><linearGradient id="skinlight" x1="0" x2="1"><stop stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="#b0776b" stop-opacity=".1"/></linearGradient><pattern id="knit" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 7 L9 -2" stroke="#fff" stroke-opacity=".18" stroke-width="2"/></pattern></defs>');
  // Hair behind the neck and shoulders.
  if(profile.hairStyle==="long") art.push(shape("M139 121 Q124 62 149 41 Q179 20 207 39 Q243 63 221 140 L232 285 Q181 300 130 281 Z",hair,"#574c48",2));
  else art.push(shape("M132 133 Q119 61 155 40 Q180 25 206 41 Q243 65 228 139 L216 169 Q179 181 144 163 Z",hair,"#574c48",2));
  // Feet and legs.
  art.push(shape("M"+(left+6)+" 327 L174 327 L173 "+(bottom-17)+" Q170 "+(bottom+1)+" 160 "+(bottom+1)+" L147 "+(bottom-13)+" L"+(left+3)+" 363 Z",skin));
  art.push(shape("M186 327 L"+(right-5)+" 327 L"+(right-3)+" 363 L210 "+(bottom-13)+" Q198 "+(bottom+4)+" 186 "+(bottom-8)+" L184 331 Z",skin));
  // Arms drawn before clothing.
  art.push(shape("M"+shoulderL+" 186 Q"+(shoulderL-18)+" 181 "+(shoulderL-21)+" 207 L"+(shoulderL-18)+" 307 Q"+(shoulderL-16)+" 334 "+(shoulderL-3)+" 349 Q"+(shoulderL+12)+" 352 "+(shoulderL+12)+" 336 L"+(shoulderL+9)+" 301 L"+(shoulderL+13)+" 220 Z",skin));
  art.push(shape("M"+shoulderR+" 186 Q"+(shoulderR+20)+" 181 "+(shoulderR+23)+" 207 L"+(shoulderR+18)+" 305 Q"+(shoulderR+17)+" 335 "+(shoulderR+4)+" 349 Q"+(shoulderR-11)+" 352 "+(shoulderR-12)+" 336 L"+(shoulderR-8)+" 301 L"+(shoulderR-12)+" 220 Z",skin));
  // Neck and base silhouette.
  art.push(shape("M169 150 L169 190 L191 190 L191 150 Z",skin));
  art.push(shape("M"+shoulderL+" 186 Q180 170 "+shoulderR+" 186 L"+(180+w)+" 282 L"+right+" 343 L"+left+" 343 L"+(180-w)+" 282 Z",skin));
  // Bottom clothing.
  if(!dress && bottomItem){
    if(bottomItem.style==="skirt"){
      art.push(shape("M"+(180-w-3)+" 289 L"+(180+w+3)+" 289 L"+(right+21)+" 389 Q180 404 "+(left-21)+" 389 Z",bottomColor));
      for(let i=-2;i<=2;i++) art.push(shape("M"+(180+i*12)+" 309 L"+(180+i*19)+" 388","none","#fff",1.1,'opacity=".23"'));
    }else if(bottomItem.style==="shorts"){
      art.push(shape("M"+(180-w-3)+" 292 L"+(180+w+3)+" 292 L"+(right+3)+" 368 L184 366 L179 335 L176 366 L"+(left-3)+" 368 Z",bottomColor));
    }else{
      art.push(shape("M"+(180-w-3)+" 290 L"+(180+w+3)+" 290 L"+(right+1)+" 344 L"+(right-4)+" "+(bottom-20)+" L188 "+(bottom-20)+" L181 345 L174 "+(bottom-20)+" L"+(left+4)+" "+(bottom-20)+" L"+(left-1)+" 344 Z",bottomColor));
      art.push(shape("M181 324 L181 "+(bottom-22),"none","#fff",1.2,'opacity=".25"'));
    }
  }else if(!dress) art.push(shape("M"+(180-w)+" 296 L"+(180+w)+" 296 L"+right+" 365 L188 365 L180 336 L172 365 L"+left+" 365 Z","#eee7df"));
  // Dresses appear over lower body.
  if(dress){
    const hem=dress.style==="longdress"?n(bottom-62):406;
    art.push(shape("M"+shoulderL+" 188 Q180 175 "+shoulderR+" 188 L"+(shoulderR+20)+" 267 L"+(shoulderR+6)+" 279 L"+(180+w)+" 271 L"+(right+32)+" "+hem+" Q180 "+(hem+18)+" "+(left-32)+" "+hem+" L"+(180-w)+" 271 L"+(shoulderL-6)+" 279 L"+(shoulderL-20)+" 267 Z",dressColor));
    art.push(shape("M"+(180-w)+" 275 Q180 283 "+(180+w)+" 275","none","#fff",2,'opacity=".28"'));
  } else {
    // Shirt and sleeves.
    const isShirt=top?.style==="shirt",isSweater=top?.style==="sweater";
    art.push(shape("M"+shoulderL+" 187 Q169 174 169 184 Q180 205 191 184 Q197 174 "+shoulderR+" 187 L"+(shoulderR+20)+" "+(isSweater?276:243)+" L"+(shoulderR+4)+" "+(isSweater?280:251)+" L"+(shoulderR-8)+" 224 L"+(180+w+4)+" 308 Q180 314 "+(180-w-4)+" 308 L"+(shoulderL+8)+" 224 L"+(shoulderL-5)+" "+(isSweater?280:251)+" L"+(shoulderL-20)+" "+(isSweater?276:243)+" Z",topColor));
    if(isSweater) art.push(shape("M"+(180-w-4)+" 299 Q180 306 "+(180+w+4)+" 299","none","#fff",3,'opacity=".35"'));
    if(isShirt){art.push(shape("M180 192 L180 307","none","#fff",2));for(let y=218;y<=283;y+=20)art.push(circle(180,y,1.9,"#f7f4ed"));}
  }
  // Coats go on top, with a center opening.
  if(outer){
    const long=outer.style==="coat",hem=long?390:319;
    art.push(shape("M"+shoulderL+" 186 L171 183 L164 205 L"+(180-w-8)+" "+hem+" L"+(left-5)+" "+hem+" L"+(shoulderL+5)+" 218 L"+(shoulderL-12)+" 290 L"+(shoulderL-29)+" 284 L"+(shoulderL-25)+" 211 Z",outerColor));
    art.push(shape("M"+shoulderR+" 186 L189 183 L196 205 L"+(180+w+8)+" "+hem+" L"+(right+5)+" "+hem+" L"+(shoulderR-5)+" 218 L"+(shoulderR+12)+" 290 L"+(shoulderR+29)+" 284 L"+(shoulderR+25)+" 211 Z",outerColor));
    art.push(shape("M171 184 L180 213 L168 232 L157 190","none","#fff",1.8,'opacity=".4"'));
  }
  // Shoes.
  art.push(shape("M150 "+(bottom-20)+" L176 "+(bottom-20)+" L177 "+(bottom+2)+" Q165 "+(bottom+14)+" 132 "+(bottom+7)+" Q128 "+(bottom+1)+" 140 "+(bottom-5)+" Z",shoesColor));
  art.push(shape("M184 "+(bottom-20)+" L210 "+(bottom-20)+" L220 "+(bottom-5)+" Q235 "+(bottom+5)+" 227 "+(bottom+9)+" Q198 "+(bottom+15)+" 184 "+(bottom+2)+" Z",shoesColor));
  art.push(shape("M132 "+(bottom+7)+" Q156 "+(bottom+13)+" 177 "+(bottom+2),"none","#fff",3));
  art.push(shape("M184 "+(bottom+2)+" Q206 "+(bottom+16)+" 228 "+(bottom+9),"none","#fff",3));
  // Face, ears, anime eyes and blush.
  art.push(circle(132,119,11,skin),circle(228,119,11,skin));
  art.push(shape("M137 98 Q133 61 157 53 Q186 38 212 59 Q234 79 223 131 Q217 166 180 177 Q143 166 137 132 Z",skin));
  art.push(circle(158,132,8,"#ebaaa8"),circle(202,132,8,"#ebaaa8"));
  art.push('<ellipse cx="159" cy="118" rx="9" ry="13" fill="#443c3c"/><ellipse cx="201" cy="118" rx="9" ry="13" fill="#443c3c"/>');
  art.push(circle(156,114,3.5,"#fff"),circle(198,114,3.5,"#fff"));
  art.push(shape("M147 100 Q158 93 168 102","none","#73534f",2.5));
  art.push(shape("M191 102 Q202 93 213 100","none","#73534f",2.5));
  art.push(shape("M175 146 Q180 152 185 146","none","#b36e6f",2.4));
  // Hair bangs and fringe.
  art.push(shape("M137 104 Q127 70 150 52 Q176 32 208 48 Q230 62 228 105 L217 99 L211 84 Q198 101 179 92 L159 74 Q157 99 137 104 Z",hair,"#574c48",2));
  art.push(shape("M174 51 Q171 74 159 86","none","#fff",2,'opacity=".15"'));
  if(profile.hairStyle==="bob") art.push(shape("M133 99 Q126 140 140 168 L150 160 Q141 141 145 113 Z M227 99 Q234 140 220 168 L210 160 Q219 141 215 113 Z",hair));
  if(accessory?.style==="bow"){
    const ac=normalizeColor(accessory.color,"#d7a0a6");
    art.push(shape("M204 72 Q235 53 230 81 L216 85 L237 94 Q229 111 206 88 Z",ac));
    art.push(circle(210,84,5,"#fff5ec"));
  }else if(accessory?.style==="scarf"){
    const ac=normalizeColor(accessory.color,"#cf9e93");
    art.push(shape("M164 177 Q180 190 196 177 L201 191 Q180 208 159 190 Z",ac));
    art.push(shape("M189 192 L205 198 L198 252 L187 250 Z",ac));
  }
  art.push('</svg>');
  return art.join("");
}
