const PAGE_MAP={dashboard:'dashboard.html',orders:'orders.html',recipes:'recipes.html',chat:'chat.html',time:'time.html'};

const KEY='rusticForkKDS_v2';
const defaultRecipes=[
 ["Burrata & Heirloom Tomato","APPETIZERS","Easy","6m"],["Classic Margherita","PIZZA","Medium","22m"],["Cold Brew Espresso Tonic","DRINKS","Easy","4m"],["Crème Brûlée","DESSERTS","Medium","10m"],
 ["Crispy Chicken Burger","BURGERS","Medium","15m"],["Dry-Aged Ribeye Steak","MAINS","Hard","18m"],["Grilled Atlantic Salmon","MAINS","Medium","14m"],["Mango Jalapeño Margarita","DRINKS","Easy","5m"],
 ["Mushroom Risotto","MAINS","Hard","20m"],["Smash Burger Deluxe","BURGERS","Medium","12m"],["Spicy Tuna Tataki","APPETIZERS","Hard","11m"],["Truffle Mushroom Pizza","PIZZA","Medium","25m"],
 ["Caesar Salad","APPETIZERS","Easy","7m"],["Chicken Piccata","MAINS","Medium","16m"],["Chocolate Mousse","DESSERTS","Easy","8m"]
];
const defaultOrders=[
 {id:'4450',table:'T7',area:'Patio',status:'ready',release:0,items:[['Grilled Atlantic Salmon','1×','No asparagus'],['Sautéed Broccolini','1×',''],['Sparkling Water','2×','']]},
 {id:'4451',table:'T2',area:'Main',status:'ready',rush:true,release:0,items:[['Dry-Aged Ribeye (10oz)','2×','1× medium rare, 1× medium'],['Truffle Parmesan Fries','2×','']]},
 {id:'4449',table:'T1',area:'Main',status:'locked',release:Date.now()+120000,items:[['Classic Margherita','1×','Extra basil'],['Caesar Salad','1×',''],['Sparkling Water','1×','']]},
 {id:'4448',table:'T11',area:'Bar',status:'locked',release:Date.now()+218000,items:[['Mushroom Risotto','1×','No parmesan'],['Sparkling Water','1×','']]},
 {id:'4447',table:'T4',area:'Main',status:'upcoming',release:0,items:[['Chicken Piccata','1×',''],['Caesar Salad','1×','']]},
 {id:'4446',table:'T8',area:'Main',status:'upcoming',release:0,items:[['Dry-Aged Ribeye Steak','2×','Medium'],['Sparkling Water','2×','']]},
 {id:'4445',table:'T14',area:'Bar',status:'upcoming',release:0,items:[['Mushroom Risotto','1×',''],['Chicken Piccata','1×','']]},
];
const chefs=[
 {name:'Elena K.',initial:'E',role:'Grill Station',email:'elena@rusticfork.local'},
 {name:'Marco R.',initial:'M',role:'Sauté Station',email:'marco@rusticfork.local'},
 {name:'Nina P.',initial:'N',role:'Pastry Station',email:'nina@rusticfork.local'},
 {name:'Sam T.',initial:'S',role:'Prep Station',email:'sam@rusticfork.local'}
];
const baseMessages={
 'Marco R.':[['Marco R.','Table 3 allergy check is confirmed. Salmon is dairy-safe.','9:12 PM'],['Elena K.','Got it — I will keep the salmon separate.','9:14 PM']],
 'Nina P.':[['Nina P.','Dessert station is stocked for the next wave.','9:05 PM']],
 'Sam T.':[['Sam T.','Prep is ready for the next release.','8:58 PM']]
};
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{
 recipes:defaultRecipes.map((r,i)=>({id:'r'+i,name:r[0],cat:r[1],difficulty:r[2],time:r[3]})),
 orders:defaultOrders, completed:[], chef:chefs[0], shift:{running:false,startedAt:null,elapsed:0,history:[]}, messages:baseMessages
};
let selectedChat='Marco R.', recipeCategory='ALL', orderFilter='all', toastTimer;
state.completed=state.completed||[];
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toast(t){clearTimeout(toastTimer);const x=document.getElementById('toast');x.textContent=t;x.classList.add('show');toastTimer=setTimeout(()=>x.classList.remove('show'),2200)}
function fmt(ms){let sec=Math.max(0,Math.floor(ms/1000)),h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return String(h).padStart(2,'0')+'h:'+String(m).padStart(2,'0')+'m:'+String(s).padStart(2,'0')+'s'}
function currentElapsed(){return state.shift.elapsed+(state.shift.running&&state.shift.startedAt?Date.now()-state.shift.startedAt:0)}
function showScreen(id){
 if(PAGE_MAP[id] && location.pathname.split('/').pop() !== PAGE_MAP[id]){ location.href=PAGE_MAP[id]; return; }
 document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
 const target=document.getElementById(id); if(target) target.classList.add('active');
 document.querySelectorAll('.nav a').forEach(b=>b.classList.toggle('active',b.dataset.screen===id));
 if(id==='dashboard')renderDashboard(); if(id==='orders')renderOrders(); if(id==='recipes')renderRecipes(); if(id==='chat')renderChat(); if(id==='time')renderTime();
}
function renderDashboard(){
 const kitchenCol=document.getElementById('dashKitchenCol');
 const readyCol=document.getElementById('dashReadyCol');
 const completedCol=document.getElementById('dashCompletedCol');
 const activity=document.getElementById('dashActivity');
 if(!kitchenCol||!readyCol||!completedCol)return;

 const query=(document.getElementById('dashSearch')?.value||'').trim().toLowerCase();
 const category=document.getElementById('dashCategory')?.value||'all';

 const matches=o=>{
   const hay=[o.id,o.table,o.area,...o.items.flat()].join(' ').toLowerCase();
   if(query && !hay.includes(query))return false;
   if(category!=='all' && !o.items.some(x=>itemCategory(x[0])===category))return false;
   return true;
 };

 const active=state.orders.filter(o=>o.status!=='locked' && matches(o));
 const kitchen=active.filter(o=>o.status==='kitchen');
 const ready=active.filter(o=>o.status==='ready');
 const completed=(state.completed||[]).filter(matches).slice(0,3);

 kitchenCol.innerHTML=kitchen.length?kitchen.map(dashOrderCard).join(''):'<div class="dash-empty">No orders in kitchen.</div>';
 readyCol.innerHTML=ready.length?ready.map(dashOrderCard).join(''):'<div class="dash-empty">No ready orders.</div>';
 completedCol.innerHTML=completed.length?completed.map(dashCompletedCard).join(''):'<div class="dash-empty">No completed orders yet.</div>';

 document.getElementById('dashKitchenCount').textContent=kitchen.length+' order'+(kitchen.length===1?'':'s');
 document.getElementById('dashReadyCount').textContent=ready.length+' order'+(ready.length===1?'':'s');
 document.getElementById('dashCompletedCount').textContent=(state.completed||[]).length;

 const events=[];
 ready.forEach(o=>events.push({tone:'green',text:'Order #'+o.id+' ready for pickup',time:o.readyAt||Date.now()}));
 kitchen.forEach(o=>events.push({tone:'orange',text:'Order #'+o.id+' in preparation',time:o.startedAt||Date.now()}));
 (state.completed||[]).slice(0,5).forEach(o=>events.push({tone:'green',text:'Order #'+o.id+' completed',time:o.completedAt||Date.now()}));
 activity.innerHTML=events.sort((a,b)=>b.time-a.time).slice(0,5).map(e=>`<div class="activity-row"><span class="activity-dot ${e.tone}"></span><span class="activity-text">${esc(e.text)}</span><span class="activity-time">${relativeTime(e.time)}</span></div>`).join('') || '<div class="dash-empty small">No recent activity.</div>';

 if(document.getElementById('doneStat'))document.getElementById('doneStat').textContent=(state.completed||[]).length;
 if(document.getElementById('avgStat')){
   const prep=state.orders.filter(o=>o.startedAt&&o.readyAt).map(o=>o.readyAt-o.startedAt);
   const avg=prep.length?Math.round(prep.reduce((a,b)=>a+b,0)/prep.length/60000):18;
   document.getElementById('avgStat').textContent=avg+'m';
 }
 if(document.getElementById('ontimeStat'))document.getElementById('ontimeStat').textContent='92%';
 if(document.getElementById('chefStat'))document.getElementById('chefStat').textContent=chefs.length;
}

function itemCategory(name){
 const n=String(name).toLowerCase();
 if(/pizza/.test(n))return 'Main';
 if(/steak|salmon|risotto|piccata|alfredo/.test(n))return 'Main';
 if(/salad|burrata|tataki/.test(n))return 'Salad';
 if(/water|coffee|lemonade|margarita|tonic|tea/.test(n))return 'Drinks';
 if(/mousse|brûlée|dessert|cake/.test(n))return 'Dessert';
 return 'Appetizer';
}

function relativeTime(ts){
 const sec=Math.max(0,Math.floor((Date.now()-ts)/1000));
 if(sec<60)return sec+'s ago';
 const min=Math.floor(sec/60);
 if(min<60)return min+'m ago';
 const hr=Math.floor(min/60);
 return hr+'h ago';
}

function dashOrderCard(o){
 const prep=o.status==='kitchen';
 const elapsed=prep&&o.startedAt?fmt(Date.now()-o.startedAt):'00h:00m:00s';
 const action=prep
   ? `<button class="btn dash-action" onclick="markReady('${o.id}')">◉ Mark Ready</button>`
   : `<button class="btn dash-action" onclick="pickup('${o.id}')">♨ Pickup</button>`;
 return `<article class="dash-order">
   <div class="dash-order-top">
     <h3>#${o.id}</h3>
     ${prep?`<span class="dash-timer">◷ ${elapsed}</span>`:`<span class="ready-ring" aria-label="Ready"></span>`}
   </div>
   <div class="dash-meta">⌁ ${esc(o.table)} · ${esc(o.area)}</div>
   <div class="dash-items">${o.items.map(x=>`<div><b>${x[1]}</b> ${esc(x[0])}</div>${x[2]?`<div class="dash-note">↳ ${esc(x[2])}</div>`:''}`).join('')}</div>
   <div class="dash-order-foot"><span>◷ ${prep?'In prep':'Live'} · ${o.items.length} items</span>${action}</div>
 </article>`;
}

function dashCompletedCard(o){
 return `<article class="dash-complete-card">
   <div><b>#${o.id}</b><span>${o.completedAt?new Date(o.completedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):''}</span></div>
   <div class="dash-meta">⌁ ${esc(o.table)} · ${esc(o.area)}</div>
   <div>${o.items.map(x=>`<div><b>${x[1]}</b> ${esc(x[0])}</div>`).join('')}</div>
   <div class="dash-complete-foot"><span>◷ Completed</span><button class="btn" onclick="viewOrderRecipe('${o.id}')">⊙ View</button></div>
 </article>`;
}
function releaseDue(){
 let changed=false;state.orders.forEach(o=>{if(o.status==='locked'&&Date.now()>=o.release){o.status='upcoming';changed=true}});if(changed){save();toast('A gated order is now unlocked.');renderAll()}
}
function renderOrders(){
 releaseDue();
 const counts={all:state.orders.length,locked:state.orders.filter(o=>o.status==='locked').length,unlocked:state.orders.filter(o=>o.status!=='locked').length};
 document.getElementById('allCount').textContent=counts.all;document.getElementById('lockedCount').textContent=counts.locked;document.getElementById('unlockedCount').textContent=counts.unlocked;
 document.getElementById('gatedCount').textContent=counts.locked;document.getElementById('qReady').textContent=state.orders.filter(o=>o.status==='ready').length;document.getElementById('qPrep').textContent=state.orders.filter(o=>o.status==='kitchen').length;
 const q=document.getElementById('queue');let arr=state.orders.filter(o=>orderFilter==='all'||(orderFilter==='locked'?o.status==='locked':o.status!=='locked'));
 const groups=[['ready','● Ready to Start'],['kitchen','● In Preparation'],['locked','● Gated — Awaiting Release'],['upcoming','● Upcoming']];
 q.innerHTML='';
 groups.forEach(([status,title])=>{
  const items=arr.filter(o=>o.status===status);if(!items.length)return;
  const sec=document.createElement('div');sec.className='queue-section';sec.innerHTML=`<div class="section-title" style="color:${status==='ready'?'#38d86b':status==='locked'?'#999':'#999'}">${title}</div>`;
  items.forEach(o=>sec.appendChild(queueCard(o)));q.appendChild(sec);
 });
}
function queueCard(o){
 const div=document.createElement('div');div.className='queue-card '+(o.status==='locked'?'locked':'');let unlock=o.release-Date.now();
 let badge=o.rush?'<span class="badge red">↗ RUSH</span>':'';
 let button=o.status==='ready'?`<button class="btn green" onclick="startPrep('${o.id}')">♨ Start Prep</button>`:o.status==='kitchen'?`<button class="btn orange" onclick="markReady('${o.id}')">◉ Mark Ready</button>`:o.status==='locked'?`<button class="btn" disabled>🔒 Unlocks ${Math.max(0,Math.ceil(unlock/1000))}s</button>`:`<button class="btn green" onclick="startPrep('${o.id}')">♨ Start Prep</button>`;
 let lock=o.status==='locked'?`<span class="tiny">🔒 Gated until ${new Date(o.release).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</span>`:`<span class="tiny">♨ Available now</span>`;
 div.innerHTML=`<div class="qtop"><span style="font-size:22px">${o.status==='locked'?'🔒':'♧'}</span><div><b>#${o.id}</b> ${badge} <span class="badge ${o.status==='ready'?'green':''}">${o.status==='locked'?'LOCKED':o.status==='ready'?'READY TO START':o.status==='kitchen'?'IN PREP':'UPCOMING'}</span><div class="tiny">⌁ ${o.table} · ${o.area} · ${o.items.reduce((n,x)=>n+parseInt(x[1]),0)} items</div></div>${o.status==='locked'?`<div class="spacer"></div><div class="locktime">${Math.max(0,Math.ceil(unlock/1000))}s<div class="tiny">unlock in</div></div>`:''}</div>
 <div class="items" style="margin-left:31px">${o.items.map(x=>`<div><b>${x[1]}</b> ${esc(x[0])}</div>${x[2]?`<div>↳ ${esc(x[2])}</div>`:''}`).join('')}</div>
 <div class="qactions">${o.status!=='locked'?`<button class="btn" onclick="viewOrderRecipe('${o.id}')">⊙ View Recipe</button>`:lock}${o.status==='locked'?button:button}</div>`;
 return div;
}
function startPrep(id){let o=state.orders.find(x=>x.id===id);if(!o)return;o.status='kitchen';o.startedAt=Date.now();save();toast('#'+id+' started preparation.');renderAll()}
function markReady(id){let o=state.orders.find(x=>x.id===id);if(!o)return;o.status='ready';o.readyAt=Date.now();save();toast('#'+id+' marked ready.');renderAll()}
function pickup(id){
 let o=state.orders.find(x=>x.id===id);
 if(!o)return;
 state.completed=state.completed||[];
 state.completed.unshift({...o,status:'completed',completedAt:Date.now()});
 state.completed=state.completed.slice(0,20);
 state.orders=state.orders.filter(x=>x.id!==id);
 save();toast('#'+id+' picked up.');renderAll()
}
function viewOrderRecipe(id){
 const o=state.orders.find(x=>x.id===id)||(state.completed||[]).find(x=>x.id===id);if(!o)return;
 openModal(`<div class="modal-head"><div><h2>Order #${o.id} recipes</h2><div class="muted">${o.table} · ${o.area}</div></div><button class="close" onclick="closeModal()">×</button></div>
 <div class="recipe-preview"><div class="ordered-title">Only recipes ordered for this ticket</div>${o.items.map((x,i)=>`<div class="itemcard" style="margin-top:8px"><div class="itemhead"><span class="num">${i+1}</span><b>${x[1]} ${esc(x[0])}</b></div>${x[2]?`<div class="custom">Customer note: ${esc(x[2])}</div>`:''}<div class="tiny" style="margin-top:8px">Station: ${esc(state.recipes.find(r=>r.name.toLowerCase().includes(x[0].split(' ')[0].toLowerCase()))?.cat||'Kitchen')}</div></div>`).join('')}</div>`);
}
function renderRecipes(){
 const search=document.getElementById('recipeSearch').value.toLowerCase();
 const cats=['ALL',...new Set(state.recipes.map(r=>r.cat))];const c=document.getElementById('categories');c.innerHTML='';
 cats.forEach(cat=>{const b=document.createElement('button');b.className='pill '+(recipeCategory===cat?'active':'');b.textContent=(cat==='ALL'?'🍴 All':cat[0]+cat.slice(1).toLowerCase())+' '+state.recipes.filter(r=>cat==='ALL'||r.cat===cat).length;b.onclick=()=>{recipeCategory=cat;renderRecipes()};c.appendChild(b)});
 const list=state.recipes.filter(r=>(recipeCategory==='ALL'||r.cat===recipeCategory)&&(!search||r.name.toLowerCase().includes(search)||r.cat.toLowerCase().includes(search)));
 document.getElementById('recipeCount').textContent=state.recipes.length;
 const grid=document.getElementById('recipeGrid');grid.innerHTML='';
 if(!list.length){grid.innerHTML='<div class="empty">No recipes match this filter.</div>';return}
 const recipePhotos=[
 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=900&q=85',
 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=85'
];
list.forEach((r,i)=>{const el=document.createElement('article');el.className='recipe';const photo=recipePhotos[i%recipePhotos.length];el.innerHTML=`<div class="photo" style="background-image:url('${photo}');background-size:cover;background-position:center"><span class="time">◷ ${esc(r.time)}</span></div><div class="rbody"><h3>${esc(r.name)}</h3><span class="tag">${esc(r.cat)}</span> <span class="tag ${r.difficulty.toLowerCase()}">${esc(r.difficulty)}</span><div class="rfoot"><span>Updated ${r.updated||'Today'}</span><span><button onclick="editRecipe('${r.id}')">✎ Edit</button><button onclick="deleteRecipe('${r.id}')">▢ Delete</button></span></div></div>`;grid.appendChild(el)});
}
document.getElementById('recipeSearch').oninput=renderRecipes;
function addRecipe(){openRecipeForm()}
function openRecipeForm(recipe){
 const r=recipe||{name:'',cat:'MAINS',difficulty:'Medium',time:'10m'};
 openModal(`<div class="modal-head"><div><h2>${recipe?'Edit recipe':'Add recipe'}</h2><div class="muted">Changes are saved in this browser.</div></div><button class="close" onclick="closeModal()">×</button></div>
 <div class="form-grid">
 <div class="field full"><label>Recipe name</label><input id="fName" value="${esc(r.name)}" placeholder="e.g. Garlic Butter Salmon"></div>
 <div class="field"><label>Category</label><select id="fCat">${['APPETIZERS','MAINS','PIZZA','BURGERS','DESSERTS','DRINKS'].map(x=>`<option ${x===r.cat?'selected':''}>${x}</option>`).join('')}</select></div>
 <div class="field"><label>Difficulty</label><select id="fDiff">${['Easy','Medium','Hard'].map(x=>`<option ${x===r.difficulty?'selected':''}>${x}</option>`).join('')}</select></div>
 <div class="field"><label>Prep time</label><input id="fTime" value="${esc(r.time)}" placeholder="15m"></div>
 </div><div class="modal-actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn green" onclick="saveRecipe('${recipe?.id||''}')">Save Recipe</button></div>`);
}
function saveRecipe(id){
 const name=document.getElementById('fName').value.trim();if(!name){toast('Recipe name is required.');return}
 const data={name,cat:document.getElementById('fCat').value,difficulty:document.getElementById('fDiff').value,time:document.getElementById('fTime').value.trim()||'10m',updated:'Today'};
 if(id){Object.assign(state.recipes.find(r=>r.id===id),data);toast('Recipe updated.')}else{data.id='r'+Date.now();state.recipes.unshift(data);toast('Recipe added.')}
 save();closeModal();renderRecipes()
}
function editRecipe(id){const r=state.recipes.find(x=>x.id===id);if(r)openRecipeForm(r)}
function deleteRecipe(id){const r=state.recipes.find(x=>x.id===id);if(!r)return;if(confirm('Delete "'+r.name+'"?')){state.recipes=state.recipes.filter(x=>x.id!==id);save();toast('Recipe deleted.');renderRecipes()}}
document.getElementById('addRecipeBtn').onclick=addRecipe;
function renderChat(){
 const people=document.getElementById('chatPeople');people.innerHTML='';
 chefs.forEach(c=>{const p=document.createElement('div');p.className='person '+(c.name===selectedChat?'active':'');p.innerHTML=`<b>${c.name}</b><span>${c.role}</span>`;p.onclick=()=>{selectedChat=c.name;renderChat()};people.appendChild(p)});
 document.getElementById('chatWith').textContent=selectedChat;
 const msgs=state.messages[selectedChat]||[];
 document.getElementById('messages').innerHTML=msgs.map(m=>`<div class="msg ${m[0]===state.chef.name?'mine':''}"><b>${esc(m[0])}</b><div>${esc(m[1])}</div><small>${esc(m[2]||'now')}</small></div>`).join('')||'<div class="empty">No messages yet. Start the conversation.</div>';
 const box=document.getElementById('messages');box.scrollTop=box.scrollHeight;
}
document.getElementById('chatForm').onsubmit=e=>{e.preventDefault();const inp=document.getElementById('messageInput'),text=inp.value.trim();if(!text)return;if(!state.messages[selectedChat])state.messages[selectedChat]=[];state.messages[selectedChat].push([state.chef.name,text,new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})]);inp.value='';save();renderChat();toast('Message sent.')};
function renderTime(){
 document.getElementById('clockTime').textContent=fmt(currentElapsed());
 document.getElementById('clockDate').textContent=new Date().toLocaleDateString([], {weekday:'long',month:'long',day:'numeric',year:'numeric'});
 const btn=document.getElementById('clockBtn');btn.classList.toggle('stop',state.shift.running);btn.innerHTML=state.shift.running?'■<br/>Clock Out':'▶<br/>Clock In';
 const h=currentElapsed()/3600000;document.getElementById('weekHours').textContent=Math.floor(h)+'h '+String(Math.floor((h%1)*60)).padStart(2,'0')+'m';document.getElementById('weekBar').style.width=Math.min(100,h/40*100)+'%';
 document.getElementById('shiftChip').textContent=state.shift.running?'● On Shift · '+fmt(currentElapsed()):'● Off Shift';
 document.getElementById('shiftRows').innerHTML=state.shift.history.length?state.shift.history.slice(-5).reverse().map((x,i)=>`<div class="shiftrow"><span>${x.date}</span><span style="display:flex;align-items:center;gap:9px"><b>${x.duration}</b><button class="delete-shift" title="Delete shift" onclick="deleteShift(${state.shift.history.length-1-i})">Delete</button></span></div>`).join(''):'<div class="empty" style="margin-top:10px">No completed shifts yet.</div>';
}
document.getElementById('clockBtn').onclick=()=>{
 if(state.shift.running){state.shift.elapsed+=Date.now()-state.shift.startedAt;state.shift.running=false;state.shift.startedAt=null;state.shift.history.push({date:new Date().toLocaleDateString([], {month:'short',day:'numeric'}),duration:fmt(state.shift.elapsed)});toast('Shift clocked out and saved.')}
 else{state.shift.running=true;state.shift.startedAt=Date.now();toast('Shift clocked in.')}
 save();renderTime();
};
document.querySelectorAll('[data-adjust]').forEach(b=>b.onclick=()=>{state.shift.elapsed=Math.max(0,state.shift.elapsed+Number(b.dataset.adjust)*60000);if(state.shift.running)state.shift.startedAt=Date.now();save();renderTime()});
document.getElementById('resetShift').onclick=()=>{if(confirm('Reset the current shift timer?')){state.shift={running:false,startedAt:null,elapsed:0,history:state.shift.history};save();renderTime();toast('Current timer reset.')}};
document.getElementById('shiftChip').onclick=()=>showScreen('time');
document.getElementById('avatarBtn').onclick=()=>document.getElementById('accountMenu').classList.toggle('open');
document.addEventListener('click',e=>{if(!e.target.closest('.account-wrap'))document.getElementById('accountMenu').classList.remove('open')});
document.getElementById('menuTimeBtn').onclick=()=>{document.getElementById('accountMenu').classList.remove('open');showScreen('time')};
document.getElementById('accountDetailsBtn').onclick=()=>{document.getElementById('accountMenu').classList.remove('open');openAccount()};
document.getElementById('switchChefBtn').onclick=()=>{document.getElementById('accountMenu').classList.remove('open');openChefSwitcher()};
function openAccount(){openModal(`<div class="modal-head"><div><h2>Account details</h2><div class="muted">Your kitchen profile</div></div><button class="close" onclick="closeModal()">×</button></div><div class="recipe-preview"><div class="qtop"><div class="avatar">${state.chef.initial}</div><div><h3 style="margin:0">${state.chef.name}</h3><div class="muted">${state.chef.role}</div></div></div><div class="form-grid"><div class="field"><label>Email</label><input value="${state.chef.email}" readonly></div><div class="field"><label>Station</label><input value="${state.chef.role}" readonly></div></div></div>`)}
function openChefSwitcher(){openModal(`<div class="modal-head"><div><h2>Switch chef account</h2><div class="muted">Each chef has their own profile.</div></div><button class="close" onclick="closeModal()">×</button></div>${chefs.map(c=>`<button class="person ${c.name===state.chef.name?'active':''}" style="width:100%;text-align:left;border:0;color:#eee" onclick="switchChef('${c.name}')"><b>${c.name}</b><span>${c.role} · ${c.email}</span></button>`).join('')}`)}
function switchChef(name){state.chef=chefs.find(c=>c.name===name)||chefs[0];document.getElementById('avatarBtn').textContent=state.chef.initial;document.getElementById('menuChef').textContent=state.chef.name;save();closeModal();renderChat();toast('Signed in as '+state.chef.name+'.')}
function openModal(content){document.getElementById('modalBody').innerHTML=content;document.getElementById('modal').classList.add('open')}
function closeModal(){document.getElementById('modal').classList.remove('open')}
document.getElementById('modal').onclick=e=>{if(e.target.id==='modal')closeModal()}
document.getElementById('gatingInfo').onclick=()=>openModal(`<div class="modal-head"><div><h2>How order gating works</h2><div class="muted">Release times are simulated locally for this frontend.</div></div><button class="close" onclick="closeModal()">×</button></div><div class="recipe-preview"><p><b>Locked:</b> the order cannot be started before its release time.</p><p><b>Unlocked:</b> the Start Prep action becomes available automatically when the timer reaches zero.</p><p><b>In prep:</b> Start Prep moves the ticket to the kitchen board. Mark Ready moves it to Ready.</p></div>`);
document.querySelectorAll('.filters .pill[data-filter]').forEach(b=>b.onclick=()=>{orderFilter=b.dataset.filter;document.querySelectorAll('.filters .pill[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderOrders()});
document.getElementById('releaseSort').onclick=()=>{state.orders.sort((a,b)=>(a.release||0)-(b.release||0));save();renderOrders();toast('Orders sorted by release time.')};
function deleteShift(index){
 if(index<0||index>=state.shift.history.length)return;
 if(confirm('Delete this completed shift record?')){
   state.shift.history.splice(index,1);
   save(); renderTime(); toast('Shift record deleted.');
 }
}

function initDashboardControls(){
 const search=document.getElementById('dashSearch');
 const select=document.getElementById('dashCategory');
 const pills=document.querySelectorAll('[data-dash-cat]');
 if(search)search.oninput=renderDashboard;
 if(select)select.onchange=()=>{
   pills.forEach(p=>p.classList.toggle('active',p.dataset.dashCat===select.value));
   renderDashboard();
 };
 pills.forEach(p=>p.onclick=()=>{
   pills.forEach(x=>x.classList.remove('active'));
   p.classList.add('active');
   if(select)select.value=p.dataset.dashCat;
   renderDashboard();
 });
 document.getElementById('dashViewAll')?.addEventListener('click',()=>showScreen('orders'));
 document.getElementById('dashViewCompleted')?.addEventListener('click',viewCompletedOrders);
 document.getElementById('dashAddRecipe')?.addEventListener('click',()=>{
   showScreen('recipes');
   setTimeout(()=>document.getElementById('addRecipeBtn')?.click(),0);
 });
 document.getElementById('dashTimeTracking')?.addEventListener('click',()=>showScreen('time'));
 document.getElementById('dashNewOrder')?.addEventListener('click',openNewOrderModal);
}

function openNewOrderModal(){
 openModal(`<div class="modal-head"><div><h2>New Order</h2><div class="muted">Add an order directly to the kitchen queue.</div></div><button class="close" onclick="closeModal()">×</button></div>
 <div class="form-grid">
   <div class="field"><label>Table</label><input id="newTable" placeholder="T12"></div>
   <div class="field"><label>Area</label><select id="newArea"><option>Main</option><option>Patio</option><option>Bar</option></select></div>
   <div class="field full"><label>Items</label><textarea id="newItems" placeholder="1x Classic Margherita&#10;1x Caesar Salad"></textarea></div>
 </div>
 <div class="modal-actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn orange" onclick="createNewOrder()">Create Order</button></div>`);
}

function createNewOrder(){
 const table=document.getElementById('newTable').value.trim()||'T12';
 const area=document.getElementById('newArea').value;
 const raw=document.getElementById('newItems').value.trim();
 if(!raw){toast('Add at least one item.');return;}
 const items=raw.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{
   const m=line.match(/^(\d+)\s*[x×]\s*(.+)$/i);
   return [m?m[2].trim():line,m?m[1]+'×':'1×',''];
 });
 const numeric=state.orders.map(o=>parseInt(o.id,10)).filter(Number.isFinite);
 const id=String((numeric.length?Math.max(...numeric):4449)+1);
 state.orders.unshift({id,table,area,status:'upcoming',release:0,items});
 save();closeModal();toast('#'+id+' added to the queue.');showScreen('orders');renderAll();
}

function viewCompletedOrders(){
 const list=(state.completed||[]).slice(0,20);
 openModal(`<div class="modal-head"><div><h2>Completed Orders</h2><div class="muted">${list.length} recent completed orders</div></div><button class="close" onclick="closeModal()">×</button></div>
 <div class="recipe-preview">${list.length?list.map(o=>`<div class="itemcard" style="margin-top:8px"><div class="detail-row"><b>#${o.id}</b><span class="tiny">${o.completedAt?new Date(o.completedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):''}</span></div><div class="tiny" style="margin-top:5px">${esc(o.table)} · ${esc(o.area)}</div><div style="margin-top:8px">${o.items.map(x=>`<div><b>${x[1]}</b> ${esc(x[0])}</div>`).join('')}</div></div>`).join(''):'<div class="empty">No completed orders yet.</div>'}</div>`);
}

initDashboardControls();

function renderAll(){renderDashboard();renderOrders();renderRecipes();renderChat();renderTime()}
document.getElementById('avatarBtn').textContent=state.chef.initial;document.getElementById('menuChef').textContent=state.chef.name;
setInterval(()=>{releaseDue();if(document.getElementById('time').classList.contains('active'))renderTime();if(document.getElementById('dashboard').classList.contains('active'))renderDashboard();if(document.getElementById('orders').classList.contains('active'))renderOrders()},1000);
renderAll();
