(function(){
"use strict";
// Schutz gegen Einbetten in fremde Seiten (Clickjacking)
if(window.top !== window.self){ try{ window.top.location = window.location.href; }catch(e){ document.documentElement.innerHTML = ""; return; } }
/* ============ DATEN ============ */
const TRIP_START = new Date(2026,10,13,22,5);
const TRIP_DAY1 = new Date(2026,10,13);
const TRIP_END = new Date(2026,10,30,11,0);

let DAYS = [], FLIGHTS = [], STAYS = [], TREK = [], TODOS = [], PACK = [], PLACES = {}, QUICK = [], TRANSFER = {}, PASSPORTS = "";

const BEER_REASONS = ["Etappe war „nur kurz“","Hat Claude gefragt statt Karte gelesen","Wecker vor 6 Uhr gestellt","Bargeld vergessen","Schnarchen im Dorm","Letztes Snickers gegessen","Falsche Abzweigung","Bester Ausblick, trotzdem gemeckert","Hat am Pass „gleich oben“ gesagt"];
const BLAME = [
 "Felix. Er hat die Etappe geplant.","Felix. Er hat „nur 17 km“ gesagt.","Felix. Er hat das Zelt gebucht, in dem es zieht.","Felix. Die Excel-Tabelle hatte keine Spalte für Wind.",
 "Victor. Er hat Claude gefragt, und Claude war sich sehr sicher.","Victor. Er hat eine App gebaut, statt zu packen.","Victor. Er hat einen Screenshot geschickt statt einer Antwort.","Victor. Seine Locken bremsen im Gegenwind.",
 "Der Wind. Es ist immer der Wind.","Claude. Sorry.","Beide. Und das Bier geht auf beide."];
function beerScore(){
  const f = state.beers.filter(b => b.who === "felix").length, v = state.beers.filter(b => b.who === "victor").length;
  return `<div><b>${f}</b><span class="small muted">Felix schuldet</span></div><div><b>${v}</b><span class="small muted">Victor schuldet</span></div>`;
}

/* ============ HELFER ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today0 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const fmtDue = iso => { const [y,m,d] = iso.split("-"); return `${+d}.${+m}.`; };
const daysUntil = iso => { const [y,m,d] = iso.split("-").map(Number); return Math.round((new Date(y,m-1,d) - today0())/864e5); };
const mapsUrl = q => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);

const state = { db:null, assets:null, wx:null, costs:[], rates:{}, beers:[], checks:{}, notes:{}, uploads:{}, packExtra:[], todoExtra:[], canWrite:true, names:{}, me:null, db:null, assets:null, user:null };

function nameOf(id){ if(!id) return ""; return /felix/i.test(id) ? "Felix" : /vbrt|victor|thoma/i.test(id) ? "Victor" : "jemand"; }
async function resolveNames(){}

/* ============ HEADER ============ */
function renderCount(){
  const now = new Date();
  let html;
  if(now < TRIP_START){
    const d = Math.ceil((TRIP_DAY1 - today0())/864e5);
    html = `<b>${d === 0 ? "Heute" : "in " + d + " Tagen"}</b><span class="eyebrow">Abflug Frankfurt 22:05</span>`;
  } else if(now <= TRIP_END){
    const n = Math.floor((today0() - TRIP_DAY1)/864e5) + 1;
    html = `<b>Tag ${n} / 18</b><span class="eyebrow">${esc((DAYS[Math.min(n,18)-1]||{}).title||"")}</span>`;
  } else html = `<b>Zuhause</b><span class="eyebrow">Was für eine Reise</span>`;
  $("#count").innerHTML = html;
}

/* ============ HEUTE ============ */
function openTodos(){
  const all = TODOS.map(t => ({...t, done: !!(state.checks["todo-"+t.id]||{}).done}));
  const fel = felixDone();
  all.forEach(t => { if(t.auto) t.done = fel.done === fel.total; });
  const extra = state.todoExtra.map(x => ({id:x.id, t:x.text, sub:"", due:x.due||"2026-11-12", prio:"norm", done: !!(state.checks["todo-"+x.id]||{}).done, extra:true}));
  return all.concat(extra);
}
function felixDone(){
  const slots = ["hotel-ba","flug-ush-fte","flug-fte-aep"];
  const done = slots.filter(s => (state.uploads[s]?.files||[]).length || (state.notes["slot-"+s]?.text||"").trim()).length;
  return {done,total:slots.length};
}
function packStats(){
  let total=0, done=0;
  PACK.forEach(c => c.items.forEach((_,i) => { total++; if(state.checks[`pack-${slug(c.cat)}-${i}`]?.done) done++; }));
  state.packExtra.forEach(p => { total++; if(state.checks["pack-x-"+p.id]?.done) done++; });
  return {total,done};
}
function renderHeute(){
  const now = new Date();
  const v = $("#v-heute");
  const todos = openTodos();
  const open = todos.filter(t => !t.done).sort((a,b) => a.due.localeCompare(b.due));
  const ps = packStats(), fx = felixDone();
  let top = "";
  if(now < TRIP_START){
    const d = Math.ceil((TRIP_DAY1 - today0())/864e5);
    top = `<div class="card hl"><div class="eyebrow muted">Vor der Reise</div><h3 style="font-size:1.6rem;margin-top:2px">Noch ${d} Tage bis zum Abflug</h3>
      <p style="margin:6px 0 0">Am <b>Freitag, 13.11. um 22:05</b> geht es ab Frankfurt los. Bis dahin sind die wichtigsten Punkte: Eintrittsticket für den Nationalpark, Rückfahrt mit dem Fahrer festmachen und klären, wohin das Stadtgepäck während des Treks kommt.</p></div>`;
  } else if(now <= TRIP_END){
    const n = Math.floor((today0() - TRIP_DAY1)/864e5);
    const day = DAYS[n], nxt = DAYS[n+1];
    top = `<div class="eyebrow muted">Heute, Tag ${day.n} von 18</div>${dayCard(day,true)}${nxt ? `<div class="eyebrow muted" style="margin-top:6px">Morgen</div>${dayCard(nxt,false)}` : ""}`;
  } else {
    top = `<div class="card hl"><h3>Willkommen zurück!</h3><p>Die Reise ist vorbei. Der Reiseblog bleibt als Erinnerung.</p></div>`;
  }
  const tdDone = todos.length - open.length;
  v.innerHTML = `${top}
   <div class="crew">
     <div class="mate"><img src="img/felix.jpg" alt="Felix"><div><span class="nick">El Comandante del Camping</span><b>Felix</b><span class="small muted">Initiator, Planer, Camp-Bucher. Ohne ihn gäbe es diese Reise nicht, nur eine Excel-Tabelle.</span>
       <ul class="fun"><li><span>Camps gebucht</span><b>8/8</b></li><li><span>Reisepläne als Excel</span><b>1</b></li><li><span>„Ist eine kurze Etappe“</span><b>bald</b></li></ul></div></div>
     <div class="mate"><img src="img/victor.jpg" alt="Victor"><div><span class="nick">El Fotógrafo Oficial</span><b>Victor</b><span class="small muted">Der Digitale im Team, plant mit Claude. Macht 400 Fotos pro Etappe, auf einem davon ist Felix.</span>
       <ul class="fun"><li><span>Akku bei Ankunft im Refugio</span><b>3 %</b></li><li><span>Powerbanks dabei</span><b>2</b></li><li><span>Panoramen mit Daumen</span><b>1</b></li></ul></div></div>
   </div>
   <div class="grid2">
     <div class="card">
       <div class="sechead"><h3>Bier-Konto</h3><span class="small muted">Quilmes, Austral oder Patagonia</span></div>
       <div class="beerscore">${beerScore()}</div>
       ${state.canWrite && state.db ? `<form class="addrow" id="beerForm">
         <select id="beerWho" aria-label="Wer schuldet"><option value="felix">Felix schuldet eins</option><option value="victor">Victor schuldet eins</option></select>
         <select id="beerWhy" aria-label="Grund">${BEER_REASONS.map(r => `<option>${esc(r)}</option>`).join("")}</select>
         <button class="btn" type="submit">Eintragen</button></form>` : ""}
       <ul class="clean beerlog">${state.beers.slice(0,4).map(b => `<li class="small"><b>${b.who === "felix" ? "Felix" : "Victor"}</b> · ${esc(b.why)} <span class="muted">${new Date(b.at).toLocaleDateString("de-DE",{day:"numeric",month:"numeric"})}</span></li>`).join("") || '<li class="small muted">Noch keine Schulden. Das bleibt nicht lange so.</li>'}</ul>
     </div>
     <div class="card">
       <h3>Wer ist schuld?</h3>
       <p class="small muted" style="margin:0 0 10px">Für alle Momente, in denen es regnet, der Weg länger ist als gedacht oder das Zelt zieht.</p>
       <button class="btn" type="button" id="blameBtn">Schuldigen ermitteln</button>
       <p id="blameOut" class="blame" aria-live="polite"></p>
     </div>
   </div>
   ${wxCard()}
   <div class="stats">
     <div class="stat"><b>${tdDone}/${todos.length}</b><span>To-dos erledigt</span><div class="bar"><i style="width:${Math.round(tdDone/todos.length*100)}%"></i></div></div>
     <div class="stat"><b>${ps.done}/${ps.total}</b><span>Packliste</span><div class="bar"><i style="width:${Math.round(ps.done/Math.max(ps.total,1)*100)}%"></i></div></div>
     <div class="stat"><b>${fx.done}/${fx.total}</b><span>Uploads von Felix</span><div class="bar"><i style="width:${Math.round(fx.done/fx.total*100)}%"></i></div></div>
     <div class="stat"><b>8</b><span>Trek-Tage, ca. 115 km</span><div class="bar"><i style="width:100%;background:var(--trail)"></i></div></div>
   </div>
   <div class="card">
     <div class="sechead"><h3>Als Nächstes fällig</h3><a href="#orga" class="small">Alle To-dos</a></div>
     <div>${open.slice(0,5).map(t => todoRow(t)).join("") || '<p class="muted">Alles erledigt.</p>'}</div>
   </div>
   <div class="grid2">
     <div class="card warn"><h3>Knapp am 14.11.</h3><p style="margin:0">Landung 07:55 in <b>EZE</b>, Abflug 12:10 von <b>AEP</b>: zwei Flughäfen, getrennte Tickets. Gepäck holen, Transfer 45–75 Min., neu einchecken. Machbar, aber ohne Trödeln.</p></div>
     <div class="card warn"><h3>Grenze nach Chile</h3><p style="margin:0">Am 18.11. und 26.11. über Cancha Carrera / Cerro Castillo (08–22 Uhr). Keine frischen Lebensmittel, SAG-Erklärung vorher online ausfüllen.</p></div>
   </div>`;
  bindChecks(v);
  const bf = v.querySelector("#beerForm");
  if(bf) bf.addEventListener("submit", async e => { e.preventDefault();
    await safeWrite(() => state.db.collection("bier").add({who: $("#beerWho").value, why: $("#beerWhy").value, by: state.me, at: Date.now()})); });
  let last = -1;
  v.querySelector("#blameBtn").addEventListener("click", () => {
    let i; do { i = Math.floor(Math.random()*BLAME.length); } while(i === last); last = i;
    $("#blameOut").textContent = BLAME[i];
  });
}

/* ============ WETTER ============ */
const WXLINK = {ba:[-34.60,-58.38],ush:[-54.80,-68.30],cal:[-50.34,-72.27],tdp:[-51.0,-73.0]};
function wxCard(onlyKey){
  const W = state.wx; if(!W || !W.places) return "";
  const t = today0(); const iso = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
  const fmt = d => { const [y,m,dd] = d.split("-"); return `${+dd}.${+m}.`; };
  const pls = W.places.filter(p => !onlyKey || p.key === onlyKey);
  return `<div class="card"><div class="sechead"><h3>Wetter</h3><span class="small muted">Stand ${esc(new Date(W.updated).toLocaleString("de-DE",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}))}</span></div>
   <div class="wxg">${pls.map(p => { const d = (p.days||[]).find(x => x.date >= iso) || (p.days||[])[0]; if(!d) return ""; const ll = WXLINK[p.key];
     return `<div class="wxc"><div class="sechead"><b>${esc(p.name)}</b><span class="wxt">${d.hi ?? "–"}°<small>/${d.lo ?? "–"}°</small></span></div>
       <div class="small muted">${esc([d.text, d.wind ? "Wind " + d.wind : ""].filter(Boolean).join(" · "))}</div>
       <div class="chips" style="margin-top:6px">${(p.days||[]).filter(x => x.date > d.date).slice(0,4).map(x => `<span class="chip grey">${fmt(x.date)} ${x.hi ?? "–"}°/${x.lo ?? "–"}°</span>`).join("")}</div>
       ${ll ? `<a class="small" href="https://www.windy.com/${ll[0]}/${ll[1]}?${ll[0]},${ll[1]},9" target="_blank" rel="noopener">Live auf Windy</a>` : ""}</div>`; }).join("")}</div></div>`;
}

/* ============ PLAN ============ */
let planFilter = "all";
function dayCard(day, big){
  const date = new Date(2026,10,day.d);
  const t = today0().getTime();
  const cls = date.getTime() === t ? "today" : (date.getTime() < t ? "past" : "");
  return `<article class="day ${big ? "" : cls}" id="tag-${day.n}">
    <div class="datecol"><div class="d">${day.d}</div><div class="m">${day.wd} · Nov</div><div class="n">Tag ${day.n}</div></div>
    <div>
      <div class="chips" style="margin-bottom:4px">${day.tags.map(([l,c]) => `<span class="chip ${c}">${esc(l)}</span>`).join("")}</div>
      <h3>${esc(day.title)}</h3>
      <div class="where">${esc(day.where)}</div>
      <ul class="steps">${day.steps.map(([t,s]) => `<li><span class="t">${esc(t)}</span><span>${esc(s)}</span></li>`).join("")}</ul>
      <div class="sleep"><span class="chip grey">Nacht</span> ${esc(day.sleep)}</div>
    </div></article>`;
}
function renderPlan(){
  const list = DAYS.filter(d => planFilter === "all" || d.zone === planFilter);
  $("#days").innerHTML = list.map(d => dayCard(d,false)).join("");
}
$("#planfilter").addEventListener("click", e => {
  const b = e.target.closest("button"); if(!b) return;
  planFilter = b.dataset.f;
  $("#planfilter").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
  renderPlan();
});

/* ============ BUCHUNGEN ============ */
function noteBox(key, ph){
  const n = state.notes[key];
  const meta = n && n.text ? `zuletzt ${esc(nameOf(n.by))}` : "";
  return `<textarea class="note" data-note="${esc(key)}" placeholder="${esc(ph)}" ${state.canWrite ? "" : "readonly"}>${esc(n?.text||"")}</textarea>
   <div class="notebar"><span>Für euch beide sichtbar, speichert automatisch</span><span data-meta="${esc(key)}">${meta}</span></div>`;
}
function slotBox(slot, label){
  const files = state.uploads[slot]?.files || [];
  const noteTxt = (state.notes["slot-"+slot]?.text||"").trim();
  const done = files.length || noteTxt;
  const thumbs = files.map(f => {
    const url = esc(blobUrl(f.id));
    const isImg = (f.type||"").startsWith("image/");
    return `<a href="${url}" target="_blank" rel="noopener" title="${esc(f.name)}">${isImg ? `<img src="${url}" alt="${esc(f.name)}" loading="lazy">` : `<span class="pdf">PDF</span>`}</a>`;
  }).join("");
  const canUp = !!state.assets;
  return `<div class="slot ${done ? "done" : ""}" data-slot="${esc(slot)}">
    <div class="chips" style="margin-bottom:6px">${done ? '<span class="chip ok">Hochgeladen</span>' : '<span class="chip trail">Lädt Felix hoch</span>'}</div>
    <div class="small">${esc(label)}</div>
    ${thumbs ? `<div class="thumbs">${thumbs}</div>` : ""}
    <div class="addrow" style="align-items:center">
      ${canUp ? `<label class="btn ghost">Screenshot oder PDF hochladen<input type="file" accept="image/*,application/pdf" multiple data-upload="${esc(slot)}"></label>` : `<span class="small muted">Hochladen geht für alle mit Bearbeiten-Zugriff.</span>`}
      <span class="small muted" data-upstatus="${esc(slot)}"></span>
    </div>
    <div style="margin-top:8px">${noteBox("slot-"+slot, "Oder hier eintippen: Flugnummer, Buchungscode, Adresse …")}</div>
  </div>`;
}
function copyBtn(v){ return `<button class="copy" type="button" data-copy="${esc(v)}">Kopieren</button>`; }
function renderBuchungen(){
  const v = $("#v-buchungen");
  v.innerHTML = `<div class="sechead"><h2>Buchungen</h2><span class="small muted">Codes antippen zum Kopieren</span></div>
  <h3 style="text-transform:uppercase;letter-spacing:.05em">Flüge</h3>
  ${FLIGHTS.map(f => `<div class="card bk">
     <div class="head"><span class="eyebrow muted">${esc(f.date)}</span><span class="chip ${f.status[1]}">${esc(f.status[0])}</span></div>
     <div class="flight"><div><div class="ap">${f.from}</div><div class="tm">${f.dep}</div></div><div class="mid">${esc(f.dur)}</div><div class="r"><div class="ap">${f.to}</div><div class="tm">${f.arr}</div></div></div>
     <div class="small muted">${esc(f.carrier)}</div>
     ${f.code ? `<div><span class="code">${esc(f.code)} ${copyBtn(f.code)}</span></div>` : ""}
     ${f.info ? `<div class="small">${esc(f.info)}</div>` : ""}
     ${f.slot ? slotBox(f.slot, "Bestätigung mit Flugnummer, Buchungscode und Gepäck") : `<details class="more"><summary>Notizen & Ergänzungen</summary>${noteBox("bk-"+f.id, f.code ? "z. B. Sitzplätze, Gepäck …" : "z. B. Lufthansa-Buchungscode, Sitzplätze …")}</details>`}
   </div>`).join("")}
  <h3 style="text-transform:uppercase;letter-spacing:.05em;margin-top:6px">Unterkünfte</h3>
  ${STAYS.map(s => `<div class="card bk">
     <div class="head"><span class="eyebrow muted">${esc(s.when)}</span><span class="chip ${s.slot ? "trail" : "ok"}">${s.slot ? "Gebucht von Felix" : "Bestätigt"}</span></div>
     <h3 style="margin:0">${esc(s.name)} <span class="muted small">· ${esc(s.place)}</span></h3>
     ${s.addr ? `<div>${esc(s.addr)} · <a href="${mapsUrl(s.map)}" target="_blank" rel="noopener">Karte</a></div>` : ""}
     ${s.kv.length ? `<dl class="kv">${s.kv.map(([k,val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join("")}</dl>` : ""}
     ${s.info ? `<div class="small" style="margin-top:4px">${esc(s.info)}</div>` : ""}
     ${s.slot ? slotBox(s.slot, "Buchungsbestätigung mit Name, Adresse, Check-in/out und Buchungsnummer") : `<details class="more"><summary>Notizen & Ergänzungen</summary>${noteBox("bk-"+s.id,"z. B. Türcode, Buchungsnummer …")}</details>`}
   </div>`).join("")}
  <div class="card bk">
     <div class="head"><span class="eyebrow muted">18.11. & 26.11. · Privater Transfer</span><span class="chip ok">Vereinbart</span></div>
     <h3 style="margin:0">Fahrer El Calafate ⇄ Torres del Paine</h3>
     <dl class="kv">
      <dt>WhatsApp</dt><dd><span class="code">${esc(TRANSFER.whatsapp||"")} ${copyBtn(TRANSFER.wa||"")}</span></dd>
      <dt>Fahrzeug</dt><dd>${esc(TRANSFER.car||"")}</dd>
      <dt>Hinfahrt</dt><dd>${esc(TRANSFER.out||"")}</dd>
      <dt>Rückfahrt</dt><dd>${esc(TRANSFER.back||"")}${TRANSFER.backOpen ? ` · <span class="chip warn">${esc(TRANSFER.backOpen)}</span>` : ""}</dd>
      <dt>Bezahlung</dt><dd>${esc(TRANSFER.pay||"")}</dd>
     </dl>
     <details class="more"><summary>Notizen & Ergänzungen</summary>${noteBox("bk-transfer","z. B. bestätigte Abholzeit, Pesos-Betrag …")}</details>
  </div>
  <div class="card bk">
     <div class="head"><span class="eyebrow muted">18.–26.11. · Torres del Paine</span><span class="chip ok">Alles gebucht</span></div>
     <h3 style="margin:0">Camps & Refugios O-Circuit</h3>
     <div class="stagewrap"><table class="stages" style="min-width:420px"><thead><tr><th>Nacht</th><th>Ort</th><th>Typ</th><th>Betreiber</th></tr></thead><tbody>
      ${TREK.map(s => `<tr><td class="num">${s.d}</td><td>${esc(s.to.replace(" & zurück",""))==="Base Las Torres"?"Camping Central":esc(s.to)}</td><td>${esc(s.sleep)}</td><td>${esc(s.op)}</td></tr>`).join("")}
     </tbody></table></div>
     <details class="more"><summary>Notizen & Ergänzungen</summary>${noteBox("bk-trek","z. B. Reservierungsnummern Vértice / Las Torres, Mahlzeiten …")}</details>
  </div>`;
  bindNotes(v); bindUploads(v); bindCopy(v);
}

/* ============ TREK ============ */
function renderTrek(){
  const v = $("#v-trek");
  const maxKm = Math.max(...TREK.map(s => s.km));
  const total = TREK.reduce((a,s) => a+s.km, 0);
  v.innerHTML = `<div class="sechead"><h2>O-Circuit Torres del Paine</h2><span class="chips"><span class="chip trail">8 Tage</span><span class="chip trail">ca. ${Math.round(total)} km</span><span class="chip">gegen den Uhrzeigersinn</span></span></div>
  ${wxCard("tdp")}
  <div class="card">
    <svg class="ring" viewBox="0 0 640 260" role="img" aria-label="Schematische Runde um das Paine-Massiv mit acht Etappen">
      ${ringSvg()}
    </svg>
  </div>
  <div class="card">
    <h3>Etappen</h3>
    <div class="stagewrap"><table class="stages"><thead><tr><th>Datum</th><th>Etappe</th><th>Distanz</th><th>Gehzeit</th><th>Nacht</th></tr></thead><tbody>
    ${TREK.map(s => `<tr class="${s.key ? "key" : ""}"><td class="num">${s.d}</td><td><b>${esc(s.from)} → ${esc(s.to)}</b>${s.note ? `<div class="small muted">${esc(s.note)}</div>` : ""}</td>
      <td class="num"><div class="kmbar"><i style="width:${Math.round(s.km/maxKm*70)}px"></i>${String(s.km).replace(".",",")} km</div></td><td class="num">${s.h} Std.</td><td>${esc(s.sleep)} · ${esc(s.op)}</td></tr>`).join("")}
    </tbody></table></div>
  </div>
  <div class="grid2">
    <div class="card crit"><h3>Königsetappe 21.11.</h3><p style="margin:0">Von Los Perros über den John-Garner-Pass (1.241 m) nach Grey. Früh los, Ranger geben die Startzeit vor. Bei Sturm wird der Pass gesperrt, dann müsst ihr eventuell eine Nacht länger in Los Perros bleiben: eine Reserveportion Essen einpacken.</p></div>
    <div class="card warn"><h3>Wetter Ende November</h3><p style="margin:0">Frühling: 0–15 °C, Böen am Pass auch deutlich über 80 km/h, Regen, Sonne und Schnee an einem Tag. Fast 17 Stunden Tageslicht, Sonnenaufgang gegen 5:30.</p></div>
    <div class="card"><h3>Regeln im Park</h3><ul class="dots"><li>Parkticket vorher online, QR-Code offline</li><li>Nur auf markierten Wegen gehen</li><li>Kocher nur in den Kochbereichen der Camps, offenes Feuer verboten</li><li>Müll komplett wieder mitnehmen</li><li>Sperrzeiten an Abzweigen (Base Torres, Valle del Francés) beachten</li></ul></div>
    <div class="card"><h3>Was ihr trägt</h3><p style="margin:0">In Refugios mit Betten braucht ihr kein Zelt. In Serón und Los Perros schlaft ihr im Mietzelt: prüfen, ob Schlafsack und Isomatte mitgemietet sind. Ziel: Rucksack unter 12 kg.</p></div>
  </div>`;
}
function ringSvg(){
  // Schematische Runde: Punkte auf einer Ellipse, gegen den Uhrzeigersinn ab Central (Osten)
  const pts = [
    ["Central",560,175],["Serón",565,85],["Dickson",420,40],["Los Perros",255,45],
    ["Grey",110,95],["Paine Grande",120,185],["Los Cuernos",330,215],["Central",560,175]
  ];
  let path = `M ${pts[0][1]} ${pts[0][2]}`;
  for(let i=1;i<pts.length;i++) path += ` L ${pts[i][1]} ${pts[i][2]}`;
  let s = `<path d="${path}" fill="none" stroke="var(--trail)" stroke-width="4" stroke-linejoin="round" stroke-dasharray="1 0"/>`;
  s += `<text x="330" y="132" text-anchor="middle" font-family="var(--display)" font-size="22" font-weight="700" fill="var(--muted)" letter-spacing="2">MACIZO PAINE</text>`;
  s += `<text x="185" y="70" text-anchor="middle" font-family="var(--body)" font-size="12" fill="var(--crit)">▲ Paso John Garner 1.241 m</text>`;
  s += `<line x1="560" y1="175" x2="560" y2="110" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 4"/><text x="550" y="140" text-anchor="end" font-family="var(--body)" font-size="12" fill="var(--accent)">25.11. Base Torres ↑</text>`;
  pts.slice(0,7).forEach(([n,x,y],i) => {
    s += `<circle cx="${x}" cy="${y}" r="7" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.5"/>`;
    const below = y > 130;
    s += `<text x="${x}" y="${below ? y+24 : y-14}" text-anchor="middle" font-family="var(--display)" font-size="15" font-weight="600" fill="var(--ink)">${n}</text>`;
  });
  return s;
}

/* ============ ORTE ============ */
let place = "ush";
function renderGuides(){
  const v = $("#guideArea"); if(!v) return;
  const p = PLACES[place]; if(!p){ v.innerHTML = ""; return; }
  const order = [["ba","Buenos Aires"],["ush","Ushuaia"],["cal","El Calafate"],["tdp","Torres del Paine"]];
  v.innerHTML = `<h3 style="text-transform:uppercase;letter-spacing:.05em;margin:6px 0 8px">Reiseführer</h3>
  <div class="placetabs" role="group" aria-label="Ort wählen">${order.map(([k,n]) => `<button type="button" data-p="${k}" aria-pressed="${k===place}">${n}</button>`).join("")}</div>
  <div class="card place"><p style="margin:0 0 6px">${esc(p.intro)}</p>
    <h3>Nicht verpassen</h3><div class="tips">${p.must.map(([k,t],i) => `<div class="tip"><span class="k">${i+1}</span><div><b>${esc(k)}</b> · ${esc(t)}</div></div>`).join("")}</div>
  </div>
  <div class="grid2">
    <div class="card place"><h3>Essen & Trinken</h3><div class="tips">${p.food.map(([k,t]) => `<div><b>${esc(k)}</b><div class="small">${esc(t)}</div></div>`).join("")}</div></div>
    <div class="card place"><h3>Praktisch</h3><ul class="dots">${p.practical.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
  </div>
  <div class="card"><h3>Eure Ideen für ${esc(p.name)}</h3>${noteBox("ort-"+place, "Restaurant-Tipps von Freunden, Ideen, Fundstücke …")}</div>`;
  v.querySelector(".placetabs").addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return; place = b.dataset.p; renderGuides(); });
  bindNotes(v);
}

/* ============ GEMERKTE ORTE (Tipps aus Instagram & Co.) ============ */
const SPOT_CATS = { essen: ["Essen", "#d26a12"], bar: ["Café & Bar", "#8e44ad"], aussicht: ["Aussicht", "#0d6f7b"], wandern: ["Wandern", "#2f7a45"], erlebnis: ["Erlebnis", "#c0392b"], sonst: ["Sonstiges", "#5d6b74"] };
const SPOT_REGIONS = [
  { k: "ba", n: "Buenos Aires", lat: -34.60, lon: -58.40, z: 12 },
  { k: "ush", n: "Ushuaia", lat: -54.80, lon: -68.30, z: 12 },
  { k: "cal", n: "El Calafate", lat: -50.34, lon: -72.27, z: 11 },
  { k: "tdp", n: "Torres del Paine", lat: -51.00, lon: -73.00, z: 10 }
];
let spotMap = null, spotLayer = null, spotRegion = "alle", spotPick = null, spotPickMarker = null, spotSearchTimer = null;
function nearestRegion(lat, lon){ let best = null, bd = 1e9; SPOT_REGIONS.forEach(r => { const d = (r.lat-lat)**2 + (r.lon-lon)**2; if(d < bd){ bd = d; best = r; } }); return best ? best.k : ""; }
function gmaps(s){ return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.lat + "," + s.lon); }
function safeLink(u){ return /^https:\/\//i.test(u || "") ? u : ""; }
function spotsHtml(){
  return `<div class="card" id="spotCard">
    <div class="sechead"><h3>Gemerkte Orte</h3><span class="small muted">${(state.spots||[]).length} Tipps</span></div>
    <div class="placetabs" id="spotRegions" role="group" aria-label="Gegend">${[["alle","Alle"], ...SPOT_REGIONS.map(r => [r.k, r.n])].map(([k,n]) => `<button type="button" data-sr="${k}" aria-pressed="${k === spotRegion}">${esc(n)}</button>`).join("")}</div>
    <div id="spotMap" class="spotmap" role="application" aria-label="Karte mit gemerkten Orten"></div>
    <p class="small muted" style="margin:4px 0 0">Karte braucht Netz. Ohne Netz bleibt die Liste unten nutzbar. Kartendaten © OpenStreetMap.</p>
    ${state.canWrite ? `<details class="more" id="spotAdd" style="margin-top:10px"><summary>+ Tipp hinzufügen</summary>
      <form class="spotform" id="spotForm">
        <label>Link (Instagram-Reel, TikTok, Website …)<input id="spLink" inputmode="url" placeholder="https://www.instagram.com/reel/…"></label>
        <label>Beschreibung aus dem Reel (optional, zum Erkennen des 📍-Orts)<textarea id="spCap" rows="2" placeholder="Beschreibung im Reel kopieren und hier einfügen"></textarea></label>
        <label>Ort suchen<input id="spQuery" autocomplete="off" placeholder="z. B. Don Julio Buenos Aires"></label>
        <div id="spResults" class="spresults"></div>
        <p class="small muted" style="margin:0">Nichts gefunden? Einfach auf die Karte tippen, um die Markierung selbst zu setzen.</p>
        <div class="row2"><label>Name<input id="spName" maxlength="80" required placeholder="Name des Ortes"></label>
          <label>Art<select id="spCat">${Object.entries(SPOT_CATS).map(([k,[n]]) => `<option value="${k}">${esc(n)}</option>`).join("")}</select></label></div>
        <label>Notiz<input id="spNote" maxlength="200" placeholder="z. B. Empanadas probieren, reservieren"></label>
        <div><button class="btn" type="submit" id="spSave">Merken</button> <span class="small muted" id="spMsg"></span></div>
      </form></details>` : ""}
    <div id="spotList" style="margin-top:10px"></div>
  </div>`;
}
function spotListHtml(){
  const list = (state.spots||[]).filter(s => spotRegion === "alle" || s.region === spotRegion).sort((a,b) => (b.at||0) - (a.at||0));
  if(!list.length) return '<p class="muted small">Noch keine Tipps in dieser Gegend.</p>';
  return list.map(s => { const [cn, col] = SPOT_CATS[s.cat] || SPOT_CATS.sonst; const link = safeLink(s.link);
    return `<div class="spot"><span class="dot" style="background:${col}"></span><div><b>${esc(s.name)}</b> <span class="small muted">· ${esc(cn)}${s.region ? " · " + esc((SPOT_REGIONS.find(r => r.k === s.region)||{}).n || "") : ""}</span>
      ${s.note ? `<div class="small">${esc(s.note)}</div>` : ""}
      <div class="small"><a href="${esc(gmaps(s))}" target="_blank" rel="noopener">In Google Maps</a>${link ? ` · <a href="${esc(link)}" target="_blank" rel="noopener">Tipp öffnen</a>` : ""} · <button type="button" class="copy" data-spfly="${esc(s.id)}">auf Karte</button>${state.canWrite ? ` · <button type="button" class="copy" data-spdel="${esc(s.id)}">löschen</button>` : ""}</div></div></div>`; }).join("");
}
function initSpotMap(){
  const el = $("#spotMap"); if(!el || !window.L) return;
  if(spotMap){ try{ spotMap.remove(); }catch(e){} spotMap = null; }
  spotMap = L.map(el, { zoomControl: true, attributionControl: true }).setView([-45, -66], 4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(spotMap);
  spotLayer = L.layerGroup().addTo(spotMap);
  spotMap.on("click", e => { if(!$("#spotAdd")) return; $("#spotAdd").open = true; setPick(e.latlng.lat, e.latlng.lng, $("#spName").value || ""); $("#spMsg").textContent = "Markierung gesetzt. Name eintragen und merken."; });
  drawSpots(true);
}
function drawSpots(fit){
  if(!spotMap || !spotLayer) return;
  spotLayer.clearLayers();
  const list = (state.spots||[]).filter(s => spotRegion === "alle" || s.region === spotRegion);
  list.forEach(s => { const col = (SPOT_CATS[s.cat] || SPOT_CATS.sonst)[1]; const link = safeLink(s.link);
    L.circleMarker([s.lat, s.lon], { radius: 9, color: "#fff", weight: 2, fillColor: col, fillOpacity: .95 }).addTo(spotLayer)
      .bindPopup(`<b>${esc(s.name)}</b>${s.note ? "<br>" + esc(s.note) : ""}<br><a href="${esc(gmaps(s))}" target="_blank" rel="noopener">Google Maps</a>${link ? ` · <a href="${esc(link)}" target="_blank" rel="noopener">Tipp</a>` : ""}`); });
  if(!fit) return;
  const r = SPOT_REGIONS.find(x => x.k === spotRegion);
  if(r) spotMap.setView([r.lat, r.lon], r.z);
  else if(list.length) spotMap.fitBounds(L.latLngBounds(list.map(s => [s.lat, s.lon])).pad(0.3), { maxZoom: 13 });
  else spotMap.setView([-45, -66], 4);
}
function setPick(lat, lon, name){
  spotPick = { lat, lon };
  if(name && !$("#spName").value) $("#spName").value = name;
  if(spotMap){ if(spotPickMarker) spotPickMarker.remove(); spotPickMarker = L.marker([lat, lon]).addTo(spotMap); spotMap.setView([lat, lon], Math.max(spotMap.getZoom(), 14)); }
}
async function searchPlaces(q){
  const box = $("#spResults"); if(!box) return;
  if(q.trim().length < 3){ box.innerHTML = ""; return; }
  if(navigator.onLine === false){ box.innerHTML = '<p class="small muted">Ohne Netz keine Suche. Ort später ergänzen oder auf die Karte tippen.</p>'; return; }
  const r = SPOT_REGIONS.find(x => x.k === spotRegion) || { lat: -45, lon: -66 };
  try{
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=de&lat=${r.lat}&lon=${r.lon}`);
    const j = await res.json();
    const feats = (j.features || []).filter(f => f.geometry && f.geometry.coordinates);
    box.innerHTML = feats.length ? feats.map((f,i) => { const p = f.properties || {}; const sub = [p.street, p.city || p.county, p.country].filter(Boolean).join(", ");
      return `<button type="button" class="spres" data-i="${i}"><b>${esc(p.name || sub || "Ort")}</b><span class="small muted">${esc(sub)}</span></button>`; }).join("") : '<p class="small muted">Nichts gefunden. Anders schreiben oder auf die Karte tippen.</p>';
    box.querySelectorAll(".spres").forEach(b => b.addEventListener("click", () => { const f = feats[+b.dataset.i]; const [lon, lat] = f.geometry.coordinates; setPick(lat, lon, (f.properties||{}).name || ""); box.innerHTML = `<p class="small" style="color:var(--ok)">✓ ${esc((f.properties||{}).name || "Ort")} gewählt</p>`; }));
  }catch(e){ box.innerHTML = '<p class="small muted">Suche gerade nicht erreichbar. Auf die Karte tippen geht trotzdem.</p>'; }
}
function bindSpots(v){
  v.querySelectorAll("[data-sr]").forEach(b => b.addEventListener("click", () => { spotRegion = b.dataset.sr; v.querySelectorAll("[data-sr]").forEach(x => x.setAttribute("aria-pressed", x === b)); $("#spotList").innerHTML = spotListHtml(); bindSpotList(v); drawSpots(true); }));
  const q = $("#spQuery"); if(q) q.addEventListener("input", () => { clearTimeout(spotSearchTimer); spotSearchTimer = setTimeout(() => searchPlaces(q.value), 450); });
  const cap = $("#spCap"); if(cap) cap.addEventListener("input", () => {
    const m = cap.value.match(/📍\s*([^\n#@|•]+)/) || cap.value.match(/(?:Ort|Location|Ubicación|Dirección)\s*[:\-]\s*([^\n#@|]+)/i);
    if(m){ const place = m[1].trim().replace(/[.,;!]+$/, ""); q.value = place; if(!$("#spName").value) $("#spName").value = place.split(",")[0].slice(0,80); searchPlaces(place); }
  });
  const f = $("#spotForm"); if(f) f.addEventListener("submit", async e => { e.preventDefault();
    const name = $("#spName").value.trim(); const link = $("#spLink").value.trim();
    if(!spotPick){ $("#spMsg").textContent = "Bitte einen Vorschlag wählen oder auf die Karte tippen."; return; }
    if(link && !/^https:\/\//i.test(link)){ $("#spMsg").textContent = "Der Link muss mit https:// beginnen."; return; }
    const ok = await safeWrite(() => state.db.collection("spots").add({ name, lat: +spotPick.lat.toFixed(6), lon: +spotPick.lon.toFixed(6), link: link.slice(0,500), cat: $("#spCat").value, note: $("#spNote").value.trim().slice(0,200), region: nearestRegion(spotPick.lat, spotPick.lon), at: Date.now() }));
    if(ok){ f.reset(); spotPick = null; if(spotPickMarker){ spotPickMarker.remove(); spotPickMarker = null; } $("#spResults").innerHTML = ""; $("#spMsg").textContent = "Gemerkt."; }
  });
  bindSpotList(v);
}
function bindSpotList(v){
  v.querySelectorAll("[data-spdel]").forEach(b => b.addEventListener("click", async () => { if(b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "wirklich?"; return; } await safeWrite(() => state.db.doc("spots/" + b.dataset.spdel).delete()); }));
  v.querySelectorAll("[data-spfly]").forEach(b => b.addEventListener("click", () => { const s = (state.spots||[]).find(x => x.id === b.dataset.spfly); if(s && spotMap){ spotMap.setView([s.lat, s.lon], 15); $("#spotMap").scrollIntoView({ behavior: "smooth", block: "center" }); } }));
}

function renderOrte(){
  const v = $("#v-orte");
  if(!v.dataset.built){
    v.innerHTML = `<div class="sechead"><h2>Orte & Tipps</h2></div>${spotsHtml()}<div id="guideArea" style="display:grid;gap:14px"></div>`;
    v.dataset.built = "1"; bindSpots(v); initSpotMap();
  } else {
    const cnt = v.querySelector("#spotCard .sechead .small"); if(cnt) cnt.textContent = `${(state.spots||[]).length} Tipps`;
    $("#spotList").innerHTML = spotListHtml(); bindSpotList(v); drawSpots(false);
    if(spotMap) setTimeout(() => spotMap.invalidateSize(), 50);
  }
  renderGuides();
}

/* ============ ORGA ============ */
let todoMode = "open";
function slug(s){ return s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function todoRow(t){
  const key = "todo-"+t.id, c = state.checks[key];
  const dl = daysUntil(t.due);
  let dueChip = dl < 0 ? `<span class="chip crit">überfällig</span>` : dl <= 3 ? `<span class="chip warn">bis ${fmtDue(t.due)}</span>` : `<span class="chip grey">bis ${fmtDue(t.due)}</span>`;
  if(t.done) dueChip = c?.by ? `<span class="chip ok">${esc(nameOf(c.by))}</span>` : `<span class="chip ok">erledigt</span>`;
  const prioDot = t.prio === "crit" ? '<span class="chip crit" style="margin-right:6px">wichtig</span>' : "";
  return `<div class="todo ${t.done ? "done" : ""}">
    <input type="checkbox" class="chk" id="c-${esc(key)}" data-check="${esc(key)}" ${t.done ? "checked" : ""} ${(!state.canWrite || t.auto) ? "disabled" : ""} aria-label="${esc(t.t)} erledigt">
    <label class="tt" for="c-${esc(key)}"><b>${prioDot}${esc(t.t)}</b>${t.sub ? `<div class="sub">${esc(t.sub)}</div>` : ""}${t.link && /^https:\/\//.test(t.link) ? `<div class="sub"><a href="${esc(t.link)}" target="_blank" rel="noopener">${esc(t.link.replace(/^https?:\/\//,""))}</a></div>` : ""}${t.auto ? '<div class="sub">Hakt sich automatisch ab, wenn alle drei Platzhalter gefüllt sind.</div>' : ""}</label>
    <span class="due">${dueChip}</span></div>`;
}
function renderOrga(){
  const v = $("#v-orga");
  const todos = openTodos().sort((a,b) => (a.done - b.done) || a.due.localeCompare(b.due));
  const shown = todoMode === "open" ? todos.filter(t => !t.done) : todos;
  const ps = packStats();
  v.innerHTML = `<div class="sechead"><h2>Orga</h2><span class="small muted">Häkchen sehen Victor und Felix gleichzeitig</span></div>
  <div class="card">
    <div class="sechead"><h3>To-dos vor der Reise</h3>
      <div class="seg" role="group" aria-label="Filter"><button type="button" data-m="open" aria-pressed="${todoMode==="open"}">Offen</button><button type="button" data-m="all" aria-pressed="${todoMode==="all"}">Alle</button></div></div>
    <div>${shown.map(todoRow).join("") || '<p class="muted">Alles erledigt. Stark.</p>'}</div>
    ${state.canWrite ? `<form class="addrow" id="addTodo"><input id="todoText" placeholder="Neues To-do" maxlength="140" required><input id="todoDue" type="date" value="2026-11-12" min="2026-11-01" max="2026-11-30" aria-label="Fällig am"><button class="btn" type="submit">Hinzufügen</button></form>` : ""}
  </div>
  <div class="card">
    <div class="sechead"><h3>Packliste</h3><span class="small muted">${ps.done} von ${ps.total} eingepackt</span></div>
    <div class="bar" style="margin-bottom:12px"><i style="width:${Math.round(ps.done/Math.max(ps.total,1)*100)}%"></i></div>
    <div class="grid2">${PACK.map(c => {
      const extra = state.packExtra.filter(p => p.cat === c.cat);
      const ids = c.items.map((_,i) => `pack-${slug(c.cat)}-${i}`).concat(extra.map(p => "pack-x-"+p.id));
      const d = ids.filter(id => state.checks[id]?.done).length;
      return `<div class="packcat"><h3>${esc(c.cat)} <span class="small muted">${d}/${ids.length}</span></h3>
        ${c.items.map((it,i) => packRow(`pack-${slug(c.cat)}-${i}`, it)).join("")}
        ${extra.map(p => packRow("pack-x-"+p.id, p.text, p.id)).join("")}</div>`;
    }).join("")}</div>
    ${state.canWrite ? `<form class="addrow" id="addPack"><input id="packText" placeholder="Fehlt etwas? z. B. Spielkarten" maxlength="80" required><select id="packCat" aria-label="Kategorie">${PACK.map(c => `<option>${esc(c.cat)}</option>`).join("")}</select><button class="btn" type="submit">Hinzufügen</button></form>` : ""}
  </div>
  <div class="grid2">
    <div class="card hl"><h3>Geld</h3>
      <ul class="dots">
        <li><b>Argentinien:</b> Pesos (ARS). Karten (Visa/Mastercard) laufen zum fast gleichen Kurs wie Bargeld-Tausch, deshalb Karte für Hotels und Restaurants.</li>
        <li><b>Bar brauchen ihr vor allem für:</b> den Fahrer (Gegenwert USD 1.400), Taxis, Trinkgeld, kleine Läden.</li>
        <li><b>Tauschen:</b> Euro in Wechselstuben (Casas de cambio) in Buenos Aires oder Ushuaia, nie auf der Straße. Alternative: Western Union an sich selbst senden und in Pesos abholen.</li>
        <li><b>Chile:</b> Chilenische Pesos (CLP). Im Park zahlt ihr in den Refugios meist mit Karte, etwas Bargeld als Reserve.</li>
        <li><b>Achtung:</b> Pesos lassen sich schlecht zurücktauschen, also nicht zu viel wechseln.</li>
      </ul>
      ${noteBox("geld","Kurs, getauschte Beträge, wer hat wie viel bezahlt …")}
    </div>
    <div class="card crit"><h3>Notfall</h3>
      <dl class="kv">
        <dt>Argentinien</dt><dd>911 Polizei · 107 Rettung · 100 Feuerwehr</dd>
        <dt>Chile</dt><dd>133 Polizei · 131 Rettung · 132 Feuerwehr</dd>
        <dt>Botschaft BA</dt><dd>Deutsche Botschaft Buenos Aires, Villanueva 1055 · +54 11 4778-2500</dd>
        <dt>Botschaft CL</dt><dd>Deutsche Botschaft Santiago, Las Hualtatas 5677 · +56 2 2463 2500</dd>
        <dt>Im Park</dt><dd>Ranger in jeder Guardería, Notfunk in den Refugios</dd>
      </dl>
      <p class="small muted" style="margin:8px 0 6px">Botschaftsdaten kurz vor Abreise auf auswaertiges-amt.de gegenchecken.</p>
      ${noteBox("notfall","Versicherungs-Hotline, Policennummer, Notfallkontakte zu Hause …")}
    </div>
  </div>
  <div class="card"><h3>Gut zu wissen</h3>
    <dl class="kv">
      <dt>Zeit</dt><dd>UTC−3 in Argentinien und Magallanes (Chile): 4 Std. hinter Deutschland</dd>
      <dt>Strom</dt><dd>220 V. Argentinien Typ I, Chile Typ C/L: Universaladapter mitnehmen</dd>
      <dt>Pässe</dt><dd>${esc(PASSPORTS)}</dd>
      <dt>Einreise</dt><dd>Deutsche brauchen für beide Länder kein Visum für Touristenaufenthalte</dd>
      <dt>Sprache</dt><dd>Spanisch, im Park und in Hotels oft Englisch</dd>
    </dl>
  </div>`;
  bindChecks(v); bindNotes(v);
  v.querySelector(".seg").addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return; todoMode = b.dataset.m; renderOrga(); });
  const ft = v.querySelector("#addTodo");
  if(ft) ft.addEventListener("submit", async e => { e.preventDefault(); const text = $("#todoText").value.trim(); if(!text) return;
    await safeWrite(() => state.db.collection("todoextra").add({text, due: $("#todoDue").value || "2026-11-12", by: state.me, at: Date.now()})); });
  const fp = v.querySelector("#addPack");
  if(fp) fp.addEventListener("submit", async e => { e.preventDefault(); const text = $("#packText").value.trim(); if(!text) return;
    await safeWrite(() => state.db.collection("packextra").add({text, cat: $("#packCat").value, by: state.me, at: Date.now()})); });
}
function packRow(key, label, extraId){
  const c = state.checks[key];
  return `<div class="pk ${c?.done ? "done" : ""}">
    <input type="checkbox" class="chk" id="c-${esc(key)}" data-check="${esc(key)}" ${c?.done ? "checked" : ""} ${state.canWrite ? "" : "disabled"}>
    <label for="c-${esc(key)}"><span class="l">${esc(label)}</span></label>
    <span class="who">${c?.done && c.by ? esc(nameOf(c.by)) : ""}${extraId && state.canWrite ? ` <button class="copy" type="button" data-delpack="${esc(extraId)}" aria-label="${esc(label)} entfernen">entfernen</button>` : ""}</span></div>`;
}

/* ============ KOSTEN ============ */
const CURS = ["EUR","ARS","CLP","USD"];
const CATS = ["Flüge","Unterkunft","Transport","Essen & Trinken","Touren & Eintritt","Ausrüstung","Sonstiges"];
const eur = n => n.toLocaleString("de-DE",{style:"currency",currency:"EUR"});
function toEur(c){ if(c.cur === "EUR") return c.amount; const r = Number(state.rates[c.cur]); return r > 0 ? c.amount / r : null; }
function shareOf(c, who){ return c.split === "half" ? 0.5 : (c.split === who ? 1 : 0); }
function costSummary(){
  let paidV=0, paidF=0, shareV=0, shareF=0, total=0, missing=0; const byCat={};
  state.costs.forEach(c => { const e = toEur(c); if(e == null){ missing++; return; }
    total += e; if(c.payer === "victor") paidV += e; else paidF += e;
    shareV += e*shareOf(c,"victor"); shareF += e*shareOf(c,"felix");
    byCat[c.cat||"Sonstiges"] = (byCat[c.cat||"Sonstiges"]||0) + e; });
  return {paidV,paidF,shareV,shareF,total,missing,byCat,net:paidV-shareV};
}
let costPrefill = null;
/* Umrechner: eigener Tauschkurs oder offizieller Referenzkurs (offline zwischengespeichert) */
let fxRef = null, fxCur = "ARS", fxAmt = "10000", fxMode = null;
async function loadFx(){
  if(!fxRef) fxRef = ls.get("pat:fx-ref");
  if(navigator.onLine === false || (fxRef && Date.now() - fxRef.at < 6*3600e3)) return;
  try{
    const r = await fetch("https://open.er-api.com/v6/latest/EUR"); const j = await r.json();
    if(j && j.result === "success" && j.rates){ fxRef = { at: Date.now(), rates: { ARS: j.rates.ARS, CLP: j.rates.CLP, USD: j.rates.USD } }; ls.set("pat:fx-ref", fxRef); if(current === "kosten") queueRender(); }
  }catch(e){}
}
function fxRate(cur){
  const own = Number(state.rates[cur]), ref = fxRef && fxRef.rates && Number(fxRef.rates[cur]);
  const mode = fxMode || (own > 0 ? "own" : "ref");
  if(mode === "own" && own > 0) return { r: own, src: "euer Tauschkurs" };
  if(ref > 0) return { r: ref, src: "offizieller Kurs vom " + new Date(fxRef.at).toLocaleDateString("de-DE",{day:"numeric",month:"numeric"}) };
  if(own > 0) return { r: own, src: "euer Tauschkurs" };
  return null;
}
const fmtNum = (n, d) => n.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
function fxUpdate(){
  const out = $("#fxOut"), note = $("#fxNote"); if(!out) return;
  const amt = parseFloat(String($("#fxAmt").value).replace(/\./g,"").replace(",", ".")); const R = fxRate(fxCur);
  if(!R){ out.textContent = "–"; note.textContent = "Noch kein Kurs: unten unter Wechselkurse euren Tauschkurs eintragen oder einmal mit Netz öffnen."; return; }
  out.textContent = isFinite(amt) ? fmtNum(amt / R.r, 2) + " €" : "–";
  note.textContent = `1 € = ${fmtNum(R.r, R.r < 10 ? 3 : 0)} ${fxCur} · ${R.src}` + (fxCur === "ARS" ? " · Wechselstuben und Kartenkurs können leicht abweichen" : "");
  const back = $("#fxBack"); if(back) back.innerHTML = [10, 50, 100].map(e => `<span class="chip grey">${e} € = ${fmtNum(e * R.r, 0)} ${esc(fxCur)}</span>`).join("");
}
function converterHtml(){
  const own = Number(state.rates[fxCur]) > 0, ref = fxRef && fxRef.rates && fxRef.rates[fxCur];
  return `<div class="card hl"><div class="sechead"><h3>Umrechner</h3>${own && ref ? `<div class="seg" role="group" aria-label="Kurs"><button type="button" data-fxm="own" aria-pressed="${(fxMode||"own") === "own"}">Unser Kurs</button><button type="button" data-fxm="ref" aria-pressed="${fxMode === "ref"}">Offiziell</button></div>` : ""}</div>
    <div class="conv">
      <input id="fxAmt" class="fxin" inputmode="decimal" autocomplete="off" value="${esc(fxAmt)}" aria-label="Betrag">
      <select id="fxSel" aria-label="Währung">${["ARS","CLP","USD"].map(k => `<option ${k === fxCur ? "selected" : ""}>${k}</option>`).join("")}</select>
      <span class="fxeq">=</span><b id="fxOut" class="fxout money">–</b>
    </div>
    <div class="quick" style="margin-top:8px">${(fxCur === "ARS" ? [1000, 5000, 20000, 100000] : fxCur === "CLP" ? [1000, 10000, 50000] : [10, 50, 100]).map(n => `<button type="button" data-fxa="${n}">${fmtNum(n,0)}</button>`).join("")}</div>
    <div id="fxBack" class="chips" style="margin-top:8px"></div>
    <p class="small muted" id="fxNote" style="margin:6px 0 0"></p></div>`;
}
function bindConverter(v){
  const a = v.querySelector("#fxAmt"); if(!a) return;
  a.addEventListener("input", () => { fxAmt = a.value; fxUpdate(); });
  v.querySelector("#fxSel").addEventListener("change", e => { fxCur = e.target.value; renderKosten(); });
  v.querySelectorAll("[data-fxa]").forEach(b => b.addEventListener("click", () => { fxAmt = String(b.dataset.fxa); a.value = fmtNum(+b.dataset.fxa, 0); fxUpdate(); }));
  v.querySelectorAll("[data-fxm]").forEach(b => b.addEventListener("click", () => { fxMode = b.dataset.fxm; renderKosten(); }));
  fxUpdate();
}
function renderKosten(){
  const v = $("#v-kosten"); const S = costSummary(); const f = costPrefill || {};
  const settle = Math.abs(S.net) < 0.5 ? `<b>Quitt</b><span class="muted">Niemand schuldet niemandem etwas</span>`
    : S.net > 0 ? `<b>Felix → Victor ${eur(S.net)}</b><span class="muted">So viel muss Felix Victor überweisen</span>`
    : `<b>Victor → Felix ${eur(-S.net)}</b><span class="muted">So viel muss Victor Felix überweisen</span>`;
  const maxCat = Math.max(1, ...Object.values(S.byCat));
  const fmtAmt = c => `${c.amount.toLocaleString("de-DE",{maximumFractionDigits:2})} ${c.cur}`;
  v.innerHTML = `<div class="sechead"><h2>Kosten &amp; Abrechnung</h2><span class="small muted">Alles in Euro umgerechnet</span></div>
  ${converterHtml()}
  <div class="card hl settle">${settle}${S.missing ? `<span class="chip warn" style="justify-self:center">${S.missing} Ausgabe(n) ohne Wechselkurs, unten Kurs eintragen</span>` : ""}</div>
  <div class="stats">
    <div class="stat"><b class="money">${eur(S.total)}</b><span>Gesamt</span></div>
    <div class="stat"><b class="money">${eur(S.paidV)}</b><span>bezahlt von Victor · Anteil ${eur(S.shareV)}</span></div>
    <div class="stat"><b class="money">${eur(S.paidF)}</b><span>bezahlt von Felix · Anteil ${eur(S.shareF)}</span></div>
  </div>
  ${state.canWrite && state.db ? `<div class="card"><h3>Ausgabe hinzufügen</h3>
    <div class="quick" style="margin-bottom:10px"><span class="small muted">Schnell: </span>${QUICK.map((q,i) => `<button type="button" data-quick="${i}">${esc(q.what)}</button>`).join("")}</div>
    <form class="costform" id="costForm">
      <label class="wide">Wofür?<input id="cWhat" required maxlength="100" value="${esc(f.what||"")}" placeholder="z. B. Abendessen Parrilla"></label>
      <label>Betrag<input id="cAmt" type="number" step="0.01" min="0" required inputmode="decimal" value="${esc(f.amount ?? "")}"></label>
      <label>Währung<select id="cCur">${CURS.map(c => `<option ${c === (f.cur||"EUR") ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <label>Bezahlt von<select id="cPayer"><option value="victor">Victor</option><option value="felix">Felix</option></select></label>
      <label>Aufteilung<select id="cSplit"><option value="half">50 / 50</option><option value="victor">nur Victor</option><option value="felix">nur Felix</option></select></label>
      <label>Kategorie<select id="cCat">${CATS.map(c => `<option ${c === f.cat ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <label>Datum<input id="cDate" type="date" value="${esc(f.date || new Date().toISOString().slice(0,10))}"></label>
      <div class="wide"><button class="btn" type="submit">Speichern</button> <span class="small muted" id="cMsg"></span></div>
    </form></div>` : ""}
  <div class="card"><div class="sechead"><h3>Alle Ausgaben</h3><span class="small muted">${state.costs.length} Einträge</span></div>
    ${state.costs.length ? state.costs.map(c => { const e = toEur(c); return `<div class="costrow">
      <div><b>${esc(c.what)}</b><div class="meta">${esc(c.date ? fmtDue(c.date) : "")} · ${esc(c.cat||"")} · bezahlt von ${c.payer === "felix" ? "Felix" : "Victor"} · ${c.split === "half" ? "50/50" : c.split === "felix" ? "nur Felix" : "nur Victor"}</div></div>
      <div style="text-align:right"><b class="money">${e == null ? "?" : eur(e)}</b>${c.cur !== "EUR" ? `<div class="meta money">${fmtAmt(c)}</div>` : ""}${state.canWrite ? `<div><button class="copy" type="button" data-delcost="${esc(c.id)}">löschen</button></div>` : ""}</div></div>`; }).join("")
      : '<p class="muted">Noch keine Ausgaben. Oben mit den Schnell-Knöpfen die großen Posten wie Flüge und Transfer eintragen.</p>'}
  </div>
  <div class="grid2">
    <div class="card"><h3>Nach Kategorie</h3><div class="catbars">${Object.entries(S.byCat).sort((a,b) => b[1]-a[1]).map(([k,val]) => `<div><span>${esc(k)}</span><i style="width:${Math.max(4,Math.round(val/maxCat*100))}%"></i><span class="money">${eur(val)}</span></div>`).join("") || '<p class="muted small">Noch nichts.</p>'}</div></div>
    <div class="card"><h3>Wechselkurse</h3><p class="small muted" style="margin:0 0 8px">Wie viel bekommt ihr für 1 Euro? Tragt den Kurs ein, zu dem ihr tatsächlich tauscht. Alle Beträge rechnen sich dann neu.</p>
      <form class="costform" id="rateForm">${["ARS","CLP","USD"].map(c => `<label>1 € = … ${c}<input type="number" step="any" min="0" id="r-${c}" value="${esc(state.rates[c] ?? "")}" ${state.canWrite ? "" : "readonly"}></label>`).join("")}
      ${state.canWrite ? `<div class="wide"><button class="btn ghost" type="submit">Kurse speichern</button></div>` : ""}</form></div>
  </div>`;
  bindConverter(v); loadFx();
  v.querySelectorAll("[data-quick]").forEach(b => b.addEventListener("click", () => { costPrefill = QUICK[+b.dataset.quick]; renderKosten(); $("#cAmt").focus(); }));
  const cf = v.querySelector("#costForm");
  if(cf) cf.addEventListener("submit", async e => { e.preventDefault();
    const amount = parseFloat($("#cAmt").value); if(!(amount >= 0)) return;
    const ok = await safeWrite(() => state.db.collection("kosten").add({what: $("#cWhat").value.trim(), amount, cur: $("#cCur").value, payer: $("#cPayer").value, split: $("#cSplit").value, cat: $("#cCat").value, date: $("#cDate").value, by: state.me, at: Date.now()}));
    if(ok){ costPrefill = null; cf.reset(); $("#cMsg").textContent = "Gespeichert"; } });
  const rf = v.querySelector("#rateForm");
  if(rf) rf.addEventListener("submit", async e => { e.preventDefault();
    const o = {}; ["ARS","CLP","USD"].forEach(c => { const n = parseFloat($("#r-"+c).value); if(n > 0) o[c] = n; });
    await safeWrite(() => state.db.doc("settings/rates").set({...o, by: state.me, at: Date.now()})); });
  v.querySelectorAll("[data-delcost]").forEach(b => b.addEventListener("click", async () => {
    if(b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "wirklich löschen?"; return; }
    await safeWrite(() => state.db.doc("kosten/" + b.dataset.delcost).delete()); }));
}

/* ============ CLAUDE ============ */
const CLAUDE_URL = "https://claude.ai/code/session_01E1q44ajYg6R6626ggh89k4";
function renderClaude(){
  const v = $("#v-claude"); const W = state.wishes || []; const open = W.filter(w => !w.done);
  v.innerHTML = `<div class="sechead"><h2>Mit Claude weiterbauen</h2></div>
  <div class="card hl"><h3>Unser Chat</h3>
    <p style="margin:0 0 10px">Öffnet die Unterhaltung, in der diese App entstanden ist. Claude kann dort direkt im GitHub-Projekt Änderungen machen und sie hochladen.</p>
    <a class="btn" href="${CLAUDE_URL}" target="_blank" rel="noopener" style="text-decoration:none">Chat mit Claude öffnen</a></div>
  <div class="card"><div class="sechead"><h3>Wunschliste</h3><span class="small muted">${open.length} offen</span></div>
    <p class="small muted" style="margin:0 0 8px">Ideen und Fehler sammeln, auch offline. Später gesammelt an Claude schicken.</p>
    ${state.canWrite ? `<form class="addrow" id="wishForm"><input id="wishText" maxlength="500" required placeholder="z. B. Packliste nach Personen trennen"><button class="btn" type="submit">Notieren</button></form>` : ""}
    <div style="margin-top:8px">${W.map(w => `<div class="wish ${w.done ? "done" : ""}"><input type="checkbox" class="chk" data-wish="${esc(w.id)}" ${w.done ? "checked" : ""} aria-label="erledigt"><div><div class="wt">${esc(w.text)}</div><div class="small muted">${esc(nameOf(w.by))} · ${new Date(w.at).toLocaleDateString("de-DE",{day:"numeric",month:"numeric"})}</div></div><button class="copy" type="button" data-delwish="${esc(w.id)}">löschen</button></div>`).join("") || '<p class="muted small">Noch keine Wünsche.</p>'}</div>
    ${open.length ? `<div style="margin-top:12px;display:grid;gap:6px"><button class="btn wa" type="button" id="wishSend" style="background:var(--accent);border-color:var(--accent)">Offene Wünsche kopieren & Claude öffnen</button><span class="small muted" id="wishMsg">Der Text liegt danach in der Zwischenablage, im Chat einfach einfügen.</span></div>` : ""}
  </div>
  <div class="card"><h3>Gut zu wissen</h3><ul class="dots"><li>Claude braucht Internet. Im Funkloch Wünsche hier notieren, später schicken.</li><li>Änderungen landen nach 1–2 Minuten in der App. Danach die App einmal neu öffnen.</li></ul></div>`;
  const f = $("#wishForm"); if(f) f.addEventListener("submit", async e => { e.preventDefault(); const t = $("#wishText").value.trim(); if(!t) return; await safeWrite(() => state.db.collection("wishes").add({text: t, done: false, at: Date.now()})); });
  v.querySelectorAll("[data-wish]").forEach(cb => cb.addEventListener("change", async () => { const w = W.find(x => x.id === cb.dataset.wish); if(!w) return; const { id, ...rest } = w; await safeWrite(() => state.db.doc("wishes/" + id).set({...rest, done: cb.checked})); }));
  v.querySelectorAll("[data-delwish]").forEach(b => b.addEventListener("click", async () => { if(b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "wirklich?"; return; } await safeWrite(() => state.db.doc("wishes/" + b.dataset.delwish).delete()); }));
  const s = $("#wishSend"); if(s) s.addEventListener("click", async () => {
    const txt = "Wünsche für unsere Patagonien-App (github.com/vbrt/patagonien):\n" + open.map((w,i) => `${i+1}. ${w.text} (${nameOf(w.by)})`).join("\n");
    try{ await navigator.clipboard.writeText(txt); $("#wishMsg").textContent = "Kopiert. Im Chat einfügen."; }catch(e){ $("#wishMsg").textContent = "Kopieren ging nicht, bitte Wünsche abtippen."; }
    window.open(CLAUDE_URL, "_blank", "noopener");
  });
}

/* ============ BINDINGS ============ */
async function safeWrite(fn){
  if(!state.db){ showBanner("Speichern geht gerade nicht: Die gemeinsame Ablage ist nicht verbunden. Bitte angemeldet öffnen."); return false; }
  try{ await fn(); return true; }
  catch(e){
    if(e && e.code === "invalid_argument"){ state.canWrite = false; showBanner("Du hast hier nur Lesezugriff. Bitte Victor, dich als Bearbeiter einzuladen."); renderAll(); }
    else if(e && e.code === "unavailable"){ await new Promise(r => setTimeout(r, 600 + Math.random()*800)); try{ await fn(); return true; }catch(_){ showBanner("Speichern hat nicht geklappt. Bitte gleich nochmal versuchen."); } }
    else showBanner("Speichern hat nicht geklappt" + (e && e.message ? ": " + e.message : "") + ".");
    return false;
  }
}
function bindChecks(root){
  root.querySelectorAll("[data-check]").forEach(el => el.addEventListener("change", async () => {
    const key = el.dataset.check;
    await safeWrite(() => state.db.doc("checks/" + key).set({done: el.checked, by: state.me, at: Date.now()}));
  }));
  root.querySelectorAll("[data-delpack]").forEach(b => b.addEventListener("click", async () => {
    const id = b.dataset.delpack;
    await safeWrite(() => state.db.doc("packextra/" + id).delete());
  }));
}
const noteTimers = {};
function bindNotes(root){
  root.querySelectorAll("textarea[data-note]").forEach(t => {
    t.addEventListener("input", () => {
      const key = t.dataset.note;
      clearTimeout(noteTimers[key]);
      const meta = root.querySelector(`[data-meta="${CSS.escape(key)}"]`);
      if(meta) meta.textContent = "schreibt …";
      noteTimers[key] = setTimeout(async () => {
        const ok = await safeWrite(() => state.db.doc("notes/" + key).set({text: t.value.slice(0,4000), by: state.me, at: Date.now()}));
        if(meta) meta.textContent = ok ? "gespeichert" : "nicht gespeichert";
      }, 900);
    });
  });
}
function bindUploads(root){
  root.querySelectorAll("input[data-upload]").forEach(inp => inp.addEventListener("change", async () => {
    const slot = inp.dataset.upload;
    const st = root.querySelector(`[data-upstatus="${CSS.escape(slot)}"]`);
    const files = [...inp.files]; if(!files.length || !state.assets) return;
    const done = [...(state.uploads[slot]?.files || [])];
    for(const [i,f] of files.entries()){
      if(st) st.textContent = `Lade ${i+1} von ${files.length} hoch …`;
      try{
        const type = f.type || (f.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
        const r = await state.assets.upload(f, type ? {type} : undefined);
        done.push({id: r.id, name: f.name.slice(0,120), type: r.contentType});
      }catch(e){
        const msg = {too_large:"Datei zu groß (max. 20 MB)",unsupported_type:"Nur Bilder oder PDF",rate_limited:"Zu viele Uploads, kurz warten",quota_or_state:"Speicher voll"}[e?.code] || "Upload fehlgeschlagen";
        if(st) st.textContent = msg; inp.value = ""; return;
      }
    }
    const ok = await safeWrite(() => state.db.doc("uploads/" + slot).set({files: done, by: state.me, at: Date.now()}));
    if(st) st.textContent = ok ? "Fertig" : "Hochgeladen, aber nicht gespeichert";
    inp.value = "";
  }));
}
function bindCopy(root){
  root.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
    try{ await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Kopiert"; setTimeout(() => b.textContent = "Kopieren", 1400); }
    catch(e){ b.textContent = "Bitte markieren"; }
  }));
}
function showBanner(t){ const b = $("#banner"); b.textContent = t; b.hidden = false; }

/* ============ ROUTING ============ */
const VIEWS = ["heute","plan","buchungen","trek","orte","posten","kosten","orga","claude"];
let current = "heute";
function route(){
  const h = location.hash.replace("#","");
  current = VIEWS.includes(h) ? h : "heute";
  VIEWS.forEach(v => $("#v-"+v).classList.toggle("on", v === current));
  document.querySelectorAll("nav.tabs a").forEach(a => a.toggleAttribute("aria-current", a.getAttribute("href") === "#"+current) || a.removeAttribute("aria-current"));
  document.querySelectorAll("nav.tabs a").forEach(a => { if(a.getAttribute("href") === "#"+current) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
  renderCurrent();
}
function renderCurrent(){
  const active = document.activeElement;
  // Nicht neu zeichnen, während jemand in ein Notizfeld schreibt
  if(active && active.matches && active.matches("textarea[data-note], .addrow input, .addrow select, .costform input, .costform select, .fxin, #spotForm input, #spotForm textarea, #spotForm select")) return;
  ({heute:renderHeute,plan:renderPlan,buchungen:renderBuchungen,trek:renderTrek,orte:renderOrte,posten:()=>{},kosten:renderKosten,orga:renderOrga,claude:renderClaude})[current]();
}
function renderAll(){ renderCount(); renderCurrent(); }
window.addEventListener("hashchange", () => { route(); window.scrollTo(0,0); });

/* ============ START: Supabase-Anbindung (offline-fähig) ============ */
const CACHE_KEY = "pat:cockpit-cache-v1", OPS_KEY = "pat:cockpit-ops-v1";
const ls = { get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }, del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
const SBC = window.SB;
let ROWS = {};      // coll -> id -> data
let OPS = ls.get(OPS_KEY) || [];
let signed = {};    // Pfad -> signierte URL
let signedAt = Date.now();
function applyTrip(t){
  if(!t) return;
  DAYS = t.days || []; FLIGHTS = t.flights || []; STAYS = t.stays || []; TREK = t.trek || []; TODOS = t.todos || []; PACK = t.pack || []; PLACES = t.places || {}; QUICK = t.quick || []; TRANSFER = t.transfer || {}; PASSPORTS = t.passports || "";
}
function rowsToState(){
  const c = n => ROWS[n] || {};
  const list = n => Object.entries(c(n)).map(([id,d]) => ({id, ...d}));
  applyTrip(c("private").trip);
  state.checks = c("checks"); state.notes = c("notes"); state.uploads = c("uploads");
  state.packExtra = list("packextra"); state.todoExtra = list("todoextra");
  state.costs = list("kosten").sort((a,b) => (b.date||"").localeCompare(a.date||"") || (b.at||0)-(a.at||0));
  state.beers = list("bier").sort((a,b) => (b.at||0)-(a.at||0));
  state.rates = c("settings").rates || {};
  state.spots = list("spots");
  state.wishes = list("wishes").sort((a,b) => (a.done - b.done) || (b.at||0)-(a.at||0));
}
function localApply(op){
  ROWS[op.coll] = ROWS[op.coll] || {};
  if(op.op === "set") ROWS[op.coll][op.id] = op.data; else delete ROWS[op.coll][op.id];
}
const uid = () => (crypto.randomUUID && crypto.randomUUID()) || ("x" + Date.now() + Math.random().toString(36).slice(2));
let flushing = false;
async function flushOps(){
  if(flushing || !OPS.length || navigator.onLine === false) { updateSync(); return; }
  flushing = true;
  while(OPS.length){
    const op = OPS[0];
    try{
      const q = op.op === "set"
        ? SBC.from("cockpit_items").upsert({ coll: op.coll, id: op.id, data: op.data })
        : SBC.from("cockpit_items").delete().eq("coll", op.coll).eq("id", op.id);
      const { error } = await q; if(error) throw error;
      OPS.shift(); ls.set(OPS_KEY, OPS);
    }catch(e){ console.warn(e); break; }
  }
  flushing = false; updateSync();
}
function enqueue(op){ localApply(op); OPS.push(op); ls.set(OPS_KEY, OPS); ls.set(CACHE_KEY, ROWS); rowsToState(); queueRender(); flushOps(); }
// Adapter mit derselben Schnittstelle wie zuvor (doc/collection)
const dbAdapter = {
  doc(path){ const [coll, id] = path.split("/"); return {
    set: async data => { enqueue({ op:"set", coll: coll === "settings" ? "settings" : coll, id, data: { ...data, by: state.me } }); },
    delete: async () => { enqueue({ op:"del", coll, id }); } }; },
  collection(coll){ return { add: async data => { const id = uid(); enqueue({ op:"set", coll, id, data: { ...data, by: state.me } }); return { id }; } }; }
};
// Datei-Ablage für Felix' Buchungen: privater Speicher, nur für euch beide
const assetsAdapter = {
  async upload(file, opt){
    const type = (opt && opt.type) || file.type || "application/octet-stream";
    const path = `belege/${uid()}-${(file.name || "datei").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,60)}`;
    const { error } = await SBC.storage.from("private").upload(path, file, { contentType: type, upsert: false });
    if(error) throw { code: /size/i.test(error.message||"") ? "too_large" : "upstream_error", message: error.message };
    await signPaths([path]);
    return { id: path, url: signed[path], contentType: type };
  }
};
async function signPaths(paths){
  const need = paths.filter(p => p && !signed[p]); if(!need.length) return;
  try{ const { data } = await SBC.storage.from("private").createSignedUrls(need, 60*60*2); (data||[]).forEach(x => { if(x.signedUrl) signed[x.path] = x.signedUrl; }); }catch(e){}
}
function blobUrl(id){ return signed[id] || "#"; }
function updateSync(){
  const off = navigator.onLine === false;
  $("#offline").hidden = !off;
  $("#sync").textContent = off ? "Offline · zuletzt geladener Stand" : OPS.length ? `${OPS.length} Änderung(en) warten auf Netz …` : "Verbunden · Änderungen sieht der andere beim nächsten Laden";
}
async function pull(){
  if(navigator.onLine === false) return;
  const { data, error } = await SBC.from("cockpit_items").select("coll,id,data").limit(5000);
  if(error){ console.warn(error); return; }
  const fresh = {}; (data||[]).forEach(r => { (fresh[r.coll] = fresh[r.coll] || {})[r.id] = r.data; });
  ROWS = fresh; OPS.forEach(localApply);   // eigene, noch nicht gesendete Änderungen behalten
  ls.set(CACHE_KEY, ROWS);
  if(Date.now() - signedAt > 90*60*1000){ signed = {}; signedAt = Date.now(); }
  const paths = Object.values(ROWS.uploads || {}).flatMap(u => (u.files||[]).map(f => f.id));
  await signPaths(paths);
  rowsToState(); queueRender();
}
async function loadWeatherOM(){
  if(navigator.onLine === false) return;
  const L = WXLOC;
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + L.map(l => l.lat).join(",") + "&longitude=" + L.map(l => l.lon).join(",") + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_gusts_10m_max&timezone=auto&forecast_days=7";
  try{
    const r = await fetch(url); const j = await r.json(); const arr = Array.isArray(j) ? j : [j];
    const TXT = {0:"Klar",1:"Überwiegend klar",2:"Teils bewölkt",3:"Bedeckt",45:"Nebel",48:"Nebel",51:"Niesel",53:"Niesel",55:"Niesel",61:"Leichter Regen",63:"Regen",65:"Starker Regen",71:"Leichter Schnee",73:"Schnee",75:"Starker Schnee",80:"Schauer",81:"Schauer",82:"Heftige Schauer",85:"Schneeschauer",86:"Schneeschauer",95:"Gewitter",96:"Gewitter",99:"Gewitter"};
    state.wx = { updated: new Date().toISOString(), places: arr.map((x,i) => ({ key: L[i].key, name: L[i].name, days: (x.daily.time||[]).map((d,k) => ({ date: d, hi: Math.round(x.daily.temperature_2m_max[k]), lo: Math.round(x.daily.temperature_2m_min[k]), text: [TXT[x.daily.weather_code[k]] || "", x.daily.precipitation_probability_max[k] ? x.daily.precipitation_probability_max[k] + "% Regen" : ""].filter(Boolean).join(", "), wind: "Böen " + Math.round(x.daily.wind_gusts_10m_max[k]) + " km/h" })) })) };
    ls.set("pat:cockpit-wx", state.wx); queueRender();
  }catch(e){ state.wx = ls.get("pat:cockpit-wx"); }
}
function showGate(msg, email){
  document.querySelector("nav.tabs").hidden = true;
  document.querySelector("main").innerHTML = `<div class="gate card"><h2>Cockpit</h2><p class="muted" style="margin:0">Nur für Victor &amp; Felix.</p>
    ${msg ? `<p class="banner" style="margin:0">${esc(msg)}</p>` : ""}
    ${email ? `<button class="btn ghost" type="button" id="cOut">Abmelden (${esc(email)})</button>` : `<form class="login" id="cLogin"><label class="small" for="cEmail">Deine E-Mail-Adresse</label><input type="email" id="cEmail" required autocomplete="email" inputmode="email" placeholder="name@beispiel.de">
      <label class="small" for="cPw">Passwort (falls schon festgelegt)</label><input type="password" id="cPw" autocomplete="current-password" placeholder="leer lassen für Anmelde-Link">
      <button class="btn" type="submit">Anmelden</button><div class="msg" id="cMsg" aria-live="polite"></div></form>`}
    <a href="index.html" class="small">Zum öffentlichen Blog</a></div>`;
  const out = $("#cOut"); if(out) out.addEventListener("click", async () => { await SBC.auth.signOut(); location.reload(); });
  const f = $("#cLogin"); if(f) f.addEventListener("submit", async e => { e.preventDefault();
    const email = $("#cEmail").value.trim(), pw = $("#cPw").value;
    if(pw){ const { error } = await SBC.auth.signInWithPassword({ email, password: pw }); if(error){ $("#cMsg").textContent = "E-Mail oder Passwort falsch."; } else location.reload(); return; }
    const { error } = await SBC.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } });
    if(error) console.warn(error); $("#cMsg").textContent = error ? (window.loginErrorText ? window.loginErrorText(error) : error.message) : "Link ist unterwegs. Mail auf diesem Gerät öffnen und antippen."; });
}

let renderQueued = false;
function queueRender(){ if(renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; renderAll(); }); }

(async function start(){
  if(!SBC){ showGate("Die Datenbank ist nicht eingerichtet."); return; }
  const cache = ls.get(CACHE_KEY);
  const { data: { session } } = await SBC.auth.getSession();
  if(!session){ ls.del(CACHE_KEY); ls.del(OPS_KEY); showGate("Du bist in diesem Browser noch nicht angemeldet."); return; }
  state.me = (session.user.email || "").toLowerCase();
  state.db = dbAdapter; state.assets = assetsAdapter; state.canWrite = true;
  if(cache){ ROWS = cache; OPS.forEach(localApply); rowsToState(); }
  state.wx = ls.get("pat:cockpit-wx");
  renderCount(); route(); updateSync();
  if(navigator.onLine !== false){
    const { data: ok } = await SBC.rpc("is_editor");
    if(!ok){ showGate("Angemeldet, aber diese Adresse steht nicht in der Redaktionsliste oder ist noch nicht bestätigt.", state.me); return; }
  }
  await flushOps(); await pull(); loadWeatherOM();
  window.addEventListener("online", async () => { updateSync(); await flushOps(); await pull(); });
  window.addEventListener("offline", updateSync);
  document.addEventListener("visibilitychange", async () => { if(document.visibilityState === "visible"){ await flushOps(); await pull(); } });
  setInterval(async () => { if(document.visibilityState !== "visible") return; const a = document.activeElement; if(a && a.matches("input,textarea,select")) return; await flushOps(); await pull(); }, 30000);
  SBC.auth.onAuthStateChange(ev => { if(ev === "SIGNED_OUT"){ ls.del(CACHE_KEY); ls.del(OPS_KEY); location.reload(); } });
})();

})();
