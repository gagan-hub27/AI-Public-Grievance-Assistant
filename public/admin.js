const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const departments = [
  {category:"Roads & Transport",name:"Public Works Department",icon:"⌁",desc:"Road damage, potholes, broken pavements, traffic infrastructure and local transport concerns."},
  {category:"Water Supply",name:"Water & Sewerage Department",icon:"≈",desc:"Water interruptions, leaking supply lines, drainage and sewerage service issues."},
  {category:"Electricity",name:"Electricity Services",icon:"ϟ",desc:"Street-light failures, power supply complaints and electricity-related civic concerns."},
  {category:"Sanitation",name:"Sanitation & Waste Management",icon:"♧",desc:"Waste collection, overflowing bins, cleanliness and sanitation-related reports."},
  {category:"Public Safety",name:"Public Safety Department",icon:"◇",desc:"Public-space hazards and non-emergency community safety concerns."},
  {category:"Parks & Public Spaces",name:"Parks & Public Spaces",icon:"❋",desc:"Park maintenance, damaged public furniture, playgrounds and shared public spaces."},
  {category:"Other",name:"Public Grievance Cell",icon:"◎",desc:"Concerns that do not fit the available categories and need initial review."}
];
const statusClasses = {"Submitted":"status-submitted","Under Review":"status-review","In Progress":"status-progress","Resolved":"status-resolved","Closed":"status-closed"};
let adminKey = "";
let complaints = [];
let toastTimer;

function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function date(value){if(!value)return "—";return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value));}
function pill(status){return `<span class="status ${statusClasses[status]||"status-submitted"}">${esc(status)}</span>`;}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3000);}
async function api(url,options={}){const response=await fetch(url,{...options,headers:{"Content-Type":"application/json","x-admin-key":adminKey,...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||"Request failed.");return data;}

function switchPage(page){
  $$(".page-view").forEach(el=>el.classList.toggle("active",el.id===`page-${page}`));
  $$(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.page===page));
  const labels={dashboard:"Dashboard",complaints:"Complaint register",departments:"Departments",reports:"Reports & insights"};
  $("#breadcrumbCurrent").textContent=labels[page]||"Dashboard";
  $("#sidebar").classList.remove("open");
  if(page==="complaints") renderComplaints();
  if(page==="departments") renderDepartments();
  if(page==="reports") renderReports();
}
$$(".nav-item").forEach(btn=>btn.addEventListener("click",()=>switchPage(btn.dataset.page)));
$$("[data-goto]").forEach(btn=>btn.addEventListener("click",()=>switchPage(btn.dataset.goto)));
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#logoutButton").addEventListener("click",()=>{adminKey="";$("#connectionLabel").textContent="Not connected";$("#keyModal").classList.add("show");$("#adminKeyInput").value="";$("#keyError").textContent="";});

$("#keyForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const input=$("#adminKeyInput").value.trim();
  $("#keyError").textContent="";
  try{
    const response=await fetch("/api/admin/complaints",{headers:{"x-admin-key":input}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||"Could not connect.");
    adminKey=input;complaints=data.complaints||[];
    $("#keyModal").classList.remove("show");
    $("#connectionLabel").textContent="Connected to database";
    renderAll();toast("Admin workspace connected.");
  }catch(error){$("#keyError").textContent=error.message;}
});

async function loadComplaints(showToast=false){
  if(!adminKey){$("#keyModal").classList.add("show");return;}
  try{
    const params=new URLSearchParams();
    if($("#filterStatus").value)params.set("status",$("#filterStatus").value);
    if($("#filterCategory").value)params.set("category",$("#filterCategory").value);
    if($("#searchComplaints").value.trim())params.set("q",$("#searchComplaints").value.trim());
    const data=await api(`/api/admin/complaints?${params.toString()}`);
    complaints=data.complaints||[];
    renderAll();
    if(showToast)toast("Complaint list refreshed.");
  }catch(error){
    if(error.message.toLowerCase().includes("admin key")){$("#keyModal").classList.add("show");$("#connectionLabel").textContent="Connection expired";}
    else toast(error.message);
  }
}
function renderAll(){renderDashboard();renderComplaints();renderReports();$("#sideComplaintCount").textContent=complaints.length;}
function renderDashboard(){
  const total=complaints.length;
  const review=complaints.filter(c=>["Submitted","Under Review"].includes(c.status)).length;
  const progress=complaints.filter(c=>c.status==="In Progress").length;
  const resolved=complaints.filter(c=>["Resolved","Closed"].includes(c.status)).length;
  $("#metricTotal").textContent=total.toLocaleString("en-IN");
  $("#metricReview").textContent=review.toLocaleString("en-IN");
  $("#metricProgress").textContent=progress.toLocaleString("en-IN");
  $("#metricResolved").textContent=resolved.toLocaleString("en-IN");
  const latest=[...complaints].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6);
  $("#dashboardRows").innerHTML=latest.length?latest.map(c=>`<tr><td>${esc(c.reference)}</td><td><strong>${esc(c.category)}</strong><br><span style="color:#9aa59b;font-size:9px">${esc(c.area)}</span></td><td>${pill(c.status)}</td><td>${date(c.createdAt)}</td></tr>`).join(""):`<tr><td colspan="4" class="empty">No complaints in the database yet.</td></tr>`;
  const states=[["Submitted",complaints.filter(c=>c.status==="Submitted").length,""],["Under Review",complaints.filter(c=>c.status==="Under Review").length,"review"],["In Progress",progress,"progress"],["Resolved",complaints.filter(c=>c.status==="Resolved").length,"resolved"],["Closed",complaints.filter(c=>c.status==="Closed").length,"closed"]];
  $("#statusDistribution").innerHTML=states.map(([label,count,kind])=>`<div class="distribution-row"><div class="distribution-label"><span>${label}</span><strong>${count}</strong></div><div class="bar-track"><div class="bar-fill ${kind}" style="width:${total?Math.max(2,count/total*100):0}%"></div></div></div>`).join("");
}
function filteredLocally(){
  const q=$("#searchComplaints").value.trim().toLowerCase();
  const status=$("#filterStatus").value,category=$("#filterCategory").value;
  return complaints.filter(c=>(!status||c.status===status)&&(!category||c.category===category)&&(!q||[c.reference,c.name,c.email,c.area,c.category].some(v=>String(v||"").toLowerCase().includes(q))));
}
function renderComplaints(){
  if(!$("#complaintRows"))return;
  const rows=filteredLocally();
  $("#complaintCountLabel").textContent=`Showing ${rows.length} complaint${rows.length===1?"":"s"} in the current list.`;
  $("#complaintRows").innerHTML=rows.length?rows.map(c=>`<tr>
    <td>${esc(c.reference)}<span class="citizen-email">${esc(c.name)} · ${esc(c.email)}</span></td>
    <td>${esc(c.category)}<span class="citizen-email">${esc(c.department)}</span></td>
    <td>${esc(c.area)}</td><td><span class="priority ${c.priority==="High"?"high":"normal"}">${c.priority==="High"?"● High":"Normal"}</span></td>
    <td>${pill(c.status)}</td><td>${date(c.createdAt)}</td><td><button class="small-action" data-update="${esc(c.reference)}">Update</button></td>
  </tr>`).join(""):`<tr><td colspan="7" class="empty">No matching complaints. Try changing your filters.</td></tr>`;
  $$("[data-update]").forEach(btn=>btn.addEventListener("click",()=>openUpdate(btn.dataset.update)));
}
function renderDepartments(){
  $("#departmentGrid").innerHTML=departments.map(d=>`<article class="department-card"><div class="department-symbol">${d.icon}</div><div><h3>${esc(d.name)}</h3><p>${esc(d.desc)}</p><span class="category-tag">${esc(d.category)}</span></div></article>`).join("");
}
function renderReports(){
  const total=complaints.length;
  const resolved=complaints.filter(c=>["Resolved","Closed"].includes(c.status)).length;
  const high=complaints.filter(c=>c.priority==="High").length;
  const rate=total?Math.round(resolved/total*100):0;
  $("#reportSummary").innerHTML=`<article class="report-tile"><span>Total registered</span><strong>${total}</strong></article><article class="report-tile"><span>High-priority reports</span><strong>${high}</strong></article><article class="report-tile"><span>Resolved / closed share</span><strong>${rate}%</strong></article>`;
  const counts=departments.map(d=>({category:d.category,count:complaints.filter(c=>c.category===d.category).length})).sort((a,b)=>b.count-a.count);
  const max=Math.max(1,...counts.map(c=>c.count));
  $("#categoryBars").innerHTML=counts.map(c=>`<div class="category-row"><span>${esc(c.category)}</span><div class="bar-track"><div class="bar-fill" style="width:${c.count/max*100}%"></div></div><strong>${c.count}</strong></div>`).join("");
}
function openUpdate(reference){
  const item=complaints.find(c=>c.reference===reference);if(!item)return;
  $("#updateRef").value=reference;$("#updateTitle").textContent="Update complaint";$("#updateReference").textContent=`${reference} · ${item.category} · ${item.area}`;
  $("#newStatus").value=item.status;$("#updateNote").value="";$("#updateError").textContent="";$("#updateModal").classList.add("show");
}
$("#closeUpdate").addEventListener("click",()=>$("#updateModal").classList.remove("show"));
$("#updateModal").addEventListener("click",e=>{if(e.target.id==="updateModal")$("#updateModal").classList.remove("show");});
$("#updateForm").addEventListener("submit",async e=>{
  e.preventDefault();$("#updateError").textContent="";
  try{
    await api(`/api/admin/complaints/${encodeURIComponent($("#updateRef").value)}`,{method:"PATCH",body:JSON.stringify({status:$("#newStatus").value,note:$("#updateNote").value.trim()})});
    $("#updateModal").classList.remove("show");await loadComplaints();toast("Complaint status and timeline updated.");
  }catch(error){$("#updateError").textContent=error.message;}
});
$("#refreshDashboard").addEventListener("click",()=>loadComplaints(true));
$("#reloadComplaints").addEventListener("click",()=>loadComplaints(true));
["filterStatus","filterCategory"].forEach(id=>$("#"+id).addEventListener("change",()=>loadComplaints()));
let searchDelay;
$("#searchComplaints").addEventListener("input",()=>{clearTimeout(searchDelay);searchDelay=setTimeout(()=>loadComplaints(),250);});
$("#exportCsv").addEventListener("click",()=>{
  const rows=filteredLocally();
  const columns=["reference","name","email","phone","category","department","area","address","description","priority","status","createdAt"];
  const quote=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const csv=[columns.join(","),...rows.map(row=>columns.map(key=>quote(row[key])).join(","))].join("\r\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="jansuno-complaints.csv";a.click();URL.revokeObjectURL(url);
});
renderDepartments();
$("#keyModal").classList.add("show");
