/* PetCare Management System
   Beginner-friendly vanilla JavaScript + LocalStorage.
   No framework or backend required.
*/
let data = {
  pets: [], owners: [], breeds: [], consultations: [], services: [],
  serviceRecords: [], medicines: [], appointments: [], charges: [], payments: [],
  activities: [], settings: {shopName:"PetCare Veterinary & Pet Shop", currency:"₱"}
};

let page = "dashboard";
let currentPet = null;
let currentOwner = null;
let reportRange = "month";

const $ = id => document.getElementById(id);
const money = n => (data.settings.currency || "₱") + Number(n || 0).toLocaleString("en-PH",{minimumFractionDigits:2});
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const today = () => new Date().toISOString().slice(0,10);
const uid = (list,prefix) => prefix + "-" + String(list.length + 1).padStart(4,"0");
function nextId(list,prefix){
  let max = 0;
  list.forEach(x => { let n = Number(String(x.id || "").replace(/\D/g,"")); if(n > max) max=n; });
  return prefix + "-" + String(max+1).padStart(4,"0");
}
function saveData(){
  localStorage.setItem("petShopData", JSON.stringify(data));
  if($("saveState")) $("saveState").textContent = "Saved " + new Date().toLocaleTimeString();
}
function loadData(){
  let saved = localStorage.getItem("petShopData");
  if(saved){
    try { data = {...data,...JSON.parse(saved)}; }
    catch(e){ console.log("Saved data could not be read."); }
  }
  saveData();
}
function addActivity(text){
  data.activities.unshift({id:Date.now(), text, date:new Date().toISOString()});
  data.activities = data.activities.slice(0,30);
}
function toast(text,type="ok"){
  let box = document.createElement("div");
  box.className = "toast " + type;
  box.textContent = text;
  $("toastBox").appendChild(box);
  setTimeout(()=>box.remove(),2800);
}
function showPage(name){
  page = name;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  $("sidebar").classList.remove("open");
  render();
}
function render(){
  let views = {dashboard:dashboardPage,pets:petsPage,owners:ownersPage,breeds:breedsPage,
    consultations:consultationsPage,appointments:appointmentsPage,services:servicesPage,
    medicines:medicinesPage,charges:chargesPage,payments:paymentsPage,reports:reportsPage,
    search:searchPage,backup:backupPage,settings:settingsPage};
  $("content").innerHTML = (views[page] || dashboardPage)();
  if(page==="dashboard") drawDashboardChart();
  if(page==="reports") drawReportsCharts();
}
function header(title,sub,buttonText="",buttonAction=""){
  return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div>
  <div class="actions">${buttonText?`<button class="btn primary" onclick="${buttonAction}">${buttonText}</button>`:""}</div></div>`;
}
function stat(label,num,icon,hint=""){
  return `<div class="stat"><span class="stat-icon">${icon}</span><div class="label">${label}</div><div class="num">${num}</div><div class="hint">${hint}</div></div>`;
}
function badge(status){
  let s=String(status||"").toLowerCase(), c=s.includes("paid")||["active","completed","confirmed","available"].includes(s)?"green":
    s.includes("unpaid")||["cancelled","expired","out of stock"].includes(s)?"red":
    s.includes("partial")||s.includes("low")||s.includes("soon")||["scheduled","in progress","no show"].includes(s)?"yellow":"blue";
  return `<span class="badge ${c}">${esc(status||"—")}</span>`;
}
function petById(id){return data.pets.find(x=>x.id===id)}
function ownerById(id){return data.owners.find(x=>x.id===id)}
function serviceById(id){return data.services.find(x=>x.id===id)}
function medicineById(id){return data.medicines.find(x=>x.id===id)}
function petName(id){let x=petById(id);return x?x.name:"Unknown pet"}
function ownerName(id){let x=ownerById(id);return x?x.name:"Unknown owner"}
function age(date){
  if(!date) return "—"; let d=new Date(date), n=new Date();
  let a=n.getFullYear()-d.getFullYear(); if(n.getMonth()<d.getMonth() || (n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))a--;
  return a<1 ? Math.max(0,Math.floor((n-d)/2592000000))+" mo" : a+" yr";
}
function ownerOptions(selected=""){return data.owners.map(o=>`<option value="${o.id}" ${o.id===selected?"selected":""}>${esc(o.name)} (${o.id})</option>`).join("")}
function petOptions(selected=""){return data.pets.map(p=>`<option value="${p.id}" ${p.id===selected?"selected":""}>${esc(p.name)} — ${esc(p.species)} (${p.id})</option>`).join("")}
function serviceOptions(selected=""){return data.services.filter(s=>s.status==="Active").map(s=>`<option value="${s.id}" ${s.id===selected?"selected":""}>${esc(s.name)} — ${money(s.price)}</option>`).join("")}
function breedOptions(species="",selected=""){return data.breeds.filter(b=>!species||b.species===species).map(b=>`<option value="${b.name}" ${b.name===selected?"selected":""}>${esc(b.name)}</option>`).join("")}

/* DASHBOARD */
function dashboardPage(){
  let low=data.medicines.filter(m=>medicineStatus(m)==="Low Stock").length;
  let unpaid=data.charges.filter(c=>c.paymentStatus!=="Paid").reduce((a,c)=>a+balance(c.id),0);
  let charges=data.charges.reduce((a,c)=>a+Number(c.total||0),0);
  let todays=data.consultations.filter(c=>c.date===today()).length;
  let upcoming=data.appointments.filter(a=>a.date>=today()&&a.status!=="Cancelled").sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,6);
  return header("Dashboard","Overview of your pet shop and veterinary clinic","New Pet","openPetModal()")+
  `<div class="cards">
    ${stat("Total Pets",data.pets.length,"🐾","Registered pets")}
    ${stat("Total Owners",data.owners.length,"👤","Pet owners")}
    ${stat("Total Breeds",data.breeds.length,"🧬","Breed records")}
    ${stat("Today's Consultations",todays,"🩺","Scheduled today")}
    ${stat("Upcoming Appointments",data.appointments.filter(a=>a.date>=today()&&a.status==="Scheduled").length,"📅","Scheduled")}
    ${stat("Available Services",data.services.filter(s=>s.status==="Active").length,"✂️","Active services")}
    ${stat("Available Medicines",data.medicines.filter(m=>medicineStatus(m)==="Available").length,"💊","In stock")}
    ${stat("Low Stock Medicines",low,"⚠️","Needs attention")}
    ${stat("Total Clinic Charges",money(charges),"🧾","All recorded charges")}
    ${stat("Unpaid Charges",money(unpaid),"💰","Outstanding balance")}
  </div>
  <div class="grid2">
    <div class="panel"><div class="panel-head"><h3>Today's Schedule</h3><button class="btn" onclick="showPage('appointments')">View all</button></div>
      ${upcoming.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Pet</th><th>Owner</th><th>Purpose</th><th>Status</th></tr></thead><tbody>
      ${upcoming.map(a=>`<tr><td>${esc(a.time)}</td><td><button class="link" onclick="openPetProfile('${a.petId}')">${esc(petName(a.petId))}</button></td><td>${esc(ownerName(a.ownerId))}</td><td>${esc(a.purpose||"—")}</td><td>${badge(a.status)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No appointments scheduled.</div>`}
    </div>
    <div class="panel"><div class="panel-head"><h3>Recent Activity</h3></div>
      ${data.activities.length?data.activities.slice(0,8).map(a=>`<div class="activity"><b>${esc(a.text)}</b><small>${new Date(a.date).toLocaleString()}</small></div>`).join(""):`<div class="empty">No activity yet.</div>`}
    </div>
  </div>
  <div class="panel"><div class="panel-head"><h3>Revenue Snapshot</h3></div><canvas id="dashboardChart" class="chart"></canvas></div>`;
}

/* PETS */
function petsPage(){
  let search=window.petSearch||"", species=window.petSpecies||"", owner=window.petOwner||"";
  let list=data.pets.filter(p=>(!search||JSON.stringify(p).toLowerCase().includes(search.toLowerCase()))&&(!species||p.species===species)&&(!owner||p.ownerId===owner));
  return header("Pet Records","Manage every registered pet and its medical information","Add Pet","openPetModal()")+
  `<div class="panel"><div class="filters">
    <input placeholder="Search name, ID, microchip, breed..." value="${esc(search)}" oninput="window.petSearch=this.value;showPage('pets')">
    <select onchange="window.petSpecies=this.value;showPage('pets')"><option value="">All species</option>${["Dog","Cat","Rabbit","Bird","Other"].map(x=>`<option ${species===x?"selected":""}>${x}</option>`).join("")}</select>
    <select onchange="window.petOwner=this.value;showPage('pets')"><option value="">All owners</option>${ownerOptions(owner)}</select>
  </div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Pet</th><th>ID</th><th>Species/Breed</th><th>Sex</th><th>Age</th><th>Weight</th><th>Owner</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${list.length?list.map(p=>`<tr><td><button class="link" onclick="openPetProfile('${p.id}')"><span class="avatar">${p.photo?`<img src="${esc(p.photo)}" class="avatar">`:"🐾"}</span>${esc(p.name)}</button></td><td>${p.id}</td><td>${esc(p.species)} / ${esc(p.breed)}</td><td>${esc(p.sex)}</td><td>${age(p.birthDate)}</td><td>${esc(p.weight||"—")} kg</td><td>${esc(ownerName(p.ownerId))}</td><td>${badge(p.status)}</td><td><button class="btn" onclick="openPetModal('${p.id}')">Edit</button> <button class="btn danger" onclick="deletePet('${p.id}')">Delete</button></td></tr>`).join(""):`<tr><td colspan="9" class="empty">No pets found.</td></tr>`}
  </tbody></table></div></div>`;
}
function openPetModal(id=""){
  let p=petById(id)||{species:"Dog",sex:"Male",status:"Active"};
  let edit=!!id;
  openModal(`${edit?"Edit":"Add"} Pet`,`
  <form id="petForm" class="form-grid">
    <input type="hidden" name="id" value="${esc(p.id||"")}">
    <div class="form-group"><label>Pet Name *</label><input name="name" required value="${esc(p.name||"")}"></div>
    <div class="form-group"><label>Owner *</label><select name="ownerId" required><option value="">Select owner</option>${ownerOptions(p.ownerId)}</select></div>
    <div class="form-group"><label>Species *</label><select name="species" id="petSpeciesForm" required onchange="updateBreedForm()">${["Dog","Cat","Rabbit","Bird","Other"].map(x=>`<option ${p.species===x?"selected":""}>${x}</option>`).join("")}</select></div>
    <div class="form-group"><label>Breed *</label><select name="breed" id="petBreedForm" required><option value="">Select breed</option>${breedOptions(p.species,p.breed)}</select></div>
    <div class="form-group"><label>Sex</label><select name="sex">${["Male","Female"].map(x=>`<option ${p.sex===x?"selected":""}>${x}</option>`).join("")}</select></div>
    <div class="form-group"><label>Birth Date</label><input type="date" name="birthDate" value="${esc(p.birthDate||"")}"></div>
    <div class="form-group"><label>Color</label><input name="color" value="${esc(p.color||"")}"></div>
    <div class="form-group"><label>Weight (kg)</label><input type="number" step=".01" min="0" name="weight" value="${esc(p.weight||"")}"></div>
    <div class="form-group"><label>Microchip Number</label><input name="microchip" value="${esc(p.microchip||"")}"></div>
    <div class="form-group"><label>Contact Number</label><input name="contact" value="${esc(p.contact||"")}"></div>
    <div class="form-group"><label>Status</label><select name="status">${["Active","Inactive","Deceased"].map(x=>`<option ${p.status===x?"selected":""}>${x}</option>`).join("")}</select></div>
    <div class="form-group"><label>Photo URL (optional)</label><input name="photo" value="${esc(p.photo||"")}" placeholder="https://..."></div>
    <div class="form-group full"><label>Address</label><textarea name="address">${esc(p.address||"")}</textarea></div>
    <div class="form-group full"><label>Allergies</label><textarea name="allergies">${esc(p.allergies||"")}</textarea></div>
    <div class="form-group full"><label>Medical Notes</label><textarea name="notes">${esc(p.notes||"")}</textarea></div>
  </form>`,()=>{
    let f=new FormData($("petForm")), x=Object.fromEntries(f);
    if(!x.name.trim()||!x.ownerId||!x.breed){toast("Please complete the required fields.","error");return false}
    let old=petById(x.id);
    if(old) Object.assign(old,x);
    else {x.id=nextId(data.pets,"PET");data.pets.push(x);addActivity("New pet registered: "+x.name)}
    saveData();closeModal();render();toast(edit?"Pet updated":"Pet registered");return true;
  });
}
function updateBreedForm(){
  let species=$("petSpeciesForm").value, select=$("petBreedForm");
  select.innerHTML='<option value="">Select breed</option>'+breedOptions(species);
}
function deletePet(id){
  let p=petById(id);
  if(!p)return;
  let used=data.consultations.some(x=>x.petId===id)||data.charges.some(x=>x.petId===id)||data.appointments.some(x=>x.petId===id);
  if(used && !confirm("This pet has history. Delete the pet record anyway? Historical records will remain."))return;
  if(!confirm("Delete "+p.name+"?"))return;
  data.pets=data.pets.filter(x=>x.id!==id);addActivity("Pet record deleted: "+p.name);saveData();render();toast("Pet deleted");
}

/* PET PROFILE */
function openPetProfile(id){
  currentPet=id; page="petProfile"; renderPetProfile();
}
function renderPetProfile(){
  let p=petById(currentPet); if(!p){showPage("pets");return}
  let o=ownerById(p.ownerId);
  let tab=window.petTab||"overview";
  $("content").innerHTML=`<div class="page-head"><div><button class="btn" onclick="showPage('pets')">← Back</button></div><div class="actions"><button class="btn" onclick="openPetModal('${p.id}')">Edit Pet</button></div></div>
  <div class="profile-head"><div class="pet-photo">${p.photo?`<img src="${esc(p.photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:16px">`:"🐾"}</div>
  <div><h1>${esc(p.name)}</h1><p>${p.id} · ${esc(p.species)} · ${esc(p.breed)}</p><p>Owner: ${esc(o?.name||"—")} · ${esc(p.contact||o?.phone||"—")}</p></div></div>
  <div class="panel"><div class="info-grid">
    <div class="info"><small>Sex</small><b>${esc(p.sex)}</b></div><div class="info"><small>Age</small><b>${age(p.birthDate)}</b></div>
    <div class="info"><small>Weight</small><b>${esc(p.weight||"—")} kg</b></div><div class="info"><small>Microchip</small><b>${esc(p.microchip||"—")}</b></div>
  </div></div>
  <div class="tabs">${["overview","consultations","services","medicines","vaccinations","charges","appointments","notes"].map(x=>`<button class="tab ${tab===x?"active":""}" onclick="window.petTab='${x}';renderPetProfile()">${x[0].toUpperCase()+x.slice(1)}</button>`).join("")}</div>
  ${petTabContent(p,tab)}`;
}
function petTabContent(p,tab){
  if(tab==="overview") return `<div class="two-col"><div class="panel"><h3>Owner Information</h3>${ownerInfo(p.ownerId)}</div><div class="panel"><h3>Medical Information</h3><div class="info-grid"><div class="info"><small>Allergies</small><b>${esc(p.allergies||"None recorded")}</b></div><div class="info"><small>Status</small><b>${badge(p.status)}</b></div></div><p>${esc(p.notes||"No medical notes.")}</p></div></div>`;
  if(tab==="notes") return `<div class="panel"><h3>Pet Notes</h3><p>${esc(p.notes||"No notes recorded.")}</p><p><b>Allergies:</b> ${esc(p.allergies||"None recorded")}</p></div>`;
  if(tab==="consultations") return historyTable(data.consultations.filter(x=>x.petId===p.id),["date","veterinarian","diagnosis","treatment","status"],"openConsultationModal");
  if(tab==="services") return historyTable(data.serviceRecords.filter(x=>x.petId===p.id),["date","serviceId","staff","price","status"],"openServiceRecordModal");
  if(tab==="medicines") return `<div class="panel">${medicineHistory(p.id)}</div>`;
  if(tab==="vaccinations") return `<div class="panel">${medicineHistory(p.id,true)}</div>`;
  if(tab==="charges") return historyTable(data.charges.filter(x=>x.petId===p.id),["date","description","category","total","paymentStatus"],"openChargeModal");
  if(tab==="appointments") return historyTable(data.appointments.filter(x=>x.petId===p.id),["date","time","purpose","veterinarian","status"],"openAppointmentModal");
}
function ownerInfo(id){
  let o=ownerById(id);if(!o)return "<div class='empty'>Owner not found</div>";
  return `<div class="info-grid"><div class="info"><small>Name</small><b>${esc(o.name)}</b></div><div class="info"><small>Phone</small><b>${esc(o.phone)}</b></div><div class="info"><small>Email</small><b>${esc(o.email||"—")}</b></div><div class="info"><small>Address</small><b>${esc(o.address||"—")}</b></div></div>`;
}
function historyTable(list,cols,fn){
  return `<div class="panel"><div class="table-wrap"><table class="table"><thead><tr>${cols.map(c=>`<th>${c.replace(/([A-Z])/g," $1")}</th>`).join("")}<th></th></tr></thead><tbody>${list.length?list.sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(x=>`<tr>${cols.map(c=>`<td>${c==="date"?esc(x[c]):c==="serviceId"?esc(serviceById(x[c])?.name||x[c]):c==="total"||c==="price"?money(x[c]):c==="paymentStatus"||c==="status"?badge(x[c]):esc(x[c]||"—")}</td>`).join("")}<td><button class="btn" onclick="${fn}('${x.id}')">View</button></td></tr>`).join(""):`<tr><td colspan="${cols.length+1}" class="empty">No records.</td></tr>`}</tbody></table></div></div>`;
}
function medicineHistory(petId,vacc=false){
  let rows=data.charges.filter(c=>c.petId===petId&&c.category==="Medicine").map(c=>c);
  return rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Medicine</th><th>Quantity</th><th>Total</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${c.date}</td><td>${esc(c.description)}</td><td>${c.quantity}</td><td>${money(c.total)}</td></tr>`).join("")}</tbody></table></div>`:"<div class='empty'>No medicine records.</div>";
}

/* OWNERS */
function ownersPage(){
  let search=window.ownerSearch||"", list=data.owners.filter(o=>!search||JSON.stringify(o).toLowerCase().includes(search.toLowerCase()));
  return header("Owners","Manage owners and all pets connected to them","Add Owner","openOwnerModal()")+`<div class="panel"><div class="filters"><input placeholder="Search owner, ID, phone, email..." value="${esc(search)}" oninput="window.ownerSearch=this.value;showPage('owners')"></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Owner</th><th>ID</th><th>Phone</th><th>Email</th><th>Pets</th><th>Charges</th><th>Actions</th></tr></thead><tbody>
  ${list.length?list.map(o=>`<tr><td><button class="link" onclick="openOwnerProfile('${o.id}')">${esc(o.name)}</button></td><td>${o.id}</td><td>${esc(o.phone)}</td><td>${esc(o.email||"—")}</td><td>${data.pets.filter(p=>p.ownerId===o.id).length}</td><td>${money(data.charges.filter(c=>c.ownerId===o.id).reduce((a,c)=>a+Number(c.total||0),0))}</td><td><button class="btn" onclick="openOwnerModal('${o.id}')">Edit</button> <button class="btn danger" onclick="deleteOwner('${o.id}')">Delete</button></td></tr>`).join(""):`<tr><td colspan="7" class="empty">No owners found.</td></tr>`}</tbody></table></div></div>`;
}
function openOwnerModal(id=""){
  let o=ownerById(id)||{}, edit=!!id;
  openModal(`${edit?"Edit":"Add"} Owner`,`<form id="ownerForm" class="form-grid">
  <input type="hidden" name="id" value="${esc(o.id||"")}">
  <div class="form-group full"><label>Full Name *</label><input name="name" required value="${esc(o.name||"")}"></div>
  <div class="form-group"><label>Phone *</label><input name="phone" required value="${esc(o.phone||"")}"></div>
  <div class="form-group"><label>Email</label><input type="email" name="email" value="${esc(o.email||"")}"></div>
  <div class="form-group full"><label>Address</label><textarea name="address">${esc(o.address||"")}</textarea></div>
  <div class="form-group"><label>Emergency Contact</label><input name="emergency" value="${esc(o.emergency||"")}"></div>
  <div class="form-group"><label>Notes</label><input name="notes" value="${esc(o.notes||"")}"></div>
  </form>`,()=>{
    let x=Object.fromEntries(new FormData($("ownerForm")));if(!x.name.trim()||!x.phone.trim()){toast("Name and phone are required.","error");return false}
    let old=ownerById(x.id);if(old)Object.assign(old,x);else{x.id=nextId(data.owners,"OWN");data.owners.push(x);addActivity("New owner registered: "+x.name)}
    saveData();closeModal();render();toast(edit?"Owner updated":"Owner added");return true;
  });
}
function deleteOwner(id){
  let o=ownerById(id), pets=data.pets.filter(p=>p.ownerId===id);
  if(pets.length){toast("Cannot delete owner while pets are linked. Reassign the pets first.","error");return}
  if(!confirm("Delete "+o.name+"?"))return;
  data.owners=data.owners.filter(x=>x.id!==id);saveData();render();toast("Owner deleted");
}
function openOwnerProfile(id){
  let o=ownerById(id);if(!o)return;
  currentOwner=id;
  $("content").innerHTML=header("Owner Profile","Complete owner and pet history","Edit Owner",`openOwnerModal('${id}')`)+
  `<div class="two-col"><div class="panel"><h3>Owner Information</h3>${ownerInfo(id)}</div><div class="panel"><h3>Summary</h3><div class="kpi-row">
  <div class="mini-kpi"><small>Pets</small><b>${data.pets.filter(p=>p.ownerId===id).length}</b></div><div class="mini-kpi"><small>Consultations</small><b>${data.consultations.filter(c=>c.ownerId===id).length}</b></div><div class="mini-kpi"><small>Outstanding</small><b>${money(data.charges.filter(c=>c.ownerId===id).reduce((a,c)=>a+balance(c.id),0))}</b></div></div></div></div>
  <div class="panel"><h3>Pets Owned</h3><div class="table-wrap"><table class="table"><thead><tr><th>Pet</th><th>Species</th><th>Breed</th><th>Age</th><th>Status</th></tr></thead><tbody>${data.pets.filter(p=>p.ownerId===id).map(p=>`<tr><td><button class="link" onclick="openPetProfile('${p.id}')">${esc(p.name)}</button></td><td>${p.species}</td><td>${esc(p.breed)}</td><td>${age(p.birthDate)}</td><td>${badge(p.status)}</td></tr>`).join("")||`<tr><td colspan="5" class="empty">No pets.</td></tr>`}</tbody></table></div></div>
  <div class="panel"><h3>Charges & Payments</h3>${historyTable(data.charges.filter(c=>c.ownerId===id),["date","description","category","total","paymentStatus"],"openChargeModal")}</div>`;
}

/* BREEDS */
function breedsPage(){
  let search=window.breedSearch||"", species=window.breedSpecies||"";
  let list=data.breeds.filter(b=>(!search||JSON.stringify(b).toLowerCase().includes(search.toLowerCase()))&&(!species||b.species===species));
  return header("Breed Management","Maintain breed information and health notes","Add Breed","openBreedModal()")+`<div class="panel"><div class="filters"><input placeholder="Search breed..." value="${esc(search)}" oninput="window.breedSearch=this.value;showPage('breeds')"><select onchange="window.breedSpecies=this.value;showPage('breeds')"><option value="">All species</option>${["Dog","Cat","Rabbit","Bird","Other"].map(x=>`<option ${species===x?"selected":""}>${x}</option>`).join("")}</select></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Breed</th><th>Species</th><th>Description</th><th>Common Health Notes</th><th>Actions</th></tr></thead><tbody>${list.map(b=>`<tr><td>${b.id}</td><td><b>${esc(b.name)}</b></td><td>${b.species}</td><td>${esc(b.description)}</td><td>${esc(b.health||"—")}</td><td><button class="btn" onclick="openBreedModal('${b.id}')">Edit</button> <button class="btn danger" onclick="deleteBreed('${b.id}')">Delete</button></td></tr>`).join("")||`<tr><td colspan="6" class="empty">No breeds found.</td></tr>`}</tbody></table></div></div>`;
}
function openBreedModal(id=""){
  let b=data.breeds.find(x=>x.id===id)||{},edit=!!id;
  openModal(`${edit?"Edit":"Add"} Breed`,`<form id="breedForm" class="form-grid"><input type="hidden" name="id" value="${esc(b.id||"")}"><div class="form-group"><label>Breed Name *</label><input name="name" required value="${esc(b.name||"")}"></div><div class="form-group"><label>Species *</label><select name="species">${["Dog","Cat","Rabbit","Bird","Other"].map(x=>`<option ${b.species===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="form-group full"><label>Description</label><textarea name="description">${esc(b.description||"")}</textarea></div><div class="form-group full"><label>Common Health Notes</label><textarea name="health">${esc(b.health||"")}</textarea></div></form>`,()=>{
    let x=Object.fromEntries(new FormData($("breedForm")));if(!x.name.trim()){toast("Breed name is required.","error");return false}
    let old=data.breeds.find(y=>y.id===x.id);if(old)Object.assign(old,x);else{x.id=nextId(data.breeds,"BRD");data.breeds.push(x)}
    saveData();closeModal();render();toast(edit?"Breed updated":"Breed added");return true;
  });
}
function deleteBreed(id){if(data.pets.some(p=>data.breeds.find(b=>b.id===id)?.name===p.breed)){toast("This breed is used by a pet and cannot be deleted.","error");return}if(confirm("Delete this breed?")){data.breeds=data.breeds.filter(x=>x.id!==id);saveData();render();}}

/* CONSULTATIONS */
function consultationsPage(){
  let list=data.consultations.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return header("Consultations","Veterinary consultation records","Add Consultation","openConsultationModal()")+`<div class="panel"><div class="filters"><input placeholder="Search pet, veterinarian, diagnosis..." oninput="window.conSearch=this.value;render()"><select onchange="window.conStatus=this.value;render()"><option value="">All statuses</option>${["Scheduled","In Progress","Completed","Cancelled"].map(x=>`<option>${x}</option>`).join("")}</select></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Date/Time</th><th>Pet</th><th>Owner</th><th>Veterinarian</th><th>Diagnosis</th><th>Status</th><th></th></tr></thead><tbody>${list.filter(c=>(!window.conSearch||JSON.stringify(c).toLowerCase().includes(window.conSearch.toLowerCase()))&&(!window.conStatus||c.status===window.conStatus)).map(c=>`<tr><td>${c.id}</td><td>${c.date} ${c.time}</td><td><button class="link" onclick="openPetProfile('${c.petId}')">${esc(petName(c.petId))}</button></td><td>${esc(ownerName(c.ownerId))}</td><td>${esc(c.veterinarian)}</td><td>${esc(c.diagnosis||"—")}</td><td>${badge(c.status)}</td><td><button class="btn" onclick="openConsultationModal('${c.id}')">View/Edit</button></td></tr>`).join("")||`<tr><td colspan="8" class="empty">No consultations.</td></tr>`}</tbody></table></div></div>`;
}
function openConsultationModal(id=""){
  let c=data.consultations.find(x=>x.id===id)||{date:today(),time:"09:00",status:"Scheduled"},edit=!!id;
  openModal(`${edit?"Edit":"Add"} Consultation`,`<form id="conForm" class="form-grid"><input type="hidden" name="id" value="${esc(c.id||"")}">
  <div class="form-group"><label>Pet *</label><select name="petId" id="conPet" required onchange="syncPetOwner('conPet','conOwner')"><option value="">Select pet</option>${petOptions(c.petId)}</select></div>
  <div class="form-group"><label>Owner</label><select name="ownerId" id="conOwner" readonly>${ownerOptions(c.ownerId)}</select></div>
  <div class="form-group"><label>Date *</label><input type="date" name="date" required value="${esc(c.date||today())}"></div><div class="form-group"><label>Time</label><input type="time" name="time" value="${esc(c.time||"09:00")}"></div>
  <div class="form-group"><label>Veterinarian</label><input name="veterinarian" value="${esc(c.veterinarian||"")}"></div><div class="form-group"><label>Weight (kg)</label><input type="number" step=".01" min="0" name="weight" value="${esc(c.weight||"")}"></div>
  <div class="form-group"><label>Temperature</label><input name="temperature" value="${esc(c.temperature||"")}"></div><div class="form-group"><label>Follow-up Date</label><input type="date" name="followUp" value="${esc(c.followUp||"")}"></div>
  <div class="form-group full"><label>Symptoms</label><textarea name="symptoms">${esc(c.symptoms||"")}</textarea></div><div class="form-group full"><label>Diagnosis</label><textarea name="diagnosis">${esc(c.diagnosis||"")}</textarea></div>
  <div class="form-group full"><label>Treatment</label><textarea name="treatment">${esc(c.treatment||"")}</textarea></div><div class="form-group full"><label>Prescription</label><textarea name="prescription">${esc(c.prescription||"")}</textarea></div>
  <div class="form-group"><label>Medicine Used</label><select name="medicineId"><option value="">None</option>${data.medicines.map(m=>`<option value="${m.id}" ${c.medicineId===m.id?"selected":""}>${esc(m.name)} — ${m.quantity} ${esc(m.unit)}</option>`).join("")}</select></div>
  <div class="form-group"><label>Medicine Quantity</label><input type="number" min="1" name="medicineQty" value="${esc(c.medicineQty||1)}"></div>
  <div class="form-group full"><label>Notes</label><textarea name="notes">${esc(c.notes||"")}</textarea></div>
  <div class="form-group"><label>Status</label><select name="status">${["Scheduled","In Progress","Completed","Cancelled"].map(x=>`<option ${c.status===x?"selected":""}>${x}</option>`).join("")}</select></div>
  </form>`,()=>{
    let x=Object.fromEntries(new FormData($("conForm")));if(!x.petId){toast("Select a pet.","error");return false}x.ownerId=petById(x.petId).ownerId;
    x.medicineQty=Number(x.medicineQty||0);
    if(x.medicineId && x.medicineQty<1){toast("Medicine quantity must be at least 1.","error");return false}
    let med=x.medicineId?medicineById(x.medicineId):null;
    let old=data.consultations.find(y=>y.id===x.id);
    if(!old && med){
      if(x.medicineQty>Number(med.quantity)){toast("Not enough medicine stock.","error");return false}
      med.quantity-=x.medicineQty;
    }
    if(old)Object.assign(old,x);else{x.id=nextId(data.consultations,"CON");data.consultations.push(x);if(med){let price=Number(med.price||0)*x.medicineQty;data.charges.push({id:nextId(data.charges,"CHG"),petId:x.petId,ownerId:x.ownerId,date:x.date,description:med.name+" (consultation use)",category:"Medicine",quantity:x.medicineQty,unitPrice:Number(med.price||0),discount:0,total:price,paymentStatus:"Unpaid"})}addActivity("Consultation added for "+petName(x.petId))}
    saveData();closeModal();render();return true;
  });
}
function syncPetOwner(petSelect,ownerSelect){let p=petById($(petSelect).value);if(p)$(ownerSelect).value=p.ownerId}

/* SERVICES */
function servicesPage(){
  return header("Services","Manage prices and services offered","Add Service","openServiceModal()")+`<div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Service</th><th>Category</th><th>Description</th><th>Price</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.services.map(s=>`<tr><td>${s.id}</td><td><b>${esc(s.name)}</b></td><td>${esc(s.category)}</td><td>${esc(s.description||"—")}</td><td>${money(s.price)}</td><td>${esc(s.duration||"—")} min</td><td>${badge(s.status)}</td><td><button class="btn" onclick="openServiceModal('${s.id}')">Edit</button> <button class="btn" onclick="toggleService('${s.id}')">${s.status==="Active"?"Deactivate":"Activate"}</button> <button class="btn danger" onclick="deleteService('${s.id}')">Delete</button></td></tr>`).join("")||`<tr><td colspan="8" class="empty">No services.</td></tr>`}</tbody></table></div></div>`+serviceRecordsPanel();
}
function openServiceModal(id=""){
  let s=data.services.find(x=>x.id===id)||{status:"Active"},edit=!!id;
  openModal(`${edit?"Edit":"Add"} Service`,`<form id="serviceForm" class="form-grid"><input type="hidden" name="id" value="${esc(s.id||"")}"><div class="form-group"><label>Service Name *</label><input name="name" required value="${esc(s.name||"")}"></div><div class="form-group"><label>Category</label><input name="category" value="${esc(s.category||"")}"></div><div class="form-group full"><label>Description</label><textarea name="description">${esc(s.description||"")}</textarea></div><div class="form-group"><label>Price *</label><input type="number" min="0" step=".01" name="price" required value="${esc(s.price||0)}"></div><div class="form-group"><label>Duration (minutes)</label><input type="number" min="0" name="duration" value="${esc(s.duration||60)}"></div><div class="form-group"><label>Status</label><select name="status"><option ${s.status==="Active"?"selected":""}>Active</option><option ${s.status==="Inactive"?"selected":""}>Inactive</option></select></div></form>`,()=>{
    let x=Object.fromEntries(new FormData($("serviceForm")));if(!x.name||Number(x.price)<0){toast("Enter a valid service and price.","error");return false}x.price=Number(x.price);
    let old=data.services.find(y=>y.id===x.id);if(old)Object.assign(old,x);else{x.id=nextId(data.services,"SRV");data.services.push(x);addActivity("Service added: "+x.name)}
    saveData();closeModal();render();return true;
  });
}
function toggleService(id){let s=serviceById(id);s.status=s.status==="Active"?"Inactive":"Active";saveData();render()}
function deleteService(id){if(data.serviceRecords.some(x=>x.serviceId===id)){toast("Service is used in service records.","error");return}if(confirm("Delete this service?")){data.services=data.services.filter(x=>x.id!==id);saveData();render()}}

/* SERVICE RECORDS */
function serviceRecordsPanel(){
  return `<div class="panel"><div class="panel-head"><h3>Service Records</h3><button class="btn primary" onclick="openServiceRecordModal()">Record Service</button></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Date</th><th>Pet</th><th>Service</th><th>Staff</th><th>Price</th><th>Discount</th><th>Total</th><th>Status</th></tr></thead><tbody>${data.serviceRecords.map(r=>`<tr><td>${r.id}</td><td>${r.date}</td><td>${esc(petName(r.petId))}</td><td>${esc(serviceById(r.serviceId)?.name||"—")}</td><td>${esc(r.staff||"—")}</td><td>${money(r.price)}</td><td>${money(r.discount)}</td><td>${money(r.total)}</td><td>${badge(r.status)}</td></tr>`).join("")||`<tr><td colspan="9" class="empty">No service records.</td></tr>`}</tbody></table></div></div>`;
}
function openServiceRecordModal(id=""){
  let r=data.serviceRecords.find(x=>x.id===id)||{date:today(),time:"09:00",status:"Completed",discount:0},edit=!!id;
  openModal(`${edit?"Edit":"Record"} Service`,`<form id="srForm" class="form-grid"><input type="hidden" name="id" value="${esc(r.id||"")}"><div class="form-group"><label>Pet *</label><select name="petId" id="srPet" onchange="syncPetOwner('srPet','srOwner')" required><option value="">Select pet</option>${petOptions(r.petId)}</select></div><div class="form-group"><label>Owner</label><select name="ownerId" id="srOwner">${ownerOptions(r.ownerId)}</select></div><div class="form-group"><label>Service *</label><select name="serviceId" id="srService" required onchange="fillServicePrice()"><option value="">Select service</option>${serviceOptions(r.serviceId)}</select></div><div class="form-group"><label>Staff</label><input name="staff" value="${esc(r.staff||"")}"></div><div class="form-group"><label>Date</label><input type="date" name="date" value="${esc(r.date||today())}"></div><div class="form-group"><label>Time</label><input type="time" name="time" value="${esc(r.time||"09:00")}"></div><div class="form-group"><label>Price</label><input id="srPrice" type="number" min="0" name="price" value="${esc(r.price||"")}"></div><div class="form-group"><label>Discount</label><input type="number" min="0" name="discount" value="${esc(r.discount||0)}"></div><div class="form-group"><label>Status</label><select name="status">${["Completed","Scheduled","Cancelled"].map(x=>`<option ${r.status===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="form-group full"><label>Notes</label><textarea name="notes">${esc(r.notes||"")}</textarea></div></form>`,()=>{
    let x=Object.fromEntries(new FormData($("srForm")));x.ownerId=petById(x.petId)?.ownerId;x.price=Number(x.price||0);x.discount=Number(x.discount||0);x.total=Math.max(0,x.price-x.discount);
    if(!x.petId||!x.serviceId||x.price<0){toast("Complete pet, service and price.","error");return false}
    let old=data.serviceRecords.find(y=>y.id===x.id);
    if(old)Object.assign(old,x);else{x.id=nextId(data.serviceRecords,"SREC");data.serviceRecords.push(x);createChargeFromService(x);addActivity("Service completed for "+petName(x.petId))}
    saveData();closeModal();showPage("services");return true;
  });
}
function fillServicePrice(){let s=serviceById($("srService").value);if(s)$("srPrice").value=s.price}

/* MEDICINES */
function medicineStatus(m){
  let q=Number(m.quantity||0), min=Number(m.minimum||0), exp=m.expiration;
  if(q<=0)return "Out of Stock";
  if(exp && exp<today())return "Expired";
  let soon=exp && ((new Date(exp)-new Date(today()))/86400000)<=30;
  if(soon)return "Expiring Soon";
  if(q<=min)return "Low Stock";
  return "Available";
}
function medicinesPage(){
  let list=data.medicines.filter(m=>!window.medSearch||JSON.stringify(m).toLowerCase().includes(window.medSearch.toLowerCase()));
  return header("Medicines","Inventory, stock levels and expiration tracking","Add Medicine","openMedicineModal()")+`<div class="panel"><div class="filters"><input placeholder="Search medicine, supplier, batch..." value="${esc(window.medSearch||"")}" oninput="window.medSearch=this.value;render()"><select onchange="window.medStatus=this.value;render()"><option value="">All stock status</option>${["Available","Low Stock","Out of Stock","Expired","Expiring Soon"].map(x=>`<option ${window.medStatus===x?"selected":""}>${x}</option>`).join("")}</select></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Medicine</th><th>Type</th><th>Qty</th><th>Price</th><th>Supplier</th><th>Expiration</th><th>Status</th><th>Actions</th></tr></thead><tbody>${list.filter(m=>!window.medStatus||medicineStatus(m)===window.medStatus).map(m=>`<tr><td>${m.id}</td><td><b>${esc(m.name)}</b></td><td>${esc(m.type)}</td><td>${m.quantity} ${esc(m.unit)}</td><td>${money(m.price)}</td><td>${esc(m.supplier||"—")}</td><td>${esc(m.expiration||"—")}</td><td>${badge(medicineStatus(m))}</td><td><button class="btn" onclick="openMedicineModal('${m.id}')">Edit</button> <button class="btn" onclick="useMedicine('${m.id}')">Use</button></td></tr>`).join("")||`<tr><td colspan="9" class="empty">No medicines.</td></tr>`}</tbody></table></div></div>`;
}
function openMedicineModal(id=""){
  let m=medicineById(id)||{},edit=!!id;
  openModal(`${edit?"Edit":"Add"} Medicine`,`<form id="medForm" class="form-grid"><input type="hidden" name="id" value="${esc(m.id||"")}"><div class="form-group"><label>Medicine Name *</label><input name="name" required value="${esc(m.name||"")}"></div><div class="form-group"><label>Type</label><input name="type" value="${esc(m.type||"")}"></div><div class="form-group full"><label>Description</label><textarea name="description">${esc(m.description||"")}</textarea></div><div class="form-group"><label>Quantity *</label><input type="number" min="0" name="quantity" required value="${esc(m.quantity||0)}"></div><div class="form-group"><label>Unit</label><input name="unit" value="${esc(m.unit||"pcs")}"></div><div class="form-group"><label>Price *</label><input type="number" min="0" step=".01" name="price" required value="${esc(m.price||0)}"></div><div class="form-group"><label>Supplier</label><input name="supplier" value="${esc(m.supplier||"")}"></div><div class="form-group"><label>Batch Number</label><input name="batch" value="${esc(m.batch||"")}"></div><div class="form-group"><label>Expiration Date</label><input type="date" name="expiration" value="${esc(m.expiration||"")}"></div><div class="form-group"><label>Minimum Stock</label><input type="number" min="0" name="minimum" value="${esc(m.minimum||0)}"></div><div class="form-group full"><label>Storage Location</label><input name="location" value="${esc(m.location||"")}"></div></form>`,()=>{
    let x=Object.fromEntries(new FormData($("medForm")));x.quantity=Number(x.quantity);x.price=Number(x.price);x.minimum=Number(x.minimum);
    if(!x.name||x.quantity<0||x.price<0){toast("Check medicine name, quantity and price.","error");return false}
    let old=medicineById(x.id);if(old)Object.assign(old,x);else{x.id=nextId(data.medicines,"MED");data.medicines.push(x);addActivity("Medicine added: "+x.name)}
    saveData();closeModal();render();return true;
  });
}
function useMedicine(id){
  let m=medicineById(id);if(!m||m.quantity<=0){toast("Medicine is out of stock.","error");return}
  let qty=prompt("How many "+m.unit+" of "+m.name+" were used?","1");qty=Number(qty);
  if(!qty||qty<1||qty>m.quantity){toast("Invalid quantity.","error");return}
  m.quantity-=qty;saveData();render();toast("Stock updated");
}

/* APPOINTMENTS */
function appointmentsPage(){
  let list=data.appointments.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  return header("Appointments","Today's, upcoming and historical appointments","Add Appointment","openAppointmentModal()")+`<div class="cards">${stat("Today",list.filter(a=>a.date===today()).length,"📅","Appointments")}${stat("Upcoming",list.filter(a=>a.date>today()&&a.status!=="Cancelled").length,"⏰","Future")}${stat("Completed",list.filter(a=>a.status==="Completed").length,"✅","History")}${stat("No Show",list.filter(a=>a.status==="No Show").length,"⚠️","History")}</div><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Date</th><th>Time</th><th>Pet</th><th>Owner</th><th>Purpose</th><th>Service</th><th>Vet</th><th>Status</th><th></th></tr></thead><tbody>${list.map(a=>`<tr><td>${a.id}</td><td>${a.date}</td><td>${a.time}</td><td>${esc(petName(a.petId))}</td><td>${esc(ownerName(a.ownerId))}</td><td>${esc(a.purpose||"—")}</td><td>${esc(serviceById(a.serviceId)?.name||"—")}</td><td>${esc(a.veterinarian||"—")}</td><td>${badge(a.status)}</td><td><button class="btn" onclick="openAppointmentModal('${a.id}')">Edit</button></td></tr>`).join("")||`<tr><td colspan="10" class="empty">No appointments.</td></tr>`}</tbody></table></div></div>`;
}
function openAppointmentModal(id=""){
  let a=data.appointments.find(x=>x.id===id)||{date:today(),time:"10:00",status:"Scheduled"},edit=!!id;
  openModal(`${edit?"Edit":"Add"} Appointment`,`<form id="apptForm" class="form-grid"><input type="hidden" name="id" value="${esc(a.id||"")}"><div class="form-group"><label>Pet *</label><select name="petId" id="apPet" required onchange="syncPetOwner('apPet','apOwner')"><option value="">Select pet</option>${petOptions(a.petId)}</select></div><div class="form-group"><label>Owner</label><select name="ownerId" id="apOwner">${ownerOptions(a.ownerId)}</select></div><div class="form-group"><label>Date *</label><input type="date" name="date" required value="${esc(a.date||today())}"></div><div class="form-group"><label>Time *</label><input type="time" name="time" required value="${esc(a.time||"10:00")}"></div><div class="form-group"><label>Purpose</label><input name="purpose" value="${esc(a.purpose||"")}"></div><div class="form-group"><label>Service</label><select name="serviceId"><option value="">None</option>${serviceOptions(a.serviceId)}</select></div><div class="form-group"><label>Veterinarian</label><input name="veterinarian" value="${esc(a.veterinarian||"")}"></div><div class="form-group"><label>Status</label><select name="status">${["Scheduled","Confirmed","Completed","Cancelled","No Show"].map(x=>`<option ${a.status===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="form-group full"><label>Notes</label><textarea name="notes">${esc(a.notes||"")}</textarea></div></form>`,()=>{
    let x=Object.fromEntries(new FormData($("apptForm")));if(!x.petId||!x.date){toast("Select a pet and date.","error");return false}x.ownerId=petById(x.petId).ownerId;
    let old=data.appointments.find(y=>y.id===x.id);if(old)Object.assign(old,x);else{x.id=nextId(data.appointments,"APT");data.appointments.push(x);addActivity("Appointment added for "+petName(x.petId))}
    saveData();closeModal();render();return true;
  });
}

/* CHARGES & BILLING */
function balance(id){let c=data.charges.find(x=>x.id===id);if(!c)return 0;let paid=data.payments.filter(p=>p.chargeId===id).reduce((a,p)=>a+Number(p.amount||0),0);return Math.max(0,Number(c.total||0)-paid)}
function paymentStatus(id){let c=data.charges.find(x=>x.id===id);if(!c)return "Unpaid";let b=balance(id);let paid=Number(c.total||0)-b;return paid<=0?"Unpaid":b<=0?"Paid":"Partially Paid"}
function updateChargeStatus(c){c.paymentStatus=paymentStatus(c.id)}
function chargesPage(){
  let list=data.charges.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return header("Clinic Charges","Billing records from consultations, services, medicines and other charges","Create Charge","openChargeModal()")+`<div class="cards">${stat("Total Charges",money(list.reduce((a,c)=>a+Number(c.total||0),0)),"🧾","Recorded")}${stat("Paid",money(list.filter(c=>paymentStatus(c.id)==="Paid").reduce((a,c)=>a+Number(c.total||0),0)),"✅","Settled")}${stat("Outstanding",money(list.reduce((a,c)=>a+balance(c.id),0)),"💰","Balance")}${stat("Unpaid Bills",list.filter(c=>paymentStatus(c.id)!=="Paid").length,"⚠️","Need payment")}</div>
  <div class="panel"><h3>Quick Billing Summary</h3><p style="font-size:12px;color:#64748b">Each charge is linked to a pet and owner. Use <b>Pay</b> to record full or partial payments; balances update automatically.</p></div><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Date</th><th>Pet</th><th>Owner</th><th>Description</th><th>Category</th><th>Qty</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${list.map(c=>{updateChargeStatus(c);return`<tr><td>${c.id}</td><td>${c.date}</td><td>${esc(petName(c.petId))}</td><td>${esc(ownerName(c.ownerId))}</td><td>${esc(c.description)}</td><td>${esc(c.category)}</td><td>${c.quantity}</td><td>${money(c.total)}</td><td>${badge(c.paymentStatus)}</td><td><button class="btn" onclick="openChargeModal('${c.id}')">View</button> <button class="btn primary" onclick="openPaymentModal('${c.id}')">Pay</button></td></tr>`}).join("")||`<tr><td colspan="10" class="empty">No charges.</td></tr>`}</tbody></table></div></div>`;
}
function createChargeFromService(r){
  let s=serviceById(r.serviceId);if(!s)return;
  data.charges.push({id:nextId(data.charges,"CHG"),petId:r.petId,ownerId:r.ownerId,date:r.date,description:s.name,category:"Service",quantity:1,unitPrice:r.price,discount:r.discount,total:r.total,paymentStatus:"Unpaid"});
}
function openChargeModal(id=""){
  let c=data.charges.find(x=>x.id===id)||{date:today(),quantity:1,discount:0,category:"Other",paymentStatus:"Unpaid"},edit=!!id;
  openModal(`${edit?"View/Edit":"Create"} Charge`,`<form id="chargeForm" class="form-grid"><input type="hidden" name="id" value="${esc(c.id||"")}"><div class="form-group"><label>Pet *</label><select name="petId" id="chPet" required onchange="syncPetOwner('chPet','chOwner')"><option value="">Select pet</option>${petOptions(c.petId)}</select></div><div class="form-group"><label>Owner</label><select name="ownerId" id="chOwner">${ownerOptions(c.ownerId)}</select></div><div class="form-group"><label>Date</label><input type="date" name="date" value="${esc(c.date||today())}"></div><div class="form-group"><label>Category</label><select name="category">${["Consultation","Service","Medicine","Vaccination","Other"].map(x=>`<option ${c.category===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="form-group full"><label>Description *</label><input name="description" required value="${esc(c.description||"")}"></div><div class="form-group"><label>Quantity</label><input id="chQty" type="number" min="1" name="quantity" value="${esc(c.quantity||1)}" oninput="calcCharge()"></div><div class="form-group"><label>Unit Price</label><input id="chPrice" type="number" min="0" step=".01" name="unitPrice" value="${esc(c.unitPrice||0)}" oninput="calcCharge()"></div><div class="form-group"><label>Discount</label><input id="chDiscount" type="number" min="0" step=".01" name="discount" value="${esc(c.discount||0)}" oninput="calcCharge()"></div><div class="form-group"><label>Total</label><input id="chTotal" readonly value="${esc(c.total||0)}"></div></form>`,()=>{
    let x=Object.fromEntries(new FormData($("chargeForm")));x.quantity=Number(x.quantity);x.unitPrice=Number(x.unitPrice);x.discount=Number(x.discount);x.total=Math.max(0,x.quantity*x.unitPrice-x.discount);x.ownerId=petById(x.petId)?.ownerId;
    if(!x.petId||!x.description||x.quantity<1||x.unitPrice<0||x.discount<0){toast("Check the charge fields.","error");return false}
    if(x.discount>x.quantity*x.unitPrice){toast("Discount cannot exceed subtotal.","error");return false}
    if(edit){Object.assign(c,x);updateChargeStatus(c)}else{x.id=nextId(data.charges,"CHG");x.paymentStatus="Unpaid";data.charges.push(x);addActivity("Charge created for "+petName(x.petId))}
    saveData();closeModal();render();return true;
  });
}
function calcCharge(){let q=Number($("chQty")?.value||0),p=Number($("chPrice")?.value||0),d=Number($("chDiscount")?.value||0);if($("chTotal"))$("chTotal").value=Math.max(0,q*p-d).toFixed(2)}

/* PAYMENTS */
function paymentsPage(){
  return header("Payments","Record and track customer payments","Record Payment","openPaymentModal()")+`<div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Date</th><th>Charge</th><th>Pet</th><th>Owner</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead><tbody>${data.payments.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(p=>`<tr><td>${p.id}</td><td>${p.date}</td><td>${p.chargeId}</td><td>${esc(petName(p.petId))}</td><td>${esc(ownerName(p.ownerId))}</td><td>${money(p.amount)}</td><td>${esc(p.method)}</td><td>${esc(p.reference||"—")}</td></tr>`).join("")||`<tr><td colspan="8" class="empty">No payments.</td></tr>`}</tbody></table></div></div>`;
}
function openPaymentModal(chargeId=""){
  let c=chargeId?data.charges.find(x=>x.id===chargeId):data.charges.find(x=>balance(x.id)>0);
  if(!c){toast("No outstanding charge found.","error");return}
  openModal("Record Payment",`<form id="payForm" class="form-grid"><div class="form-group full"><label>Charge</label><select name="chargeId" id="payCharge" onchange="fillPayment()">${data.charges.filter(x=>balance(x.id)>0).map(x=>`<option value="${x.id}" ${x.id===c.id?"selected":""}>${x.id} — ${x.description} — Balance ${money(balance(x.id))}</option>`).join("")}</select></div><div class="form-group"><label>Pet</label><input id="payPet" readonly value="${esc(petName(c.petId))}"></div><div class="form-group"><label>Owner</label><input id="payOwner" readonly value="${esc(ownerName(c.ownerId))}"></div><div class="form-group"><label>Amount *</label><input id="payAmount" type="number" min=".01" step=".01" max="${balance(c.id)}" name="amount" required value="${balance(c.id).toFixed(2)}"></div><div class="form-group"><label>Date</label><input type="date" name="date" value="${today()}"></div><div class="form-group"><label>Payment Method</label><select name="method">${["Cash","GCash","Bank Transfer","Card","Other"].map(x=>`<option>${x}</option>`).join("")}</select></div><div class="form-group"><label>Reference Number</label><input name="reference"></div><div class="form-group full"><label>Notes</label><textarea name="notes"></textarea></div></form>`,()=>{
    let x=Object.fromEntries(new FormData($("payForm")));x.amount=Number(x.amount);let ch=data.charges.find(c=>c.id===x.chargeId),bal=balance(x.chargeId);
    if(!ch||x.amount<=0||x.amount>bal){toast("Payment cannot exceed the remaining balance.","error");return false}
    x.id=nextId(data.payments,"PAY");x.petId=ch.petId;x.ownerId=ch.ownerId;data.payments.push(x);updateChargeStatus(ch);addActivity("Payment recorded for "+petName(ch.petId));saveData();closeModal();render();toast("Payment recorded");return true;
  });
}
function fillPayment(){let c=data.charges.find(x=>x.id===$("payCharge").value);if(c){$("payPet").value=petName(c.petId);$("payOwner").value=ownerName(c.ownerId);$("payAmount").max=balance(c.id);$("payAmount").value=balance(c.id).toFixed(2)}}

/* REPORTS */
function reportsPage(){
  let petsBy={};data.pets.forEach(p=>petsBy[p.species]=(petsBy[p.species]||0)+1);
  let revenue=data.payments.reduce((a,p)=>a+Number(p.amount||0),0);
  let outstanding=data.charges.reduce((a,c)=>a+balance(c.id),0);
  let diagnoses={};data.consultations.forEach(c=>{if(c.diagnosis)diagnoses[c.diagnosis]=(diagnoses[c.diagnosis]||0)+1});
  return header("Reports & Analytics","Actual data from your LocalStorage records","Export Report","exportReportCSV()")+`<div class="filters"><select onchange="reportRange=this.value;drawReportsCharts()"><option value="today">Today</option><option value="week">This week</option><option value="month" selected>This month</option><option value="year">This year</option></select><button class="btn" onclick="exportAll('csv')">Export All CSV</button><button class="btn" onclick="window.print()">Printable Report</button></div>
  <div class="cards">${stat("Total Pets",data.pets.length,"🐾")}${stat("Owners",data.owners.length,"👤")}${stat("Consultations",data.consultations.length,"🩺")}${stat("Services Done",data.serviceRecords.length,"✂️")}${stat("Payments",money(revenue),"💳")}${stat("Outstanding",money(outstanding),"💰")}</div>
  <div class="grid2"><div class="panel"><h3>Pets by Species</h3><canvas id="speciesChart" class="chart"></canvas></div><div class="panel"><h3>Revenue by Month</h3><canvas id="revenueChart" class="chart"></canvas></div></div>
  <div class="grid2"><div class="panel"><h3>Services Performed</h3><canvas id="serviceChart" class="chart"></canvas></div><div class="panel"><h3>Paid vs Unpaid Charges</h3><canvas id="paidChart" class="chart"></canvas></div></div>
  <div class="two-col"><div class="panel"><h3>Common Diagnoses</h3>${barList(diagnoses)}</div><div class="panel"><h3>Medicine Usage / Stock</h3>${data.medicines.length?barList(Object.fromEntries(data.medicines.map(m=>[m.name,m.quantity]))):"<div class='empty'>No medicines.</div>"}</div></div>`;
}
function barList(obj){let entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,8),max=Math.max(1,...entries.map(x=>x[1]));return `<div class="bar-list">${entries.map(([k,v])=>`<div class="bar-row"><span>${esc(k)}</span><div class="bar"><i style="width:${v/max*100}%"></i></div><b>${v}</b></div>`).join("")||"<div class='empty'>No data.</div>"}</div>`}
function canvasBars(id,labels,values,title){
  let c=$(id);if(!c)return;let ctx=c.getContext("2d"),w=c.width=c.clientWidth*2,h=c.height=c.clientHeight*2;ctx.scale(2,2);w/=2;h/=2;ctx.clearRect(0,0,w,h);
  let max=Math.max(1,...values),gap=14, bw=Math.max(8,(w-gap*(values.length+1))/Math.max(1,values.length));
  ctx.font="11px Arial";ctx.fillStyle="#64748b";
  values.forEach((v,i)=>{let bh=(h-50)*(v/max),x=gap+i*(bw+gap),y=h-28-bh;ctx.fillStyle="#27ae78";ctx.fillRect(x,y,bw,bh);ctx.fillStyle="#475569";ctx.textAlign="center";ctx.fillText(String(v),x+bw/2,y-5);ctx.fillText(String(labels[i]).slice(0,12),x+bw/2,h-10)});
}
function drawDashboardChart(){
  let months=[];for(let i=5;i>=0;i--){let d=new Date();d.setMonth(d.getMonth()-i);months.push(d.toISOString().slice(0,7))}
  let vals=months.map(m=>data.payments.filter(p=>String(p.date).slice(0,7)===m).reduce((a,p)=>a+Number(p.amount||0),0));
  canvasBars("dashboardChart",months,vals);
}
function drawReportsCharts(){
  let species={};data.pets.forEach(p=>species[p.species]=(species[p.species]||0)+1);
  canvasBars("speciesChart",Object.keys(species),Object.values(species));
  let months=[];for(let i=5;i>=0;i--){let d=new Date();d.setMonth(d.getMonth()-i);months.push(d.toISOString().slice(0,7))}
  canvasBars("revenueChart",months,months.map(m=>data.payments.filter(p=>String(p.date).slice(0,7)===m).reduce((a,p)=>a+Number(p.amount||0),0)));
  let sv={};data.serviceRecords.forEach(r=>{let n=serviceById(r.serviceId)?.name||"Other";sv[n]=(sv[n]||0)+1});
  canvasBars("serviceChart",Object.keys(sv),Object.values(sv));
  let paid=data.charges.filter(c=>paymentStatus(c.id)==="Paid").length, unpaid=data.charges.length-paid;
  canvasBars("paidChart",["Paid","Unpaid"],[paid,unpaid]);
}

/* SEARCH */
function searchPage(){
  let q=window.bigSearch||"";
  return header("Global Search","Search across pets, owners and every major record.")+`<div class="panel"><div class="filters"><input autofocus placeholder="Search anything: Max, Juan, PET-0001, phone, microchip..." value="${esc(q)}" oninput="window.bigSearch=this.value;renderSearchResults()"></div><div id="bigResults">${globalResults(q)}</div></div>`;
}
function globalResults(q){
  if(!q)return "<div class='empty'>Start typing to search the entire system.</div>";
  q=q.toLowerCase();let pets=data.pets.filter(x=>JSON.stringify(x).toLowerCase().includes(q)),owners=data.owners.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
  let rows=[...pets.map(p=>({type:"Pet",title:p.name,sub:`${p.id} · ${p.species} · ${p.breed}`,action:`openPetProfile('${p.id}')`})),...owners.map(o=>({type:"Owner",title:o.name,sub:`${o.id} · ${o.phone}`,action:`openOwnerProfile('${o.id}')`}))];
  data.consultations.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).forEach(x=>rows.push({type:"Consultation",title:x.id,sub:`${petName(x.petId)} · ${x.diagnosis||"No diagnosis"}`,action:`openConsultationModal('${x.id}')`}));
  data.charges.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).forEach(x=>rows.push({type:"Charge",title:x.id,sub:`${petName(x.petId)} · ${money(x.total)}`,action:`openChargeModal('${x.id}')`}));
  return rows.length?rows.map(r=>`<div class="search-result"><div><b>${esc(r.title)}</b><div style="font-size:11px;color:#64748b">${esc(r.sub)}</div></div><button class="btn" onclick="${r.action}">${r.type}</button></div>`).join(""):"<div class='empty'>No matching records.</div>";
}
function renderSearchResults(){if($("bigResults"))$("bigResults").innerHTML=globalResults(window.bigSearch||"")}
function setupGlobalSearch(){
  $("globalSearch").addEventListener("input",e=>{
    let q=e.target.value.trim().toLowerCase(),drop=$("searchDrop");
    if(!q){drop.classList.add("hidden");return}
    let pets=data.pets.filter(p=>JSON.stringify(p).toLowerCase().includes(q)).slice(0,5),owners=data.owners.filter(o=>JSON.stringify(o).toLowerCase().includes(q)).slice(0,5);
    let all=[...pets.map(p=>`<div class="search-result" onclick="openPetProfile('${p.id}');$('globalSearch').value='';$('searchDrop').classList.add('hidden')"><div><b>🐾 ${esc(p.name)}</b><small>${esc(p.id)} · ${esc(p.species)}</small></div></div>`),...owners.map(o=>`<div class="search-result" onclick="openOwnerProfile('${o.id}');$('globalSearch').value='';$('searchDrop').classList.add('hidden')"><div><b>👤 ${esc(o.name)}</b><small>${esc(o.id)} · ${esc(o.phone)}</small></div></div>`)];
    drop.innerHTML=all.join("")||"<div class='empty'>No matches.</div>";drop.classList.remove("hidden");
  });
}

/* BACKUP / SETTINGS */
function backupPage(){
  return header("Backup & Restore","Protect your records and move data between computers.","Backup JSON","backupData()")+`<div class="two-col"><div class="panel"><h3>Backup</h3><p>Download all pets, owners, consultations, inventory, billing and settings as one JSON file.</p><button class="btn primary" onclick="backupData()">Download Backup</button><hr><h3>Export Data</h3><div class="actions"><button class="btn" onclick="exportAll('json')">All JSON</button><button class="btn" onclick="exportAll('csv')">All CSV</button><button class="btn" onclick="window.print()">Printable Report</button></div></div><div class="panel"><h3>Restore</h3><div class="notice">Your current data will be replaced. A valid PetCare backup JSON is required.</div><input type="file" id="restoreFile" accept=".json,application/json" onchange="restoreData(event)"></div></div>
  <div class="panel danger-box"><b>Clear All Data</b><p>This permanently clears LocalStorage for this app. Make a backup first.</p><button class="btn danger" onclick="clearAllData()">Clear All Data</button></div>`;
}
function settingsPage(){
  return header("Settings","Simple application settings.")+`<div class="panel settings"><h3>Business Settings</h3><form id="settingsForm" class="form-grid"><div class="form-group"><label>Shop / Clinic Name</label><input name="shopName" value="${esc(data.settings.shopName||"")}"></div><div class="form-group"><label>Currency Symbol</label><input name="currency" value="${esc(data.settings.currency||"₱")}"></div></form><br><button class="btn primary" onclick="saveSettings()">Save Settings</button></div>
  <div class="panel"><h3>Demo Data</h3><p>Load realistic sample pets, owners, breeds, consultations, services, medicines, appointments, charges and payments for testing.</p><div class="actions"><button class="btn primary" onclick="loadDemo()">Load Demo Data</button><button class="btn danger" onclick="clearDemoData()">Clear Demo Data</button></div></div>
  <div class="panel"><h3>About</h3><p>This is a frontend-only system. Records are stored in this browser's LocalStorage. No real payment gateway or server database is connected.</p></div>`;
}
function saveSettings(){let x=Object.fromEntries(new FormData($("settingsForm")));data.settings=x;saveData();render();toast("Settings saved")}

/* MODAL */
function openModal(title,body,saveFn){
  $("modalCard").innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="modalSave">Save</button></div>`;
  $("modal").classList.remove("hidden");$("modalSave").onclick=saveFn;
}
function closeModal(){$("modal").classList.add("hidden");$("modalCard").innerHTML=""}
$("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});

/* EXPORT */
function download(text,name,type){
  let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function backupData(){download(JSON.stringify(data,null,2),`pet-shop-backup-${today()}.json`,"application/json");toast("Backup downloaded")}
function restoreData(e){
  let file=e.target.files[0];if(!file)return;let r=new FileReader();
  r.onload=()=>{try{let x=JSON.parse(r.result),keys=["pets","owners","breeds","consultations","services","serviceRecords","medicines","appointments","charges","payments"];if(!keys.every(k=>Array.isArray(x[k])))throw Error("Invalid");if(!confirm("Are you sure you want to restore this backup? Current data will be replaced."))return;data={...data,...x};saveData();render();toast("Backup restored")}catch(err){toast("Invalid PetCare backup JSON.","error")}};
  r.readAsText(file);
}
function csv(rows){
  if(!rows.length)return "";
  let keys=Object.keys(rows[0]);return [keys.join(","),...rows.map(r=>keys.map(k=>`"${String(r[k]??"").replace(/"/g,'""')}"`).join(","))].join("\n");
}
function exportCSV(list,name){download(csv(list),name+".csv","text/csv")}
function exportReportCSV(){exportCSV(data.charges,"clinic-charges-report-"+today())}
function exportAll(type){
  if(type==="json"){backupData();return}
  let all=[["pets",data.pets],["owners",data.owners],["breeds",data.breeds],["consultations",data.consultations],["services",data.services],["serviceRecords",data.serviceRecords],["medicines",data.medicines],["appointments",data.appointments],["charges",data.charges],["payments",data.payments]];
  all.forEach(([n,v])=>exportCSV(v,n+"-"+today()));
}
function downloadTable(list,name){exportCSV(list,name+"-"+today())}

/* DEMO DATA */
function loadDemo(){
  if(data.pets.length||data.owners.length){if(!confirm("Demo data will be added to your current data. Continue?"))return}
  let owners=[
    {id:"OWN-0001",name:"Juan Dela Cruz",phone:"09171234567",email:"juan@example.com",address:"Pasig City",emergency:"09170000001",notes:"Regular client"},
    {id:"OWN-0002",name:"Maria Santos",phone:"09221234567",email:"maria@example.com",address:"Quezon City",emergency:"09220000002",notes:""},
    {id:"OWN-0003",name:"Carlo Reyes",phone:"09351234567",email:"carlo@example.com",address:"Makati City",emergency:"09350000003",notes:""},
    {id:"OWN-0004",name:"Angela Garcia",phone:"09451234567",email:"angela@example.com",address:"Pasig City",emergency:"09450000004",notes:""},
    {id:"OWN-0005",name:"Mark Lim",phone:"09551234567",email:"mark@example.com",address:"Manila",emergency:"09550000005",notes:""}
  ];
  data.owners.push(...owners);
  data.breeds.push(
    {id:"BRD-0001",name:"Labrador Retriever",species:"Dog",description:"Friendly and active breed",health:"Hip and elbow concerns"},
    {id:"BRD-0002",name:"Golden Retriever",species:"Dog",description:"Friendly family dog",health:"Skin and joint concerns"},
    {id:"BRD-0003",name:"German Shepherd",species:"Dog",description:"Intelligent working breed",health:"Hip dysplasia"},
    {id:"BRD-0004",name:"Poodle",species:"Dog",description:"Smart companion breed",health:"Dental and skin care"},
    {id:"BRD-0005",name:"Persian",species:"Cat",description:"Long-haired companion cat",health:"Respiratory and eye care"},
    {id:"BRD-0006",name:"Siamese",species:"Cat",description:"Active social cat",health:"Dental care"},
    {id:"BRD-0007",name:"Holland Lop",species:"Rabbit",description:"Small friendly rabbit",health:"Dental and digestive care"},
    {id:"BRD-0008",name:"Budgerigar",species:"Bird",description:"Small companion bird",health:"Respiratory care"}
  );
  let pets=[
    ["Max","Dog","Labrador Retriever","Male","2021-04-12","Black","28","Juan Dela Cruz"],
    ["Milo","Cat","Persian","Male","2022-08-20","White","4.2","Juan Dela Cruz"],
    ["Bella","Dog","Poodle","Female","2020-02-15","Cream","8","Juan Dela Cruz"],
    ["Coco","Cat","Siamese","Female","2023-01-09","Cream","3.5","Maria Santos"],
    ["Rocky","Dog","German Shepherd","Male","2019-06-02","Black/Tan","31","Maria Santos"],
    ["Luna","Dog","Golden Retriever","Female","2022-10-10","Golden","25","Carlo Reyes"],
    ["Bun","Rabbit","Holland Lop","Male","2024-02-04","Brown","1.7","Angela Garcia"],
    ["Kiwi","Bird","Budgerigar","Female","2023-05-11","Green","0.04","Mark Lim"],
    ["Daisy","Dog","Poodle","Female","2021-11-18","White","7","Angela Garcia"],
    ["Simba","Cat","Siamese","Male","2022-03-27","Cream","4.8","Mark Lim"]
  ];
  pets.forEach((p,i)=>data.pets.push({id:"PET-"+String(i+1).padStart(4,"0"),name:p[0],species:p[1],breed:p[2],sex:p[3],birthDate:p[4],color:p[5],weight:p[6],ownerId:owners.find(o=>o.name===p[7]).id,contact:"",address:"",allergies:i===0?"Chicken":"",notes:i===2?"Routine dental care recommended.":"",status:"Active",photo:""}));
  data.services.push(
    {id:"SRV-0001",name:"Basic Grooming",category:"Grooming",description:"Bath, brush and basic trim",price:350,duration:60,status:"Active"},
    {id:"SRV-0002",name:"Bath",category:"Grooming",description:"Full pet bath",price:200,duration:40,status:"Active"},
    {id:"SRV-0003",name:"Nail Trimming",category:"Grooming",description:"Nail trimming",price:120,duration:20,status:"Active"},
    {id:"SRV-0004",name:"Ear Cleaning",category:"Grooming",description:"Ear cleaning",price:150,duration:20,status:"Active"},
    {id:"SRV-0005",name:"Dental Cleaning",category:"Dental",description:"Basic dental cleaning",price:700,duration:60,status:"Active"},
    {id:"SRV-0006",name:"Vaccination",category:"Medical",description:"Vaccination service",price:600,duration:30,status:"Active"},
    {id:"SRV-0007",name:"Consultation",category:"Medical",description:"Veterinary consultation",price:500,duration:30,status:"Active"},
    {id:"SRV-0008",name:"Deworming",category:"Medical",description:"Deworming service",price:300,duration:20,status:"Active"},
    {id:"SRV-0009",name:"Pet Boarding",category:"Boarding",description:"Daily boarding",price:500,duration:1440,status:"Active"}
  );
  data.medicines.push(
    {id:"MED-0001",name:"Paracetamol",type:"Tablet",description:"Pain relief",quantity:20,unit:"pcs",price:25,supplier:"PetMed Supply",batch:"P-2601",expiration:"2027-06-30",minimum:5,location:"Shelf A1"},
    {id:"MED-0002",name:"Amoxicillin",type:"Capsule",description:"Antibiotic",quantity:8,unit:"pcs",price:45,supplier:"VetPharm",batch:"A-2602",expiration:"2027-02-15",minimum:10,location:"Shelf A2"},
    {id:"MED-0003",name:"Vitamin B Complex",type:"Tablet",description:"Vitamin supplement",quantity:35,unit:"pcs",price:18,supplier:"VetPharm",batch:"V-2601",expiration:"2028-01-10",minimum:8,location:"Shelf B1"},
    {id:"MED-0004",name:"Deworming Suspension",type:"Liquid",description:"Deworming medicine",quantity:0,unit:"bottle",price:180,supplier:"PetMed Supply",batch:"D-2509",expiration:"2026-10-05",minimum:5,location:"Shelf C1"},
    {id:"MED-0005",name:"Skin Relief Spray",type:"Spray",description:"Topical skin care",quantity:12,unit:"bottle",price:250,supplier:"AnimalCare",batch:"S-2603",expiration:"2026-10-15",minimum:3,location:"Shelf C2"}
  );
  data.consultations.push(
    {id:"CON-0001",petId:"PET-0001",ownerId:"OWN-0001",date:"2026-09-20",time:"09:30",veterinarian:"Dr. Santos",weight:28,temperature:"38.5 C",symptoms:"Itching",diagnosis:"Skin allergy",treatment:"Avoid allergen",prescription:"Skin Relief Spray",notes:"Follow up if symptoms continue.",followUp:"2026-10-04",status:"Completed"},
    {id:"CON-0002",petId:"PET-0002",ownerId:"OWN-0001",date:"2026-09-25",time:"10:30",veterinarian:"Dr. Cruz",weight:4.2,temperature:"38.2 C",symptoms:"Routine check",diagnosis:"Healthy",treatment:"Continue routine care",prescription:"Vitamins",notes:"",followUp:"",status:"Completed"},
    {id:"CON-0003",petId:"PET-0005",ownerId:"OWN-0002",date:"2026-09-29",time:"14:00",veterinarian:"Dr. Santos",weight:31,temperature:"39.0 C",symptoms:"Low appetite",diagnosis:"Observation",treatment:"Hydration and rest",prescription:"",notes:"Monitor appetite.",followUp:"2026-10-02",status:"Scheduled"}
  );
  data.appointments.push(
    {id:"APT-0001",petId:"PET-0001",ownerId:"OWN-0001",date:"2026-09-29",time:"14:00",purpose:"Follow-up",serviceId:"SRV-0007",veterinarian:"Dr. Santos",status:"Confirmed",notes:""},
    {id:"APT-0002",petId:"PET-0006",ownerId:"OWN-0003",date:"2026-10-01",time:"10:00",purpose:"Grooming",serviceId:"SRV-0001",veterinarian:"",status:"Scheduled",notes:""},
    {id:"APT-0003",petId:"PET-0002",ownerId:"OWN-0001",date:"2026-10-03",time:"11:30",purpose:"Vaccination",serviceId:"SRV-0006",veterinarian:"Dr. Cruz",status:"Scheduled",notes:""}
  );
  data.serviceRecords.push(
    {id:"SREC-0001",petId:"PET-0001",ownerId:"OWN-0001",serviceId:"SRV-0001",staff:"Ana",date:"2026-09-18",time:"13:00",price:350,discount:0,total:350,status:"Completed",notes:""},
    {id:"SREC-0002",petId:"PET-0002",ownerId:"OWN-0001",serviceId:"SRV-0005",staff:"Ben",date:"2026-09-25",time:"15:00",price:700,discount:50,total:650,status:"Completed",notes:""},
    {id:"SREC-0003",petId:"PET-0006",ownerId:"OWN-0003",serviceId:"SRV-0001",staff:"Ana",date:"2026-09-27",time:"10:00",price:350,discount:0,total:350,status:"Completed",notes:""}
  );
  data.charges.push(
    {id:"CHG-0001",petId:"PET-0001",ownerId:"OWN-0001",date:"2026-09-20",description:"Consultation",category:"Consultation",quantity:1,unitPrice:500,discount:0,total:500,paymentStatus:"Unpaid"},
    {id:"CHG-0002",petId:"PET-0001",ownerId:"OWN-0001",date:"2026-09-18",description:"Basic Grooming",category:"Service",quantity:1,unitPrice:350,discount:0,total:350,paymentStatus:"Unpaid"},
    {id:"CHG-0003",petId:"PET-0002",ownerId:"OWN-0001",date:"2026-09-25",description:"Dental Cleaning",category:"Service",quantity:1,unitPrice:700,discount:50,total:650,paymentStatus:"Unpaid"},
    {id:"CHG-0004",petId:"PET-0005",ownerId:"OWN-0002",date:"2026-09-29",description:"Consultation",category:"Consultation",quantity:1,unitPrice:500,discount:0,total:500,paymentStatus:"Unpaid"}
  );
  data.payments.push(
    {id:"PAY-0001",chargeId:"CHG-0001",petId:"PET-0001",ownerId:"OWN-0001",date:"2026-09-20",amount:500,method:"GCash",reference:"GC-001",notes:"Paid in full"},
    {id:"PAY-0002",chargeId:"CHG-0002",petId:"PET-0001",ownerId:"OWN-0001",date:"2026-09-18",amount:200,method:"Cash",reference:"",notes:"Partial payment"},
    {id:"PAY-0003",chargeId:"CHG-0003",petId:"PET-0002",ownerId:"OWN-0001",date:"2026-09-25",amount:650,method:"Cash",reference:"",notes:"Paid in full"}
  );
  data.charges.forEach(updateChargeStatus);
  addActivity("Demo data loaded");
  saveData();showPage("dashboard");toast("Demo data loaded successfully");
}
function clearDemoData(){
  if(!confirm("Clear all current data and return to an empty system?"))return;
  data={pets:[],owners:[],breeds:[],consultations:[],services:[],serviceRecords:[],medicines:[],appointments:[],charges:[],payments:[],activities:[],settings:{shopName:"PetCare Veterinary & Pet Shop",currency:"₱"}};
  saveData();showPage("dashboard");toast("All data cleared");
}
function clearAllData(){clearDemoData()}

/* INITIALIZATION */
function start(){
  loadData();
  document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  $("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
  setupGlobalSearch();
  setInterval(()=>{if($("clock"))$("clock").textContent=new Date().toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"})},1000);
  showPage("dashboard");
}
start();

/* Simple JSON fallback note:
   data.json contains the same empty structure. If a local server is used,
   it can be fetched and merged into data. The app does not require fetch
   because browsers may block local file requests. */
