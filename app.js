/* EA Performance OS v1 — offline localStorage */

const KEY = "ea_os_v1";

const todayISO = () => new Date().toISOString().slice(0,10);
const monthKey = (iso) => iso.slice(0,7);

function load(){
  const raw = localStorage.getItem(KEY);
  if(!raw) return {
    chain: { current: 0, longest: 0 },
    history: {}, // iso -> { status: "good"|"bad", closedAt: time }
    promises: [], // { id, text, tag, done }
    notes: { top3:"", quickNotes:"", weeklyPlan:"", monthlyGoals:"", dreamBoard:"" },
    quick: { workout:false, meditation:false, learning:false },
    money: { tx: [] }, // { iso, amt, cat, note }
    body: { target: 1800, consumed: 0, workoutNotes:"" },
    mind: { mins: 0, done:false, note:"" },
    growth: { mins: 0, topic:"", note:"" }
  };
  return JSON.parse(raw);
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); renderAll(); }

let state = load();

/* ---------- NAV ---------- */
document.querySelectorAll(".tab").forEach(t=>{
  t.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    const go = t.dataset.go;
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    document.getElementById(go).classList.add("active");
    renderAll();
  });
});

/* ---------- HEADER DATE ---------- */
function renderHeader(){
  const iso = todayISO();
  const d = new Date();
  const line = d.toLocaleDateString(undefined, { weekday:"long", year:"numeric", month:"short", day:"numeric" });
  document.getElementById("todayLine").textContent = line;

  const h = state.history[iso]?.status || "pending";
  const pill = document.getElementById("statusPill");
  if(h==="good"){ pill.textContent="Status: Kept ✅"; pill.style.color="#0b0f14"; pill.style.background="rgba(32,201,151,.95)"; }
  else if(h==="bad"){ pill.textContent="Status: Broken ❌"; pill.style.color="#fff"; pill.style.background="rgba(255,92,122,.95)"; }
  else { pill.textContent="Status: Pending"; pill.style.color=""; pill.style.background=""; }
}

/* ---------- DISCIPLINE LOGIC ---------- */
function allPromisesKept(){
  // must have at least 1 promise? We'll allow 0 but warn.
  return state.promises.length > 0 && state.promises.every(p=>p.done);
}

function setDayStatus(status){ // "good" or "bad"
  const iso = todayISO();

  // prevent changing past days (simple version)
  const existing = state.history[iso]?.status;
  // allow overwrite today only
  state.history[iso] = { status, closedAt: new Date().toISOString() };

  if(status === "good"){
    // chain increments only if promises are kept
    if(!allPromisesKept()){
      alert("You marked 'Kept', but not all promises are completed. Finish all promises first.");
      return;
    }
    state.chain.current += 1;
    if(state.chain.current > state.chain.longest) state.chain.longest = state.chain.current;
  } else {
    state.chain.current = 0; // HARD RESET
  }

  save();
}

document.getElementById("btnKept").addEventListener("click", ()=> setDayStatus("good"));
document.getElementById("btnBroke").addEventListener("click", ()=> {
  if(confirm("This will RESET your chain to 0. Confirm?")) setDayStatus("bad");
});

document.getElementById("btnDailyClose").addEventListener("click", ()=>{
  if(state.promises.length === 0){
    alert("Add 1–3 promises first. Discipline needs rules.");
    return;
  }
  if(allPromisesKept()){
    setDayStatus("good");
  } else {
    if(confirm("Not all promises are complete. Mark as BROKE and reset chain?")) setDayStatus("bad");
  }
});

function renderChain(){
  document.getElementById("currentChain").textContent = state.chain.current;
  document.getElementById("longestChain").textContent = state.chain.longest;

  // last 60 days
  const grid = document.getElementById("chainGrid");
  grid.innerHTML = "";
  const now = new Date();
  const days = 60;
  for(let i=days-1;i>=0;i--){
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().slice(0,10);
    const el = document.createElement("div");
    el.className = "d";
    const st = state.history[iso]?.status;
    if(st==="good") el.classList.add("good");
    if(st==="bad") el.classList.add("bad");
    if(iso === todayISO()) el.classList.add("today");
    el.title = `${iso}: ${st || "pending"}`;
    grid.appendChild(el);
  }

  const hint = document.getElementById("promiseHint");
  if(state.promises.length === 0) hint.textContent = "Add 1–3 promises. Keep all → chain continues.";
  else hint.textContent = `${state.promises.filter(p=>p.done).length}/${state.promises.length} promises completed.`;
}

/* ---------- PROMISES ---------- */
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function renderPromises(){
  const list = document.getElementById("promiseList");
  list.innerHTML = "";

  state.promises.forEach(p=>{
    const row = document.createElement("div");
    row.className = "promise";
    row.innerHTML = `
      <label>
        <input type="checkbox" ${p.done ? "checked":""} data-id="${p.id}" />
        <div>
          <div style="font-weight:800">${escapeHtml(p.text)}</div>
          <div class="muted">Keep it. No excuses.</div>
        </div>
      </label>
      <span class="tag">${escapeHtml(p.tag)}</span>
    `;
    list.appendChild(row);

    row.querySelector("input").addEventListener("change", (e)=>{
      const id = e.target.dataset.id;
      const obj = state.promises.find(x=>x.id===id);
      obj.done = e.target.checked;
      save();
    });
  });
}

document.getElementById("btnAddPromise").addEventListener("click", ()=>{
  const txt = document.getElementById("promiseText").value.trim();
  const tag = document.getElementById("promiseTag").value;
  if(!txt) return;

  if(state.promises.length >= 3){
    alert("Max 3 promises. Discipline requires focus.");
    return;
  }
  state.promises.push({ id: uid(), text: txt, tag, done: false });
  document.getElementById("promiseText").value = "";
  save();
});

document.getElementById("btnResetPromises").addEventListener("click", ()=>{
  if(confirm("Reset today's promises?")) {
    state.promises = [];
    save();
  }
});

/* ---------- NOTES / QUICK ---------- */
function bindNotes(){
  const n = state.notes;
  document.getElementById("top3").value = n.top3 || "";
  document.getElementById("quickNotes").value = n.quickNotes || "";
  document.getElementById("weeklyPlan").value = n.weeklyPlan || "";
  document.getElementById("monthlyGoals").value = n.monthlyGoals || "";
  document.getElementById("dreamBoard").value = n.dreamBoard || "";
}
document.getElementById("saveTop3").addEventListener("click", ()=>{
  state.notes.top3 = document.getElementById("top3").value;
  save();
});
document.getElementById("saveNotes").addEventListener("click", ()=>{
  state.notes.quickNotes = document.getElementById("quickNotes").value;
  save();
});
document.getElementById("saveWeekly").addEventListener("click", ()=>{
  state.notes.weeklyPlan = document.getElementById("weeklyPlan").value;
  save();
});
document.getElementById("saveMonthly").addEventListener("click", ()=>{
  state.notes.monthlyGoals = document.getElementById("monthlyGoals").value;
  save();
});
document.getElementById("saveDream").addEventListener("click", ()=>{
  state.notes.dreamBoard = document.getElementById("dreamBoard").value;
  save();
});

/* quick status */
function bindQuick(){
  document.getElementById("chkWorkout").checked = !!state.quick.workout;
  document.getElementById("chkMeditation").checked = !!state.quick.meditation;
  document.getElementById("chkLearning").checked = !!state.quick.learning;
}
document.getElementById("saveQuickStatus").addEventListener("click", ()=>{
  state.quick.workout = document.getElementById("chkWorkout").checked;
  state.quick.meditation = document.getElementById("chkMeditation").checked;
  state.quick.learning = document.getElementById("chkLearning").checked;
  save();
});

/* ---------- MONEY ---------- */
function renderMoney(){
  const iso = todayISO();
  const mk = monthKey(iso);
  const tx = state.money.tx.filter(t=>t.iso.startsWith(mk));

  const todaySum = tx.filter(t=>t.iso===iso).reduce((a,b)=>a+Number(b.amt||0),0);
  const monthSum = tx.reduce((a,b)=>a+Number(b.amt||0),0);

  document.getElementById("todaySpend").textContent = `Today: ${fmt(todaySum)}`;
  document.getElementById("monthSpend").textContent = `Month: ${fmt(monthSum)}`;

  const body = document.getElementById("txBody");
  body.innerHTML = "";
  tx.slice().reverse().forEach(t=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.iso}</td>
      <td>${escapeHtml(t.cat)}</td>
      <td>${escapeHtml(t.note || "")}</td>
      <td class="right">${fmt(Number(t.amt||0))}</td>
    `;
    body.appendChild(tr);
  });
}

document.getElementById("addExpense").addEventListener("click", ()=>{
  const amt = Number(document.getElementById("amt").value);
  const cat = document.getElementById("cat").value;
  const note = document.getElementById("note").value.trim();
  if(!amt || amt<=0) return;

  state.money.tx.push({ iso: todayISO(), amt, cat, note });
  document.getElementById("amt").value = "";
  document.getElementById("note").value = "";
  save();
});

document.getElementById("clearExpenses").addEventListener("click", ()=>{
  const iso = todayISO();
  const mk = monthKey(iso);
  if(confirm(`Clear ALL transactions for ${mk}?`)){
    state.money.tx = state.money.tx.filter(t=>!t.iso.startsWith(mk));
    save();
  }
});

/* ---------- BODY ---------- */
function renderBody(){
  document.getElementById("calTarget").value = state.body.target ?? 1800;
  document.getElementById("calNow").value = state.body.consumed ?? 0;
  document.getElementById("workoutNotes").value = state.body.workoutNotes || "";
  const left = Number(state.body.target||0) - Number(state.body.consumed||0);
  document.getElementById("calLine").textContent = `Calories left today: ${left}`;
}
document.getElementById("saveCals").addEventListener("click", ()=>{
  state.body.target = Number(document.getElementById("calTarget").value || 0);
  state.body.consumed = Number(document.getElementById("calNow").value || 0);
  save();
});
document.getElementById("saveWorkoutNotes").addEventListener("click", ()=>{
  state.body.workoutNotes = document.getElementById("workoutNotes").value;
  save();
});

/* ---------- MIND ---------- */
function renderMind(){
  document.getElementById("medMins").value = state.mind.mins ?? 0;
  document.getElementById("medDone").value = state.mind.done ? "yes" : "no";
  document.getElementById("medNote").value = state.mind.note || "";
}
document.getElementById("saveMed").addEventListener("click", ()=>{
  state.mind.mins = Number(document.getElementById("medMins").value || 0);
  state.mind.done = (document.getElementById("medDone").value === "yes");
  state.mind.note = document.getElementById("medNote").value;
  save();
});

/* ---------- GROWTH ---------- */
function renderGrowth(){
  document.getElementById("learnMins").value = state.growth.mins ?? 0;
  document.getElementById("learnTopic").value = state.growth.topic || "";
  document.getElementById("learnNote").value = state.growth.note || "";
}
document.getElementById("saveLearn").addEventListener("click", ()=>{
  state.growth.mins = Number(document.getElementById("learnMins").value || 0);
  state.growth.topic = document.getElementById("learnTopic").value;
  state.growth.note = document.getElementById("learnNote").value;
  save();
});

/* ---------- UTIL ---------- */
function fmt(n){
  // default currency AZN symbol is tricky; keep numeric for now
  return (Math.round(n*100)/100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}

/* ---------- RENDER ---------- */
function renderAll(){
  renderHeader();
  renderChain();
  renderPromises();
  bindNotes();
  bindQuick();
  renderMoney();
  renderBody();
  renderMind();
  renderGrowth();
}

renderAll();

/* ---------- PWA service worker ---------- */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=> navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
