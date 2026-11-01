(function(){
"use strict";
const CFG = window.APP_CONFIG || {};
const DEMO = !CFG.supabaseUrl || !CFG.supabaseAnonKey;
const sb = window.SB || (!DEMO && window.supabase ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null);
window.SB = sb;
const MODE = window.APP_MODE || "blog";
const ROOT_ID = window.APP_ROOT || "app";
const SITE = CFG.siteUrl || location.href.split("#")[0].split("?")[0];
const BUCKET = "media";

const S = { posts: [], reactions: {}, comments: {}, editor: false, session: null, wx: null, wxErr: false, lastShare: null, loading: true };

/* ---------- Helfer ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const d0 = () => { const n = new Date(); return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0"); };
const fmtDate = ts => { const d = new Date(ts); return d.toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"long"}) + ", " + d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) + " Uhr"; };
const mediaUrl = path => DEMO ? path : sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
const store = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} } };
function stopIndex(){ const t = d0(); if(t < STOPS[0].from) return -1; return STOPS.findIndex(s => t >= s.from && t <= s.to); }

/* ---------- Laden ---------- */
async function loadAll(){
  if(DEMO){ demoData(); S.loading = false; return; }
  const [p, r, c] = await Promise.all([
    sb.from("posts").select("*").order("created_at", {ascending:false}).limit(200),
    sb.from("reactions").select("post_id,emoji"),
    sb.from("comments").select("id,post_id,name,body,created_at").order("created_at", {ascending:true})
  ]);
  if(p.error) console.error(p.error);
  S.posts = p.data || [];
  S.reactions = {}; (r.data || []).forEach(x => { const o = S.reactions[x.post_id] = S.reactions[x.post_id] || {}; o[x.emoji] = (o[x.emoji]||0) + 1; });
  S.comments = {}; (c.data || []).forEach(x => (S.comments[x.post_id] = S.comments[x.post_id] || []).push(x));
  S.loading = false;
}
async function checkEditor(){
  if(DEMO){ S.editor = new URLSearchParams(location.search).has("editor"); return; }
  const { data } = await sb.auth.getSession(); S.session = data.session;
  if(!S.session){ S.editor = false; return; }
  const { data: ok } = await sb.rpc("is_editor"); S.editor = !!ok;
}
async function loadWeather(){
  const L = WXLOC;
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + L.map(l => l.lat).join(",") + "&longitude=" + L.map(l => l.lon).join(",") +
    "&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_gusts_10m_max&timezone=auto&forecast_days=6";
  try{ const r = await fetch(url); if(!r.ok) throw 0; const j = await r.json(); S.wx = (Array.isArray(j) ? j : [j]).map((x,i) => ({...L[i], ...x})); S.wxErr = false; }
  catch(e){ S.wxErr = true; }
}
const WMO = {0:["☀️","Klar"],1:["🌤️","Überwiegend klar"],2:["⛅","Teils bewölkt"],3:["☁️","Bedeckt"],45:["🌫️","Nebel"],48:["🌫️","Raureifnebel"],51:["🌦️","Leichter Niesel"],53:["🌦️","Niesel"],55:["🌧️","Starker Niesel"],56:["🌧️","Gefrierender Niesel"],57:["🌧️","Gefrierender Niesel"],61:["🌧️","Leichter Regen"],63:["🌧️","Regen"],65:["🌧️","Starker Regen"],66:["🌧️","Gefrierender Regen"],67:["🌧️","Gefrierender Regen"],71:["🌨️","Leichter Schneefall"],73:["🌨️","Schneefall"],75:["❄️","Starker Schneefall"],77:["🌨️","Schneegriesel"],80:["🌦️","Regenschauer"],81:["🌧️","Regenschauer"],82:["⛈️","Heftige Schauer"],85:["🌨️","Schneeschauer"],86:["❄️","Starke Schneeschauer"],95:["⛈️","Gewitter"],96:["⛈️","Gewitter mit Hagel"],99:["⛈️","Gewitter mit Hagel"]};

function loginErrorText(error){
  const m = (error && (error.message || error.msg || "")) + "";
  if(/rate limit|too many|seconds/i.test(m)) return "Zu viele Anmelde-Mails in kurzer Zeit. Supabase erlaubt nur wenige pro Stunde. Bitte später erneut versuchen oder den letzten Link aus dem Postfach nutzen.";
  if(/signups? not allowed|not found|user not/i.test(m)) return "Diese Adresse ist in Supabase nicht als Nutzer angelegt (Authentication → Users).";
  if(/redirect/i.test(m)) return "Die Weiterleitungs-Adresse ist in Supabase nicht erlaubt (URL Configuration → Redirect URLs).";
  return "Anmeldung fehlgeschlagen: " + m;
}
window.loginErrorText = loginErrorText;
/* ---------- Render ---------- */
function render(){
  if(MODE === "studio") return renderStudioOnly();
  const si = stopIndex();
  const lastStatus = S.posts.find(p => p.status);
  const daysTo = Math.ceil((new Date(2026,10,13) - new Date(new Date().toDateString()))/864e5);
  let statusHtml = "";
  if(lastStatus) statusHtml = `<div class="card status"><span class="dot" aria-hidden="true"></span><div><span class="small muted">Letztes Lebenszeichen · ${esc(fmtDate(lastStatus.created_at))} · ${esc(lastStatus.place)}</span><b>${esc(lastStatus.status)}</b></div></div>`;
  else if(daysTo > 0) statusHtml = `<div class="card status"><span class="dot" aria-hidden="true"></span><div><span class="small muted">Noch ${daysTo} ${daysTo === 1 ? "Tag" : "Tage"} bis zum Abflug</span><b>Die Rucksäcke werden gepackt</b></div></div>`;
  $(ROOT_ID).innerHTML = `
  ${DEMO ? '<div class="demo">Vorschau ohne Datenbank: Beiträge sind Beispiele. Nach der Einrichtung verschwindet dieser Hinweis.</div>' : ""}
  <header class="hero"><div class="col">
    <div class="eyebrow">13.–30. November 2026</div>
    <h1>Victor &amp; Felix <span>in Patagonien</span></h1>
    <p>Vom Ende der Welt in Ushuaia über den Perito-Moreno-Gletscher bis acht Tage zu Fuß rund um die Torres del Paine. Hier posten wir, wann immer wir Netz haben.</p>
  </div></header>
  <main class="col">
    ${S.editor ? studioHtml() : ""}
    ${statusHtml}
    <section class="card" aria-labelledby="h-route"><h2 id="h-route">Wo sind wir gerade?</h2>
      <ol class="route">${STOPS.map((s,i) => `<li class="${i < si ? "done" : i === si ? "now" : ""}"><span class="pin" aria-hidden="true"></span><div><div class="nm">${esc(s.nm)}${i === si ? '<span class="tag">Hier sind wir</span>' : ""}${s.tag && i !== si ? `<span class="tag">${esc(s.tag)}</span>` : ""}</div><div class="ds">${esc(s.ds)}</div></div><span class="dt">${s.dt}</span></li>`).join("")}</ol>
      <p class="small muted" style="margin:4px 0 0">Vom 18. bis 26.11. sind wir im Nationalpark und haben kaum Empfang. Keine Nachricht ist dann eine gute Nachricht.</p>
    </section>
    <section aria-labelledby="h-feed" style="display:grid;gap:16px"><h2 id="h-feed">Neues von unterwegs</h2>
      ${S.loading ? '<p class="muted">Lädt …</p>' : S.posts.length ? S.posts.map(postHtml).join("") : `<div class="card empty"><h3 style="font-size:1.5rem">Bald geht's los</h3><p class="muted" style="margin:6px 0 0">Am 13.11. heben wir ab. Die ersten Fotos kommen aus Ushuaia.</p></div>`}
    </section>
    ${wxHtml(si)}
    <section class="card" aria-labelledby="h-map"><h2 id="h-map">Die Reise auf der Karte</h2>${mapSvg()}
      <div class="legend"><span><i></i>Flug</span><span><i class="d"></i>Auto über die Grenze nach Chile</span></div></section>
    <section class="card" aria-labelledby="h-trek"><h2 id="h-trek">Die Wanderung Tag für Tag</h2>
      <p class="small muted" style="margin:4px 0 6px">Der „O-Circuit“ einmal rund um das Paine-Massiv, gegen den Uhrzeigersinn. Insgesamt rund 115 Kilometer.</p>${trekHtml()}</section>
    <section aria-labelledby="h-places" style="display:grid;gap:12px"><h2 id="h-places">Orte für Neugierige</h2>
      <div class="places">${PLACEINFO.map(pl => `<article class="card place"><h3>${esc(pl.nm)}</h3><div class="when">${esc(pl.when)}</div><p>${esc(pl.p)}</p><div class="fact"><b>Wussten Sie schon?</b> ${esc(pl.f)}</div></article>`).join("")}</div></section>
    <section aria-labelledby="h-crew" style="display:grid;gap:12px"><h2 id="h-crew">Die Crew</h2>
      <div class="crew">${["felix","victor"].map(k => `<div class="card mate"><img src="${PEOPLE[k].img}" alt="${PEOPLE[k].name}"><div><span class="nick">${esc(PEOPLE[k].nick)}</span><b>${PEOPLE[k].name}</b><span class="small muted">${esc(PEOPLE[k].bio)}</span></div></div>`).join("")}</div></section>
  </main>
  <footer class="col">Mit Liebe aus Patagonien · Victor &amp; Felix
    <div class="team">${S.editor ? `<div class="small" style="text-align:center">Angemeldet als ${esc(S.session?.user?.email || "Redaktion")}</div><a class="teambtn" href="cockpit.html" style="text-decoration:none">Zum Cockpit</a><button class="teambtn" type="button" id="logout">Abmelden</button>`
      : `<button class="teambtn" type="button" id="loginToggle" aria-expanded="false" aria-controls="loginForm">Anmelden für Victor &amp; Felix</button>
         <form class="login" id="loginForm" hidden><label class="small" for="loginEmail">Deine E-Mail-Adresse</label><input type="email" id="loginEmail" required placeholder="name@beispiel.de" autocomplete="email" inputmode="email"><button class="btn" type="submit">Anmelde-Link schicken</button><div class="msg" id="loginMsg" aria-live="polite"></div></form>`}</div>
  </footer>`;
  bind();
}
function renderStudioOnly(){
  const root = $(ROOT_ID); if(!root) return;
  root.innerHTML = S.editor ? studioHtml() + `<h2 id="h-feed" style="margin-top:8px">Eure letzten Posts</h2>` + (S.posts.length ? S.posts.slice(0,15).map(postHtml).join("") : '<p class="muted">Noch keine Posts.</p>')
    : '<div class="card"><p>Bitte zuerst anmelden.</p></div>';
  bind();
}
function postHtml(p){
  const who = PEOPLE[p.author] || PEOPLE.victor;
  const media = p.media || [];
  const n = media.length, cls = n === 1 ? "n1" : n === 3 ? "n3" : "";
  const rx = S.reactions[p.id] || {};
  const cms = S.comments[p.id] || [];
  return `<article class="card post" id="post-${esc(p.id)}">
    <div class="by"><img src="${who.img}" alt=""><div><b>${who.name}</b><span class="small muted">${esc(p.place)} · ${esc(fmtDate(p.created_at))}</span></div>
      ${S.editor ? `<button class="btn danger" type="button" data-del="${esc(p.id)}" style="margin-left:auto">Löschen</button>` : ""}</div>
    ${p.status ? `<div class="st">● ${esc(p.status)}</div>` : ""}
    ${p.body ? `<p class="txt">${esc(p.body)}</p>` : ""}
    ${n ? `<div class="media ${cls}">${media.map((m,i) => m.type && m.type.startsWith("video/")
        ? `<video src="${esc(mediaUrl(m.path))}" controls playsinline preload="none"></video>`
        : `<button type="button" data-lb="${esc(mediaUrl(m.path))}" aria-label="Foto ${i+1} groß anzeigen"><img src="${esc(mediaUrl(m.thumb || m.path))}" alt="Foto von ${who.name}, ${esc(p.place)}" loading="lazy"></button>`).join("")}</div>` : ""}
    <div class="react" role="group" aria-label="Reaktionen">${REACTIONS.map(e => { const mine = store.get("rx:"+p.id+":"+e); return `<button type="button" class="${mine ? "mine" : ""}" data-rx="${esc(p.id)}" data-emoji="${e}" aria-label="${e} Reaktion">${e} ${rx[e] ? rx[e] : ""}</button>`; }).join("")}
      ${S.editor ? `<button type="button" class="btn wa small" data-share="${esc(p.id)}" style="margin-left:auto">Per WhatsApp teilen</button>` : ""}</div>
    <div class="comments">
      ${cms.map(c => `<div class="cm"><b>${esc(c.name)}</b> ${esc(c.body)} <span class="muted">${esc(new Date(c.created_at).toLocaleDateString("de-DE",{day:"numeric",month:"numeric"}))}</span>${S.editor ? ` <button class="btn danger" type="button" data-delc="${c.id}" style="padding:0 6px">×</button>` : ""}</div>`).join("")}
      <form class="cform" data-cform="${esc(p.id)}"><input name="name" placeholder="Dein Name" maxlength="40" required value="${esc(store.get("cname") || "")}" aria-label="Dein Name"><input name="body" placeholder="Schreib den beiden was Liebes …" maxlength="500" required aria-label="Kommentar"><input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px"><button class="btn small" type="submit">Senden</button></form>
    </div>
  </article>`;
}
function studioHtml(){
  const saver = store.get("saver") !== "0";
  return `<section class="card studio" aria-labelledby="h-studio"><h2 id="h-studio">Neuer Post</h2>
    <p class="small muted" style="margin:4px 0 0">Nur für euch beide sichtbar. Posts werden im Hintergrund hochgeladen und bei schlechtem Netz automatisch wiederholt, auch nach dem Schließen der Seite.</p>
    <div id="outbox"></div>
    <form id="postForm">
      <div class="row2">
        <label>Wer postet?<select id="pAuthor"><option value="victor">Victor</option><option value="felix" ${store.get("author") === "felix" ? "selected" : ""}>Felix</option></select></label>
        <label>Wo?<select id="pPlace">${PLACES.map(p => `<option ${p === store.get("place") ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></label>
      </div>
      <div class="quick pingrow"><span class="small muted">Nur kurzes Lebenszeichen (wenige Bytes):</span>
        <button type="button" class="btn ghost small" data-ping="Alles gut, uns geht's prima">Alles gut</button>
        <button type="button" class="btn ghost small" data-ping="Kein Netz für die nächsten Tage">Kein Netz</button>
        <button type="button" class="btn ghost small" data-ping="Müde, aber glücklich">Müde & glücklich</button></div>
      <label>Lebenszeichen<select id="pStatus">${STATUSES.map(s => `<option value="${esc(s)}">${s ? esc(s) : "(keins)"}</option>`).join("")}</select></label>
      <label>Text<textarea id="pText" maxlength="4000" placeholder="Was habt ihr heute erlebt?"></textarea></label>
      <label>Fotos oder Videos (bis zu 8)<input id="pMedia" type="file" accept="image/*,video/*" multiple></label>
      <label class="chk"><input type="checkbox" id="pSaver" ${saver ? "checked" : ""}> Sparmodus: kleinere Fotos, ideal bei schwachem Netz</label>
      <div class="previews" id="pPrev"></div>
      <div><button class="btn" type="submit" id="pSubmit">Veröffentlichen</button></div>
      <div class="msg" id="pMsg" aria-live="polite"></div>
    </form></section>`;
}
function wxHtml(si){
  const cur = si >= 0 ? STOPS[si].key : "";
  if(S.wxErr) return `<section class="card"><h2>Wetter bei den Jungs</h2><p class="muted small">Das Wetter lässt sich gerade nicht laden.</p></section>`;
  if(!S.wx) return "";
  const fmt = d => { const [y,m,dd] = d.split("-"); return `${+dd}.${+m}.`; };
  return `<section class="card" aria-labelledby="h-wx"><h2 id="h-wx">Wetter bei den Jungs</h2><p class="small muted" style="margin:2px 0 4px">Live-Vorhersage, Ortszeit vor Ort</p>
    ${S.wx.map(p => { const c = p.current || {}; const dl = p.daily || {}; const w = WMO[c.weather_code] || ["🌡️",""];
      return `<div class="wxrow ${p.key === cur ? "cur" : ""}"><span class="ic" aria-hidden="true">${w[0]}</span>
        <div><b>${esc(p.name)}</b>${p.key === cur ? '<span class="tag">Hier sind sie</span>' : ""}<div class="small muted">${esc(w[1])}${c.wind_gusts_10m != null ? ` · Böen ${Math.round(c.wind_gusts_10m)} km/h` : ""}${dl.precipitation_probability_max ? ` · Regen ${dl.precipitation_probability_max[0]} %` : ""}</div></div>
        <div class="t">${c.temperature_2m != null ? Math.round(c.temperature_2m) : "–"}°<small> ${dl.temperature_2m_max ? Math.round(dl.temperature_2m_max[0]) + "/" + Math.round(dl.temperature_2m_min[0]) + "°" : ""}</small></div>
        <div class="days">${(dl.time || []).slice(1,6).map((t,i) => `<span>${fmt(t)} ${(WMO[dl.weather_code[i+1]]||["",""])[0]} ${Math.round(dl.temperature_2m_max[i+1])}°/${Math.round(dl.temperature_2m_min[i+1])}°</span>`).join("")}</div></div>`; }).join("")}
    <p class="small muted" style="margin:6px 0 0">Wetterdaten: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a></p></section>`;
}
function mapSvg(){
  const P = MAP.pts;
  const lbl = (k,t,dx,dy,anchor) => `<circle cx="${P[k][0]}" cy="${P[k][1]}" r="6" fill="var(--trail)" stroke="var(--surface)" stroke-width="2"/><text x="${P[k][0]+dx}" y="${P[k][1]+dy}" font-size="16" text-anchor="${anchor||"start"}">${t}</text>`;
  const curve = (a,b,bend) => { const [x1,y1]=P[a],[x2,y2]=P[b]; return `M${x1},${y1} Q${(x1+x2)/2+bend},${(y1+y2)/2} ${x2},${y2}`; };
  return `<svg class="map" viewBox="0 0 ${MAP.W} ${MAP.H}" role="img" aria-label="Karte von Argentinien und Chile mit der Reiseroute">
    ${Object.entries(MAP.paths).filter(([n,d]) => d.length > 5).map(([n,d]) => `<path class="${n==="Argentina"?"land":n==="Chile"?"land chile":"other"}" d="${d}"/>`).join("")}
    <text x="110" y="190" font-size="18" style="fill:var(--accent);opacity:.7;letter-spacing:3px">ARGENTINIEN</text>
    <text x="30" y="200" font-size="15" style="fill:var(--trail);opacity:.8;letter-spacing:3px" transform="rotate(-82 30 200)">CHILE</text>
    <path class="fly" d="${curve("ba","ush",-70)}"/><path class="fly" d="${curve("ush","cal",-15)}"/><path class="fly" d="${curve("cal","ba",40)}"/>
    <path class="drive" d="M${P.cal[0]},${P.cal[1]} L${P.tdp[0]},${P.tdp[1]}"/>
    ${lbl("ba","Buenos Aires",-10,-12,"end")}${lbl("ush","Ushuaia",10,5)}${lbl("cal","El Calafate",10,-4)}${lbl("tdp","Torres del Paine",8,22)}</svg>`;
}
function trekHtml(){
  const t = d0();
  return TREK.map(s => { const [dd,mm] = s.d.split("."); const iso = `2026-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
    return `<div class="stage ${iso === t ? "now" : ""}"><div class="dd">${s.d}<span>${s.wd}</span></div><div><b>${esc(s.t)}</b>${iso === t ? '<span class="tag">Heute</span>' : ""}${s.key ? '<span class="tag red">Königsetappe</span>' : ""}<div class="km">${String(s.km).replace(".",",")} km · ${s.h}</div><div class="small">${esc(s.x)}</div></div></div>`; }).join("");
}

/* ---------- Medien, Warteschlange & Teilen ---------- */
let pending = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtKB = n => n > 1048576 ? (n/1048576).toFixed(1).replace(".",",") + " MB" : Math.max(1, Math.round(n/1024)) + " KB";
function scaleImage(file, max, q){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { let w = img.naturalWidth, h = img.naturalHeight; const r = Math.min(1, max/Math.max(w,h)); w = Math.round(w*r); h = Math.round(h*r);
      const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img,0,0,w,h); URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej(new Error("Bild")), "image/jpeg", q); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Bild nicht lesbar")); };
    img.src = url;
  });
}
async function prepareFile(f, saver){
  if(f.type.startsWith("video/")) return { name: f.name, type: f.type || "video/mp4", full: f, thumb: null };
  const full = await scaleImage(f, saver ? 1280 : 1800, saver ? 0.62 : 0.76);
  const thumb = await scaleImage(f, 640, 0.6);
  return { name: (f.name.replace(/\.[^.]+$/,"") || "foto") + ".jpg", type: "image/jpeg", full, thumb };
}
/* IndexedDB: Posts überleben Funklöcher und das Schließen der Seite */
const IDB = {
  db: null,
  open(){ return this.db || (this.db = new Promise((res, rej) => { const r = indexedDB.open("patagonien", 1); r.onupgradeneeded = () => r.result.createObjectStore("outbox", {keyPath:"id"}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async tx(mode, fn){ const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction("outbox", mode); const s = t.objectStore("outbox"); const out = fn(s); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }); },
  all(){ return this.tx("readonly", s => s.getAll()); },
  put(item){ return this.tx("readwrite", s => s.put(item)); },
  del(id){ return this.tx("readwrite", s => s.delete(id)); }
};
let outbox = [], outboxBusy = false, outboxNote = "";
async function loadOutbox(){ try{ outbox = await IDB.all() || []; }catch(e){ outbox = []; } }
function withTimeout(promise, ms){ return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("Zeitüberschreitung")), ms))]); }
async function uploadOnce(path, blob, type){
  if(DEMO){ await sleep(300); return; }
  const r = await withTimeout(sb.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false, cacheControl: "31536000" }), Math.max(45000, blob.size / 12));
  if(r.error && !/exist|duplicate/i.test(r.error.message || "")) throw r.error;
}
async function processOutbox(){
  if(outboxBusy || !outbox.length || !S.editor) return;
  if(navigator.onLine === false){ outboxNote = "Kein Netz. Sobald wieder Empfang da ist, geht es automatisch weiter."; renderOutbox(); return; }
  outboxBusy = true;
  for(const item of [...outbox]){
    try{
      for(const [i,f] of item.files.entries()){
        if(f.thumb && !f.thumbPath){ outboxNote = `Vorschau ${i+1}/${item.files.length} …`; renderOutbox(); const tp = `${item.id}/${i+1}-t.jpg`; await uploadOnce(tp, f.thumb, "image/jpeg"); f.thumbPath = tp; await IDB.put(item); }
        if(!f.path){ outboxNote = `Datei ${i+1}/${item.files.length} (${fmtKB(f.full.size)}) …`; renderOutbox(); const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g,"") || "bin"; const pth = `${item.id}/${i+1}.${ext}`; await uploadOnce(pth, f.full, f.type); f.path = pth; await IDB.put(item); }
      }
      outboxNote = "Speichere Post …"; renderOutbox();
      const post = { id: item.id, author: item.author, place: item.place, status: item.status, body: item.body, media: item.files.map(f => ({ path: DEMO ? URL.createObjectURL(f.full) : f.path, thumb: DEMO ? (f.thumb ? URL.createObjectURL(f.thumb) : null) : (f.thumbPath || null), type: f.type })) };
      let saved = { ...post, created_at: new Date().toISOString() };
      if(!DEMO){ const { data, error } = await withTimeout(sb.from("posts").upsert(post, { onConflict: "id" }).select().single(), 30000); if(error) throw error; saved = data; }
      await IDB.del(item.id); outbox = outbox.filter(x => x.id !== item.id);
      if(!S.posts.some(x => x.id === saved.id)) S.posts.unshift(saved);
      S.lastShare = { files: item.files.map((f,i) => new File([f.full], `patagonien-${i+1}.${(f.type.split("/")[1]||"jpg").replace("quicktime","mov")}`, { type: f.type })), text: shareText(post) };
      outboxNote = "";
      const form = $("postForm"); const busy = form && ($("pText").value || pending.length);
      if(busy){ renderOutbox(); refreshFeed(); } else render();
    }catch(err){
      console.warn(err); item.tries = (item.tries || 0) + 1; await IDB.put(item).catch(() => {});
      outboxNote = "Netz zu schwach, neuer Versuch in Kürze …"; renderOutbox();
      outboxBusy = false; setTimeout(processOutbox, Math.min(120000, 10000 * item.tries)); return;
    }
  }
  outboxBusy = false; renderOutbox();
}
function renderOutbox(){
  const el = $("outbox"); if(!el) return;
  const ls = S.lastShare;
  el.innerHTML = `${outbox.map(it => { const done = it.files.filter(f => f.path).length; const size = it.files.reduce((n,f) => n + (f.path ? 0 : f.full.size) + (f.thumb && !f.thumbPath ? f.thumb.size : 0), 0);
      return `<div class="sharebox" style="margin-top:10px;background:var(--bg);border-color:var(--trail)"><b>Wird hochgeladen: ${esc(it.place)}${it.body ? " · " + esc(it.body.slice(0,40)) : ""}</b>
        <span class="small">${it.files.length ? `${done} von ${it.files.length} Dateien fertig · noch ${fmtKB(size)}` : "nur Text"}${it.tries ? ` · Versuch ${it.tries + 1}` : ""}</span>
        <span class="small muted">${esc(outboxNote)}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small" data-retry>Jetzt erneut versuchen</button><button type="button" class="btn danger" data-drop="${esc(it.id)}">Verwerfen</button></div></div>`; }).join("")}
    ${ls ? `<div class="sharebox" style="margin-top:10px"><b>Veröffentlicht! Jetzt an eure WhatsApp-Broadcast-Liste schicken:</b>
      <button type="button" class="btn wa" id="shareLast">Per WhatsApp teilen</button>
      <span class="small muted">WhatsApp wählen, dann eure Broadcast-Liste. Der Text liegt auch in der Zwischenablage. Tipp bei schwachem Netz: WhatsApp verschickt die Nachricht von selbst, sobald wieder Empfang da ist.</span></div>` : ""}`;
  el.querySelectorAll("[data-retry]").forEach(b => b.addEventListener("click", () => { outboxBusy = false; processOutbox(); }));
  el.querySelectorAll("[data-drop]").forEach(b => b.addEventListener("click", async () => { if(b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "Wirklich verwerfen?"; return; } await IDB.del(b.dataset.drop).catch(() => {}); outbox = outbox.filter(x => x.id !== b.dataset.drop); renderOutbox(); }));
  const sl = $("shareLast"); if(sl) sl.addEventListener("click", () => doShare(S.lastShare.files, S.lastShare.text, $("pMsg")));
}
function refreshFeed(){ if(MODE === "studio"){ const f = $("pText"); const keep = f ? f.value : ""; renderStudioOnly(); if($("pText")) $("pText").value = keep; return; } const f = $("h-feed"); if(!f) return; const sec = f.parentElement; sec.innerHTML = `<h2 id="h-feed">Neues von unterwegs</h2>` + S.posts.map(postHtml).join(""); bind(); }
async function queuePost(item){
  outbox.push(item);
  try{ await IDB.put(item); }catch(e){ outboxNote = "Achtung: Zwischenspeichern auf dem Handy nicht möglich, Seite bis zum Ende offen lassen."; }
  renderOutbox(); processOutbox();
}
function shareText(p){
  const who = (PEOPLE[p.author] || PEOPLE.victor).name;
  return [`${who} aus ${p.place}${p.status ? " · " + p.status : ""}`, p.body || "", `Mehr Fotos und unsere Route: ${SITE}`].filter(Boolean).join("\n\n");
}
async function doShare(files, text, msgEl){
  try{ await navigator.clipboard.writeText(text); }catch(e){}
  const data = files.length ? {files, text} : {text};
  if(navigator.share && (!files.length || (navigator.canShare && navigator.canShare({files})))){
    try{ await navigator.share(data); return; }catch(e){ if(e && e.name === "AbortError") return; }
  }
  if(msgEl) msgEl.textContent = "Dieses Gerät kann Bilder nicht direkt teilen. Es öffnet sich WhatsApp mit dem Text, das Foto bitte dort anhängen.";
  location.href = "https://wa.me/?text=" + encodeURIComponent(text);
}
async function filesForPost(p){
  const out = [];
  for(const [i,m] of (p.media||[]).entries()){
    try{ const r = await fetch(mediaUrl(m.path)); const b = await r.blob(); const ext = (m.type||"").split("/")[1] || "jpg"; out.push(new File([b], `patagonien-${i+1}.${ext}`, {type: m.type || b.type})); }catch(e){}
  }
  return out;
}

/* ---------- Aktionen ---------- */
function bind(){
  document.querySelectorAll("[data-lb]").forEach(b => b.addEventListener("click", () => { $("lbImg").src = b.dataset.lb; $("lb").classList.add("on"); $("lbClose").focus(); }));
  document.querySelectorAll("[data-rx]").forEach(b => b.addEventListener("click", async () => {
    const id = b.dataset.rx, e = b.dataset.emoji, k = "rx:"+id+":"+e;
    if(store.get(k)) return;
    store.set(k, "1"); const o = S.reactions[id] = S.reactions[id] || {}; o[e] = (o[e]||0) + 1; render();
    if(!DEMO){ const { error } = await sb.from("reactions").insert({post_id:id, emoji:e}); if(error) console.error(error); }
  }));
  document.querySelectorAll("[data-cform]").forEach(f => f.addEventListener("submit", async ev => {
    ev.preventDefault(); const id = f.dataset.cform; const name = f.name.value.trim().slice(0,40), body = f.body.value.trim().slice(0,500);
    if(!name || !body || f.website.value) return; store.set("cname", name);
    const btn = f.querySelector("button"); btn.disabled = true;
    const row = {post_id:id, name, body, created_at:new Date().toISOString()};
    if(!DEMO){ const { data, error } = await sb.from("comments").insert({post_id:id, name, body}).select().single(); if(error){ btn.disabled = false; alertMsg(f, /Zu viele/.test(error.message||"") ? "Gerade kommen sehr viele Kommentare. Bitte in ein paar Minuten nochmal." : "Hat nicht geklappt, bitte nochmal."); return; } row.id = data.id; row.created_at = data.created_at; }
    (S.comments[id] = S.comments[id] || []).push(row); render();
  }));
  const lt = $("loginToggle"); if(lt) lt.addEventListener("click", () => { const f = $("loginForm"); f.hidden = !f.hidden; lt.setAttribute("aria-expanded", String(!f.hidden)); if(!f.hidden){ $("loginEmail").focus(); f.scrollIntoView({behavior:"smooth", block:"center"}); } });
  const lf = $("loginForm");
  if(lf) lf.addEventListener("submit", async e => { e.preventDefault(); const m = $("loginMsg");
    if(DEMO){ m.textContent = "In der Vorschau gibt es keine Anmeldung."; return; }
    const { error } = await sb.auth.signInWithOtp({ email: $("loginEmail").value.trim(), options: { shouldCreateUser:false, emailRedirectTo: location.origin + location.pathname } });
    if(error) console.warn(error); m.textContent = error ? loginErrorText(error) : "Link ist unterwegs. Bitte E-Mail öffnen und auf dem Handy antippen."; });
  const lo = $("logout"); if(lo) lo.addEventListener("click", async () => { if(sb) await sb.auth.signOut(); S.editor = false; S.lastShare = null; render(); });
  if(!S.editor) return;

  document.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    if(b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "Wirklich löschen?"; return; }
    const p = S.posts.find(x => x.id === b.dataset.del); if(!p) return; b.disabled = true;
    if(!DEMO){ const paths = (p.media||[]).map(m => m.path); if(paths.length) await sb.storage.from(BUCKET).remove(paths); const { error } = await sb.from("posts").delete().eq("id", p.id); if(error){ b.textContent = "Fehler"; return; } }
    S.posts = S.posts.filter(x => x.id !== p.id); render();
  }));
  document.querySelectorAll("[data-delc]").forEach(b => b.addEventListener("click", async () => {
    const id = +b.dataset.delc; if(!DEMO) await sb.from("comments").delete().eq("id", id);
    Object.keys(S.comments).forEach(k => S.comments[k] = S.comments[k].filter(c => c.id !== id)); render();
  }));
  document.querySelectorAll("[data-share]").forEach(b => b.addEventListener("click", async () => {
    const p = S.posts.find(x => x.id === b.dataset.share); if(!p) return; b.disabled = true; b.textContent = "Bereite vor …";
    const files = await filesForPost(p); b.disabled = false; b.textContent = "Per WhatsApp teilen";
    await doShare(files, shareText(p), null);
  }));
  renderOutbox();
  $("pAuthor").addEventListener("change", e => store.set("author", e.target.value));
  $("pPlace").addEventListener("change", e => store.set("place", e.target.value));
  $("pSaver").addEventListener("change", e => store.set("saver", e.target.checked ? "1" : "0"));
  const inp = $("pMedia"), prev = $("pPrev"), msg = $("pMsg");
  const newId = () => (crypto.randomUUID && crypto.randomUUID()) || ("p" + Date.now() + Math.random().toString(36).slice(2));
  document.querySelectorAll("[data-ping]").forEach(b => b.addEventListener("click", () => {
    queuePost({ id: newId(), author: $("pAuthor").value, place: $("pPlace").value, status: b.dataset.ping, body: "", files: [], created: Date.now() });
    msg.textContent = "Lebenszeichen wird gesendet.";
  }));
  inp.addEventListener("change", async () => {
    pending = []; prev.innerHTML = ""; const files = [...inp.files].slice(0,8); const saver = $("pSaver").checked;
    $("pSubmit").disabled = true;
    for(const [i,f] of files.entries()){
      msg.textContent = `Bereite ${i+1} von ${files.length} vor …`;
      if(f.type.startsWith("video/") && f.size > 50*1024*1024){ msg.textContent = `„${f.name}“ ist größer als 50 MB und wird übersprungen.`; continue; }
      try{ const pf = await prepareFile(f, saver); pending.push(pf);
        prev.insertAdjacentHTML("beforeend", pf.type.startsWith("video/") ? `<video src="${URL.createObjectURL(pf.full)}" muted></video>` : `<img src="${URL.createObjectURL(pf.thumb)}" alt="">`); }
      catch(e){ msg.textContent = "Ein Foto konnte nicht gelesen werden."; }
    }
    $("pSubmit").disabled = false;
    const total = pending.reduce((n,f) => n + f.full.size + (f.thumb ? f.thumb.size : 0), 0);
    const hasVideo = pending.some(f => f.type.startsWith("video/"));
    if(pending.length) msg.textContent = `${pending.length} Datei(en), zusammen ${fmtKB(total)} Upload.` + (hasVideo ? " Videos werden nicht verkleinert, bei schwachem Netz lieber Fotos." : "");
  });
  $("postForm").addEventListener("submit", e => {
    e.preventDefault();
    const body = $("pText").value.trim(), status = $("pStatus").value;
    if(!body && !pending.length && !status){ msg.textContent = "Schreib etwas, wähl ein Lebenszeichen oder häng ein Foto an."; return; }
    queuePost({ id: newId(), author: $("pAuthor").value, place: $("pPlace").value, status, body, files: pending, created: Date.now() });
    pending = []; $("pText").value = ""; $("pStatus").value = ""; inp.value = ""; prev.innerHTML = "";
    msg.textContent = "In der Warteschlange. Du kannst weitermachen oder die Seite schließen, der Upload läuft beim nächsten Öffnen weiter.";
  });
}
function alertMsg(el, t){ let m = el.querySelector(".msg"); if(!m){ m = document.createElement("div"); m.className = "msg"; el.after(m); } m.textContent = t; }
$("lb").addEventListener("click", e => { if(e.target.id === "lb" || e.target.id === "lbClose") $("lb").classList.remove("on"); });
document.addEventListener("keydown", e => { if(e.key === "Escape") $("lb").classList.remove("on"); });

/* ---------- Demo ---------- */
function demoData(){
  const t = Date.now();
  S.posts = [
    {id:"d2", author:"felix", place:"Perito Moreno", status:"Alles gut, uns geht's prima", body:"Der Gletscher hat gerade ein Stück so groß wie ein Haus abgeworfen. Der Knall ging durch Mark und Bein!", media:[{path:"img/hero.jpg", type:"image/jpeg"}], created_at:new Date(t-3600e3).toISOString()},
    {id:"d1", author:"victor", place:"Ushuaia", status:"", body:"Angekommen am Ende der Welt. Erstmal Königskrabbe.", media:[], created_at:new Date(t-86400e3).toISOString()}
  ];
  S.reactions = {d2:{"❤️":7,"🏔️":3}, d1:{"😂":2}};
  S.comments = {d2:[{id:1, post_id:"d2", name:"Oma", body:"Passt bloß auf euch auf!", created_at:new Date(t-1800e3).toISOString()}]};
}

/* ---------- Start ---------- */
(async () => {
  await checkEditor(); await loadOutbox(); await loadAll(); render(); processOutbox();
  window.addEventListener("online", () => { outboxBusy = false; processOutbox(); });
  document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") processOutbox(); });
  if("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  loadWeather().then(render);
  if(sb) sb.auth.onAuthStateChange(async (ev) => { if(ev === "SIGNED_IN" || ev === "SIGNED_OUT"){ await checkEditor(); render(); processOutbox(); } });
  setInterval(async () => { if(document.visibilityState !== "visible") return; const a = document.activeElement; if(a && a.matches("input,textarea,select")) return; if(pending.length || ($("pText") && $("pText").value)) return; await loadAll(); render(); }, 90000);
})();
})();
