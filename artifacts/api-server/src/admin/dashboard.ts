export const adminDashboardHtml = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Country Pulse  Admin</title>
<style>
:root{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#172521;background:#f3f6f3;font-synthesis:none}
*{box-sizing:border-box}
body{margin:0}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
.top{background:#123f3b;color:white;padding:18px 28px;display:flex;justify-content:space-between;align-items:center}
.brand{font-weight:800;font-size:19px;letter-spacing:-.04em}
.brand small{display:block;font-size:10px;letter-spacing:.15em;font-weight:600;opacity:.75;margin-top:3px}
main{max-width:1180px;margin:auto;padding:32px 22px}
h1{font-size:30px;letter-spacing:-.05em;margin:4px 0}
.muted{color:#64736d}
.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:#64736d}
.heading{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:24px}
.panel,.stat,.report{background:white;border:1px solid #e0e8e3;border-radius:14px}
.panel{padding:24px;max-width:430px;margin:65px auto}
.panel h2{margin:5px 0 8px}
.field{width:100%;padding:11px 12px;border:1px solid #d5e0d9;border-radius:9px;background:white;color:#172521;min-height:43px}
label{display:block;font-size:12px;font-weight:700;margin:15px 0 6px}
.btn{border:1px solid #d5e0d9;border-radius:9px;background:white;color:#172521;padding:10px 14px;font-weight:700}
.btn.primary{background:#123f3b;border-color:#123f3b;color:white}
.btn.good{color:#17633f;border-color:#9acbb2}
.btn.bad{color:#983737;border-color:#e2aaaa}
.btn:disabled{opacity:.5;cursor:not-allowed}
.login-actions{margin-top:18px}
.login-actions button{width:100%}
.error{color:#a52e2e;font-size:13px;margin-top:12px;min-height:18px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px}
.stat{padding:17px}
.stat span{font-size:12px;color:#64736d}
.stat strong{display:block;font-size:28px;margin-top:6px;letter-spacing:-.04em}
.toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:20px 0 14px}
.toolbar .search{flex:1;min-width:190px}
.tabs{display:flex;gap:7px;flex-wrap:wrap}
.tabs button.active{background:#dcebe5;color:#173c36;border-color:#c7ddd2}
.reports{display:grid;gap:12px}
.report{padding:18px;display:flex;justify-content:space-between;gap:16px}
.report h3{font-size:17px;margin:10px 0 7px}
.meta{display:flex;gap:8px;flex-wrap:wrap;font-size:12px;color:#64736d}
.body{font-size:14px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}
.status{font-size:10px;font-weight:800;text-transform:uppercase;padding:5px 8px;border-radius:6px}
.pending{background:#f7edd9;color:#855b17}
.approved{background:#dcefe4;color:#17633f}
.rejected{background:#f5e1e1;color:#983737}
.actions{display:flex;gap:7px;align-items:start;flex-wrap:wrap}
.empty{padding:40px;text-align:center;background:white;border:1px dashed #d5e0d9;border-radius:12px;color:#64736d}
.notice{font-size:12px;color:#64736d;margin-top:20px;line-height:1.5}
.hidden{display:none!important}
.modal{position:fixed;inset:0;background:#07141099;display:none;place-items:center;padding:16px;z-index:5}
.modal.open{display:grid}
.dialog{background:white;border-radius:16px;padding:22px;width:min(650px,100%);max-height:90vh;overflow:auto}
.dialog h2{font-size:21px;letter-spacing:-.03em}
.dialog textarea{min-height:90px;resize:vertical}
.dialog-actions{display:flex;justify-content:end;gap:8px;flex-wrap:wrap;margin-top:18px}
#app{display:none}
@media(max-width:650px){.top{padding:15px 18px}main{padding:24px 14px}.heading{align-items:start;flex-direction:column}.stats{gap:7px}.stat{padding:12px}.stat strong{font-size:23px}.report{display:block}.actions{margin-top:14px}.panel{margin:35px auto;padding:19px}}
</style>
</head>
<body>
<header class="top">
  <div class="brand">Country Pulse<small>PRIVATE ADMIN CONSOLE</small></div>
  <div id="topAction"></div>
</header>

<section id="loginView" class="panel">
  <div class="eyebrow">Administrator access</div>
  <h2>Sign in</h2>
  <p class="muted">Enter your dashboard password to manage community reports.</p>
  <form id="loginForm">
    <label for="password">Dashboard password</label>
    <input class="field" id="password" type="password" autocomplete="current-password" required>
    <div class="login-actions"><button class="btn primary" id="loginButton" type="submit">Sign in</button></div>
    <div class="error" id="loginError" role="alert"></div>
  </form>
</section>

<div id="app">
<main>
  <div class="heading">
    <div><div class="eyebrow">Community newsroom / moderation</div><h1>Community reports</h1><p class="muted">Review submissions before they appear in Country Pulse.</p></div>
    <button class="btn" id="logoutButton">Sign out</button>
  </div>
  <section class="stats">
    <div class="stat"><span>Pending in current results</span><strong id="pendingCount"></strong></div>
    <div class="stat"><span>Approved in current results</span><strong id="approvedCount"></strong></div>
    <div class="stat"><span>Rejected in current results</span><strong id="rejectedCount"></strong></div>
  </section>
  <div class="tabs" id="tabs">
    <button class="btn active" data-status="pending">Pending</button>
    <button class="btn" data-status="approved">Approved</button>
    <button class="btn" data-status="rejected">Rejected</button>
    <button class="btn" data-status="all">All reports</button>
  </div>
  <div class="toolbar">
    <input class="field search" id="search" type="search" placeholder="Search headline, country or author">
    <input class="field" id="countryCode" maxlength="2" placeholder="Country code" aria-label="Country code">
    <button class="btn" id="refreshButton">Refresh</button>
  </div>
  <div id="message" class="muted" role="status" aria-live="polite"></div>
  <div class="reports" id="reports"></div>
  <p class="notice">Private administrator dashboard. Your password and session signing secret remain on the server. Report results are limited to the latest 200 matching records.</p>
</main>
</div>

<div class="modal" id="modal">
  <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="detailTitle">
    <div class="eyebrow" id="detailStatus"></div>
    <h2 id="detailTitle"></h2>
    <p class="muted" id="detailMeta"></p>
    <div class="body" id="detailBody"></div>
    <div id="existingNote" class="notice"></div>
    <label for="reviewerNote">Reviewer note (optional)</label>
    <textarea class="field" id="reviewerNote" maxlength="2000" placeholder="Add a moderation note"></textarea>
    <div class="dialog-actions">
      <button class="btn" id="closeModal">Close</button>
      <button class="btn bad" id="rejectButton">Reject</button>
      <button class="btn primary" id="approveButton">Approve</button>
    </div>
    <div class="error" id="actionError" role="alert"></div>
  </section>
</div>

<script>
(function(){
"use strict";
var statusFilter="pending";
var currentReports=[];
var selectedReport=null;
var busy=false;

function el(id){return document.getElementById(id)}
function escapeHtml(value){
 return String(value==null?"":value).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
 });
}
function setMessage(message){el("message").textContent=message||""}
async function api(path,options){
 options=options||{};
 var response=await fetch(path,{
  method:options.method||"GET",
  credentials:"same-origin",
  headers:options.body?{"Content-Type":"application/json"}:{},
  body:options.body?JSON.stringify(options.body):undefined
 });
 var data;
 try{data=await response.json()}catch(e){data={}}
 if(!response.ok){
  if(response.status===401){showLogin("Your session has expired. Please sign in again.");}
  throw new Error(data.error||("Request failed ("+response.status+")"));
 }
 return data;
}
function showLogin(message){
 el("app").style.display="none";
 el("loginView").style.display="block";
 el("topAction").textContent="Sign in required";
 el("loginError").textContent=message||"";
 el("password").value="";
}
function showApp(){
 el("loginView").style.display="none";
 el("app").style.display="block";
 el("topAction").textContent="Authenticated session";
}
async function checkSession(){
 try{await api("/api/admin/session");showApp();await loadReports();}
 catch(e){showLogin("");}
}
async function login(event){
 event.preventDefault();
 if(busy)return;
 busy=true;
 el("loginButton").disabled=true;
 el("loginError").textContent="";
 try{
  await api("/api/admin/login",{method:"POST",body:{password:el("password").value}});
  showApp();
  await loadReports();
 }catch(e){el("loginError").textContent=e.message;}
 finally{busy=false;el("loginButton").disabled=false;}
}
async function logout(){
 try{
  await api("/api/admin/logout",{method:"POST"});
  showLogin("You have signed out.");
 }catch(e){
  setMessage("Sign out failed: "+e.message);
 }
}
function updateCounts(){
 ["pending","approved","rejected"].forEach(function(status){
  el(status+"Count").textContent=currentReports.filter(function(r){return r.status===status}).length;
 });
}
function dateText(value){
 if(!value)return "";
 var date=new Date(value);
 return isNaN(date.getTime())?String(value):date.toLocaleString();
}
function renderReports(){
 updateCounts();
 var query=el("search").value.trim().toLowerCase();
 var list=currentReports.filter(function(r){
  var text=[r.headline,r.countryName,r.countryCode,r.authorName,r.body].join(" ").toLowerCase();
  return !query||text.indexOf(query)!==-1;
 });
 if(!list.length){
  el("reports").innerHTML='<div class="empty">No reports found for these filters.</div>';
  return;
 }
 el("reports").innerHTML=list.map(function(r){
  var id=escapeHtml(r.id);
  var status=escapeHtml(r.status);
  var actions=r.status==="pending"
   ?'<button class="btn good" data-action="approved" data-id="'+id+'">Approve</button><button class="btn bad" data-action="rejected" data-id="'+id+'">Reject</button>'
   :'';
  return '<article class="report"><div><div class="meta"><span class="status '+status+'">'+status+'</span><span>'+escapeHtml(r.countryName)+' ('+escapeHtml(r.countryCode)+')</span><span>'+escapeHtml(r.authorName||"Anonymous")+'</span><span>'+escapeHtml(dateText(r.createdAt))+'</span></div><h3>'+escapeHtml(r.headline)+'</h3><div class="body">'+escapeHtml((r.body||"").length>260?r.body.slice(0,260)+"":r.body)+'</div><button class="btn" style="margin-top:12px" data-view="'+id+'">View details</button></div><div class="actions">'+actions+'</div></article>';
 }).join("");
}
async function loadReports(){
 setMessage("Loading reports");
 el("reports").innerHTML="";
 var params=new URLSearchParams();
 params.set("status",statusFilter);
 if(el("countryCode").value.trim())params.set("countryCode",el("countryCode").value.trim().toUpperCase());
 if(el("search").value.trim())params.set("search",el("search").value.trim());
 try{
  var data=await api("/api/admin/reports?"+params.toString());
  if(!Array.isArray(data))throw new Error("Unexpected report response.");
  currentReports=data;
  renderReports();
  setMessage(data.length===200?"Showing up to 200 matching reports.":"Loaded "+data.length+" report(s).");
 }catch(e){setMessage(e.message);el("reports").innerHTML='<div class="empty">Could not load reports.</div>';}
}
function openDetails(id){
 selectedReport=currentReports.find(function(r){return String(r.id)===String(id)});
 if(!selectedReport)return;
 el("detailStatus").textContent=(selectedReport.status||"").toUpperCase()+" REPORT";
 el("detailTitle").textContent=selectedReport.headline||"Untitled report";
 el("detailMeta").textContent=(selectedReport.countryName||"")+
  " ("+(selectedReport.countryCode||"")+")  "+
  (selectedReport.authorName||"Anonymous")+"  "+dateText(selectedReport.createdAt);
 el("detailBody").textContent=selectedReport.body||"";
 el("existingNote").textContent=selectedReport.reviewerNote?"Previous reviewer note: "+selectedReport.reviewerNote:"";
 el("reviewerNote").value=selectedReport.reviewerNote||"";
 el("actionError").textContent="";
 var pending=selectedReport.status==="pending";
 el("approveButton").classList.toggle("hidden",!pending);
 el("rejectButton").classList.toggle("hidden",!pending);
 el("modal").classList.add("open");
}
async function moderate(status){
 if(!selectedReport||busy)return;
 busy=true;
 el("approveButton").disabled=true;
 el("rejectButton").disabled=true;
 el("actionError").textContent="";
 try{
  await api("/api/admin/reports/"+encodeURIComponent(selectedReport.id),{
   method:"PATCH",
   body:{status:status,reviewerNote:el("reviewerNote").value}
  });
  el("modal").classList.remove("open");
  selectedReport=null;
  await loadReports();
 }catch(e){el("actionError").textContent=e.message;}
 finally{
  busy=false;
  el("approveButton").disabled=false;
  el("rejectButton").disabled=false;
 }
}
el("loginForm").addEventListener("submit",login);
el("logoutButton").addEventListener("click",logout);
el("refreshButton").addEventListener("click",loadReports);
el("search").addEventListener("keydown",function(e){if(e.key==="Enter")loadReports();});
el("countryCode").addEventListener("keydown",function(e){if(e.key==="Enter")loadReports();});
el("tabs").addEventListener("click",function(e){
 var button=e.target.closest("[data-status]");
 if(!button)return;
 statusFilter=button.getAttribute("data-status");
 el("tabs").querySelectorAll("button").forEach(function(b){b.classList.toggle("active",b===button);});
 loadReports();
});
el("reports").addEventListener("click",function(e){
 var view=e.target.closest("[data-view]");
 var action=e.target.closest("[data-action]");
 if(view)openDetails(view.getAttribute("data-view"));
 if(action){
  openDetails(action.getAttribute("data-id"));
  if(selectedReport)moderate(action.getAttribute("data-action"));
 }
});
el("closeModal").addEventListener("click",function(){el("modal").classList.remove("open");});
el("approveButton").addEventListener("click",function(){moderate("approved");});
el("rejectButton").addEventListener("click",function(){moderate("rejected");});
el("modal").addEventListener("click",function(e){if(e.target===el("modal"))el("modal").classList.remove("open");});
checkSession();
})();
</script>
</body>
</html>`;
