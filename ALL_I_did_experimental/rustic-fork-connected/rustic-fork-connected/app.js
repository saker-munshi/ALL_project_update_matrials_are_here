(() => {
  "use strict";

  const STORAGE_KEY = "rusticForkKDS.v1";

  const seed = {
    chef: "Elena K.",
    station: "Grill Station",
    shift: { active: false, startedAt: null, manualMinutes: 0, sessions: [] },
    orders: [
      {id:"RF-1042", table:"T12", customer:"Table 12", status:"kitchen", category:"Main", releaseAt:"19:20", elapsed:"08:14", rush:false, items:[["2×","Ribeye Steak"],["1×","Truffle Fries"]], note:"Medium rare · sauce on side"},
      {id:"RF-1043", table:"T7", customer:"Table 7", status:"kitchen", category:"Main", releaseAt:"19:24", elapsed:"05:31", rush:true, items:[["1×","Chicken Parmesan"],["1×","Caesar Salad"]], note:"No parmesan on salad"},
      {id:"RF-1044", table:"T3", customer:"Table 3", status:"ready", category:"Main", releaseAt:"19:10", elapsed:"12:05", rush:false, items:[["2×","Salmon Fillet"],["1×","Roasted Veg"]], note:"Pickup at pass"},
      {id:"RF-1045", table:"T18", customer:"Table 18", status:"locked", category:"Dessert", releaseAt:"19:40", elapsed:"—", rush:false, items:[["1×","Chocolate Lava Cake"]], note:"Gated until 19:40"}
    ],
    completed: [
      {id:"RF-1039", table:"T4", status:"completed", category:"Main", items:[["1×","Steak Frites"]], completedAt:"19:12"},
      {id:"RF-1040", table:"T9", status:"completed", category:"Dessert", items:[["2×","Apple Tart"]], completedAt:"19:16"}
    ],
    recipes: [
      {id:"r1",name:"Ribeye Steak",category:"Main",time:"18 min",difficulty:"Medium",description:"Pan-seared ribeye with herb butter and house fries."},
      {id:"r2",name:"Chicken Parmesan",category:"Main",time:"22 min",difficulty:"Medium",description:"Crispy chicken, tomato sauce and melted cheese."},
      {id:"r3",name:"Caesar Salad",category:"Salad",time:"8 min",difficulty:"Easy",description:"Romaine, parmesan, croutons and classic dressing."},
      {id:"r4",name:"Chocolate Lava Cake",category:"Dessert",time:"14 min",difficulty:"Hard",description:"Warm chocolate cake with a soft center."},
      {id:"r5",name:"Truffle Fries",category:"Appetizer",time:"10 min",difficulty:"Easy",description:"Crisp fries, truffle oil and parmesan."},
      {id:"r6",name:"Salmon Fillet",category:"Main",time:"16 min",difficulty:"Medium",description:"Roasted salmon with seasonal vegetables."}
    ],
    people: [
      {id:"team",name:"Kitchen Team",role:"4 members",status:"Online"},
      {id:"marco",name:"Marco R.",role:"Sous Chef",status:"Online"},
      {id:"nina",name:"Nina P.",role:"Pastry",status:"Away"}
    ],
    chats: {
      team: [
        {from:"Marco R.",text:"Ribeye on the grill. Table 12 is waiting.",time:"19:22",mine:false},
        {from:"Nina P.",text:"Dessert station is ready for the next pickup.",time:"19:24",mine:false},
        {from:"Elena K.",text:"Got it — I’ll call the pass when T12 is ready.",time:"19:25",mine:true}
      ],
      marco: [{from:"Marco R.",text:"Can you take T12 while I finish T7?",time:"19:23",mine:false}],
      nina: [{from:"Nina P.",text:"Lava cake batter is portioned.",time:"19:18",mine:false}]
    },
    activity: [
      {text:"T3 marked ready",time:"2 min ago",tone:"green"},
      {text:"T7 moved to kitchen",time:"5 min ago",tone:"orange"},
      {text:"Nina updated dessert prep",time:"8 min ago",tone:"green"}
    ]
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved ? deepMerge(seed, saved) : structuredClone(seed);
    } catch (_) { return structuredClone(seed); }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function deepMerge(base, saved) {
    const out = structuredClone(base);
    for (const k of Object.keys(saved || {})) {
      if (saved[k] && typeof saved[k] === "object" && !Array.isArray(saved[k]) && out[k] && typeof out[k] === "object")
        out[k] = deepMerge(out[k], saved[k]);
      else out[k] = saved[k];
    }
    return out;
  }
  const state = load();

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const page = document.body.dataset.page || "dashboard";

  function toast(message) {
    const el = $("#toast"); if (!el) return;
    el.textContent = message; el.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function navigate(target) {
    const file = target === "dashboard" ? "dashboard.html" : `${target}.html`;
    window.location.href = file;
  }

  function bindNavigation() {
    $$(".nav a[data-screen]").forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault(); navigate(a.dataset.screen);
      });
    });
  }

  function bindAccount() {
    const avatar = $("#avatarBtn"), menu = $("#accountMenu");
    avatar?.addEventListener("click", e => { e.stopPropagation(); menu?.classList.toggle("open"); });
    document.addEventListener("click", e => { if (menu && !e.target.closest(".account-wrap")) menu.classList.remove("open"); });
    $("#menuChef") && ($("#menuChef").textContent = state.chef);
    $("#accountDetailsBtn")?.addEventListener("click", () => openModal(`
      <div class="modal-head"><div><h2>Account details</h2><div class="tiny">Kitchen profile</div></div><button class="close" data-close>×</button></div>
      <div class="recipe-preview"><b>${esc(state.chef)}</b><div class="tiny" style="margin-top:5px">Kitchen · ${esc(state.station)}</div></div>
      <div class="modal-actions"><button class="btn" data-close>Close</button></div>`));
    $("#switchChefBtn")?.addEventListener("click", () => {
      const next = prompt("Chef name:", state.chef);
      if (next?.trim()) { state.chef = next.trim(); save(); location.reload(); }
    });
    $("#menuTimeBtn")?.addEventListener("click", () => navigate("time"));
  }

  function updateShiftChip() {
    const chip = $("#shiftChip"); if (!chip) return;
    chip.textContent = state.shift.active ? "● On Shift" : "● Off Shift";
    chip.title = state.shift.active ? "Open Time & Shifts" : "Start your shift";
    chip.onclick = () => navigate("time");
  }

  function renderDashboard() {
    const kitchen = $("#dashKitchenCol"), ready = $("#dashReadyCol"), completed = $("#dashCompletedCol");
    if (!kitchen || !ready || !completed) return;
    const query = ($("#dashSearch")?.value || "").toLowerCase();
    const cat = $("#dashCategory")?.value || "all";
    const matches = o => (cat === "all" || o.category === cat) &&
      (!query || `${o.id} ${o.table} ${o.customer} ${o.items.flat().join(" ")}`.toLowerCase().includes(query));
    const active = state.orders.filter(o => o.status !== "locked" && matches(o));
    const k = active.filter(o => o.status === "kitchen"), r = active.filter(o => o.status === "ready");
    kitchen.innerHTML = k.length ? k.map(dashOrder).join("") : `<div class="dash-empty">No kitchen orders</div>`;
    ready.innerHTML = r.length ? r.map(dashOrder).join("") : `<div class="dash-empty">No ready orders</div>`;
    completed.innerHTML = state.completed.slice(0,3).map(o => `<div class="dash-complete-card"><div><b>${esc(o.id)}</b><span>${esc(o.completedAt)}</span></div><div style="margin-top:7px">${esc(o.items.map(x=>x.join(" ")).join(" · "))}</div><div class="dash-complete-foot"><span>${esc(o.table)}</span><b>Completed</b></div></div>`).join("") || `<div class="dash-empty">No completed orders</div>`;
    $("#dashKitchenCount").textContent = `${k.length} order${k.length===1?"":"s"}`;
    $("#dashReadyCount").textContent = `${r.length} order${r.length===1?"":"s"}`;
    $("#dashCompletedCount").textContent = state.completed.length;
    $("#dashActivity").innerHTML = state.activity.slice(0,5).map(a => `<div class="activity-row"><i class="activity-dot ${esc(a.tone)}"></i><span class="activity-text">${esc(a.text)}</span><span class="activity-time">${esc(a.time)}</span></div>`).join("");
    $$(".dash-action").forEach(b => b.addEventListener("click", () => moveOrder(b.dataset.id, b.dataset.action)));
  }
  function dashOrder(o) {
    const action = o.status === "kitchen" ? "ready" : "complete";
    const label = action === "ready" ? "Mark Ready" : "Complete Order";
    return `<article class="dash-order">
      <div class="dash-order-top"><h3>${esc(o.id)}</h3><span class="badge ${o.rush?"red":"orange"}">${o.rush?"RUSH":esc(o.releaseAt)}</span></div>
      <div class="dash-meta">${esc(o.table)} · ${esc(o.category)}</div>
      <div class="dash-items">${o.items.map(x=>`<div><b>${esc(x[0])}</b> ${esc(x[1])}</div>`).join("")}<div class="dash-note">${esc(o.note)}</div></div>
      <div class="dash-order-foot"><span>${esc(o.elapsed)}</span><button class="btn dash-action" data-id="${esc(o.id)}" data-action="${action}">${label}</button></div>
    </article>`;
  }

  function renderOrders() {
    const queue = $("#queue"); if (!queue) return;
    const filter = $(".pill.active[data-filter]")?.dataset.filter || "all";
    const orders = state.orders.filter(o => filter === "all" || (filter === "locked" ? o.status === "locked" : o.status !== "locked"));
    $("#allCount").textContent = state.orders.length;
    $("#lockedCount").textContent = state.orders.filter(o=>o.status==="locked").length;
    $("#unlockedCount").textContent = state.orders.filter(o=>o.status!=="locked").length;
    $("#gatedCount").textContent = state.orders.filter(o=>o.status==="locked").length;
    $("#qReady").textContent = state.orders.filter(o=>o.status==="ready").length;
    $("#qPrep").textContent = state.orders.filter(o=>o.status==="kitchen").length;
    queue.innerHTML = orders.length ? orders.map(queueCard).join("") : `<div class="empty">No orders in this filter.</div>`;
    $$(".queue-card [data-action]").forEach(b => b.addEventListener("click", () => moveOrder(b.dataset.id,b.dataset.action)));
  }
  function queueCard(o) {
    const locked = o.status === "locked";
    let action = locked ? "unlock" : (o.status === "kitchen" ? "ready" : o.status === "ready" ? "complete" : "ready");
    let label = locked ? "Unlock Order" : (action === "ready" ? "Start / Mark Ready" : "Complete Order");
    return `<article class="queue-card ${locked?"locked":""}">
      <div class="qtop"><b>${esc(o.id)}</b><span class="badge ${locked?"":"green"}">${locked?"🔒 Gated":"UNLOCKED"}</span><span class="tiny">${esc(o.table)} · ${esc(o.releaseAt)}</span></div>
      <div style="margin-top:10px"><b>${esc(o.customer)}</b></div>
      <div class="items">${o.items.map(x=>`<div><b>${esc(x[0])}</b> ${esc(x[1])}</div>`).join("")}</div>
      <div class="qactions"><span class="${locked?"locktime":"tiny"}">${locked?"🔒 "+esc(o.releaseAt):esc(o.status).toUpperCase()}</span><button class="btn ${locked?"":"green"}" data-id="${esc(o.id)}" data-action="${action}">${label}</button></div>
    </article>`;
  }

  function moveOrder(id, action) {
    const o = state.orders.find(x => x.id === id); if (!o) return;
    if (action === "unlock") { o.status = "kitchen"; o.note = "Released from gate"; }
    else if (action === "ready") o.status = "ready";
    else if (action === "complete") {
      o.status = "completed";
      state.completed.unshift({...o, completedAt:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});
      state.orders = state.orders.filter(x => x.id !== id);
    }
    state.activity.unshift({text:`${id} → ${action}`,time:"just now",tone:action==="complete"||action==="ready"?"green":"orange"});
    state.activity = state.activity.slice(0,8); save(); renderAll(); toast(`${id} updated`);
  }

  function renderRecipes() {
    const grid=$("#recipeGrid"); if (!grid) return;
    const q=($("#recipeSearch")?.value||"").toLowerCase();
    const cat=$(".cats .pill.active")?.dataset.cat || "all";
    const recipes=state.recipes.filter(r => (cat==="all"||r.category===cat) && (!q||`${r.name} ${r.category} ${r.description}`.toLowerCase().includes(q)));
    $("#recipeCount").textContent=state.recipes.length;
    const cats=["all",...new Set(state.recipes.map(r=>r.category))];
    $("#categories").innerHTML=cats.map(c=>`<button class="pill ${c===cat?"active":""}" data-cat="${esc(c)}">${c==="all"?"All":esc(c)}</button>`).join("");
    $$("#categories .pill").forEach(b=>b.addEventListener("click",()=>{ $$("#categories .pill").forEach(x=>x.classList.remove("active")); b.classList.add("active"); renderRecipes(); }));
    grid.innerHTML=recipes.length?recipes.map(r=>`<article class="recipe"><div class="photo"><span class="time">${esc(r.time)}</span></div><div class="rbody"><h3>${esc(r.name)}</h3><span class="tag">${esc(r.category)}</span> <span class="${r.difficulty.toLowerCase()}">${esc(r.difficulty)}</span><p class="tiny" style="line-height:1.6">${esc(r.description)}</p><div class="rfoot"><span>${esc(r.time)}</span><button data-recipe="${esc(r.id)}">View</button></div></div></article>`).join(""):`<div class="empty">No recipes found.</div>`;
    $$("#recipeGrid [data-recipe]").forEach(b=>b.addEventListener("click",()=>showRecipe(b.dataset.recipe)));
  }
  function showRecipe(id) {
    const r=state.recipes.find(x=>x.id===id); if(!r)return;
    openModal(`<div class="modal-head"><div><h2>${esc(r.name)}</h2><div class="tiny">${esc(r.category)} · ${esc(r.difficulty)} · ${esc(r.time)}</div></div><button class="close" data-close>×</button></div><div class="recipe-preview">${esc(r.description)}<div class="ordered-title" style="margin-top:12px">Kitchen note</div><div class="tiny">Use the recipe card as the source of truth for service prep.</div></div><div class="modal-actions"><button class="btn" data-close>Close</button></div>`);
  }

  function renderChat() {
    const people=$("#chatPeople"), messages=$("#messages"); if(!people||!messages)return;
    const current=localStorage.getItem("rusticForkChatPerson")||"team";
    people.innerHTML=state.people.map(p=>`<div class="person ${p.id===current?"active":""}" data-person="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.role)} · ${esc(p.status)}</span></div>`).join("");
    const person=state.people.find(p=>p.id===current)||state.people[0];
    $("#chatWith").textContent=person.name; $("#chatStatus").textContent=person.status;
    messages.innerHTML=(state.chats[current]||[]).map(m=>`<div class="msg ${m.mine?"mine":""}"><b>${esc(m.from)}</b><div>${esc(m.text)}</div><small>${esc(m.time)}</small></div>`).join("") || `<div class="empty">No messages yet.</div>`;
    messages.scrollTop=messages.scrollHeight;
    $$("#chatPeople .person").forEach(p=>p.addEventListener("click",()=>{localStorage.setItem("rusticForkChatPerson",p.dataset.person);renderChat();}));
  }

  function bindChat() {
    $("#chatForm")?.addEventListener("submit",e=>{
      e.preventDefault(); const input=$("#messageInput"), text=input.value.trim(); if(!text)return;
      const id=localStorage.getItem("rusticForkChatPerson")||"team";
      state.chats[id] ||= []; state.chats[id].push({from:state.chef,text,time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),mine:true});
      save(); input.value=""; renderChat(); toast("Message sent");
    });
  }

  function renderTime() {
    const active=state.shift.active, started=state.shift.startedAt;
    const elapsed=active&&started ? Date.now()-new Date(started).getTime() + state.shift.manualMinutes*60000 : state.shift.manualMinutes*60000;
    const total=Math.max(0,Math.floor(elapsed/1000));
    $("#clockTime") && ($("#clockTime").textContent=`${String(Math.floor(total/3600)).padStart(2,"0")}:${String(Math.floor(total%3600/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`);
    $("#clockDate") && ($("#clockDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}));
    const btn=$("#clockBtn");
    if(btn){btn.classList.toggle("stop",active);btn.innerHTML=active?"■<br/>Clock Out":"▶<br/>Clock In";}
    const logged=(state.shift.sessions||[]).reduce((a,s)=>a+(s.minutes||0),0)+(active?Math.floor(elapsed/60000):0);
    $("#weekHours") && ($("#weekHours").textContent=`${Math.floor(logged/60)}h ${String(logged%60).padStart(2,"0")}m`);
    $("#weekBar") && ($("#weekBar").style.width=`${Math.min(100,logged/2400*100)}%`);
    $("#shiftRows") && ($("#shiftRows").innerHTML=(state.shift.sessions||[]).slice(-5).reverse().map(s=>`<div class="detail-row" style="padding:9px 0;border-top:1px solid #eee"><span>${esc(s.date)}</span><b>${Math.floor(s.minutes/60)}h ${s.minutes%60}m</b></div>`).join("")||`<div class="tiny" style="padding-top:10px">No completed shifts yet.</div>`);
  }
  function bindTime() {
    $("#clockBtn")?.addEventListener("click",()=>{
      if(!state.shift.active){state.shift.active=true;state.shift.startedAt=new Date().toISOString();state.shift.manualMinutes=0;toast("Clocked in");}
      else { const mins=Math.max(0,Math.floor((Date.now()-new Date(state.shift.startedAt).getTime())/60000)+state.shift.manualMinutes); state.shift.sessions.push({date:new Date().toLocaleDateString(),minutes:mins});state.shift.active=false;state.shift.startedAt=null;state.shift.manualMinutes=0;toast("Clocked out");}
      save();updateShiftChip();renderTime();
    });
    $$(".time-actions [data-adjust]").forEach(b=>b.addEventListener("click",()=>{state.shift.manualMinutes=Math.max(0,state.shift.manualMinutes+Number(b.dataset.adjust));save();renderTime();}));
    $("#resetShift")?.addEventListener("click",()=>{state.shift.active=false;state.shift.startedAt=null;state.shift.manualMinutes=0;save();renderTime();toast("Current shift reset");});
    setInterval(()=>{if(state.shift.active)renderTime();},1000);
  }

  function openModal(html){const modal=$("#modal"),body=$("#modalBody");if(!modal||!body)return;body.innerHTML=html;modal.classList.add("open");$$("#modal [data-close]").forEach(b=>b.addEventListener("click",closeModal));modal.addEventListener("click",e=>{if(e.target===modal)closeModal();},{once:true});}
  function closeModal(){$("#modal")?.classList.remove("open");}

  function bindDashboard() {
    $("#dashSearch")?.addEventListener("input",renderDashboard);
    $("#dashCategory")?.addEventListener("change",renderDashboard);
    $("#dashViewAll")?.addEventListener("click",()=>navigate("orders"));
    $("#dashViewCompleted")?.addEventListener("click",()=>openModal(`<div class="modal-head"><div><h2>Completed orders</h2><div class="tiny">${state.completed.length} completed</div></div><button class="close" data-close>×</button></div>${state.completed.map(o=>`<div class="itemcard"><b>${esc(o.id)}</b> · ${esc(o.table)}<div class="tiny" style="margin-top:5px">${esc(o.items.map(x=>x.join(" ")).join(" · "))}</div></div>`).join("")}<div class="modal-actions"><button class="btn" data-close>Close</button></div>`));
    $("#dashNewOrder")?.addEventListener("click",newOrderModal);
    $("#dashAddRecipe")?.addEventListener("click",()=>navigate("recipes"));
    $("#dashTimeTracking")?.addEventListener("click",()=>navigate("time"));
  }
  function newOrderModal(){
    openModal(`<div class="modal-head"><div><h2>New order</h2><div class="tiny">Add an order to the shared queue.</div></div><button class="close" data-close>×</button></div>
      <form id="newOrderForm"><div class="form-grid">
      <div class="field"><label>Order ID</label><input name="id" required placeholder="RF-1046"></div>
      <div class="field"><label>Table</label><input name="table" required placeholder="T5"></div>
      <div class="field"><label>Category</label><select name="category"><option>Main</option><option>Appetizer</option><option>Salad</option><option>Drinks</option><option>Dessert</option></select></div>
      <div class="field"><label>Release time</label><input name="releaseAt" type="time" required></div>
      <div class="field full"><label>Items</label><input name="items" required placeholder="1× Burger, 1× Fries"></div>
      <div class="field full"><label>Note</label><textarea name="note" placeholder="Special instructions"></textarea></div>
      </div><div class="modal-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn green">Create Order</button></div></form>`);
    $("#newOrderForm")?.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.target);const id=String(f.get("id")).trim();if(state.orders.some(o=>o.id===id)||state.completed.some(o=>o.id===id)){toast("Order ID already exists");return;}state.orders.unshift({id,table:String(f.get("table")),customer:`Table ${String(f.get("table")).replace(/^T/i,"")}`,status:"kitchen",category:String(f.get("category")),releaseAt:String(f.get("releaseAt")),elapsed:"00:00",rush:false,items:String(f.get("items")).split(",").map(x=>{const m=x.trim().match(/^(\d+×?)\s*(.*)$/);return m?[m[1],m[2]]:["1×",x.trim()]}),note:String(f.get("note")||"")});state.activity.unshift({text:`${id} created`,time:"just now",tone:"orange"});save();closeModal();renderAll();toast(`${id} added`);});
  }

  function bindOrders(){
    $$(".filters .pill[data-filter]").forEach(b=>b.addEventListener("click",()=>{$$(".filters .pill[data-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderOrders();}));
    $("#gatingInfo")?.addEventListener("click",()=>openModal(`<div class="modal-head"><div><h2>How gating works</h2><div class="tiny">Release-time based order control</div></div><button class="close" data-close>×</button></div><p class="muted" style="line-height:1.7">Locked orders remain out of active kitchen work until their release time. Use Unlock Order to release a gated order manually.</p><div class="modal-actions"><button class="btn" data-close>Close</button></div>`));
    $("#releaseSort")?.addEventListener("click",()=>{state.orders.sort((a,b)=>String(a.releaseAt).localeCompare(String(b.releaseAt)));save();renderOrders();toast("Sorted by release time");});
  }

  function bindRecipes(){ $("#recipeSearch")?.addEventListener("input",renderRecipes); $("#addRecipeBtn")?.addEventListener("click",()=>openModal(`<div class="modal-head"><div><h2>Add recipe</h2></div><button class="close" data-close>×</button></div><p class="muted">Recipe creation can be added here without affecting existing orders.</p><div class="modal-actions"><button class="btn" data-close>Close</button></div>`)); }

  function renderAll(){renderDashboard();renderOrders();renderRecipes();renderChat();renderTime();updateShiftChip();}
  bindNavigation();bindAccount();bindDashboard();bindOrders();bindRecipes();bindChat();bindTime();renderAll();

  if (page === "dashboard") $("#dashboard")?.classList.add("active");
})();
