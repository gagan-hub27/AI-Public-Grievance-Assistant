const citizenSidebar=document.querySelector("#citizenSidebar");
const citizenOverlay=document.querySelector("#citizenSidebarOverlay");
const menuToggle=document.querySelector("#citizenMenuToggle");
function closeSidebar(){citizenSidebar?.classList.remove("open");citizenOverlay?.classList.remove("open");menuToggle?.setAttribute("aria-expanded","false");}
function openSidebar(){citizenSidebar?.classList.add("open");citizenOverlay?.classList.add("open");menuToggle?.setAttribute("aria-expanded","true");}
menuToggle?.addEventListener("click",openSidebar);
document.querySelector("#citizenSidebarClose")?.addEventListener("click",closeSidebar);
citizenOverlay?.addEventListener("click",closeSidebar);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSidebar();});
const currentPath=window.location.pathname.replace(/\/$/,"")||"/";
const routeMap={"/":"Home","/submit":"Submit a complaint","/track":"Track a complaint","/activity":"Recent activity","/how-it-works":"How it works","/help":"Help & support"};
document.querySelectorAll(".citizen-side-link").forEach(link=>{
  const href=link.getAttribute("href");
  if(href===currentPath || (currentPath==="/"&&href==="/"))link.classList.add("active");
  else link.classList.remove("active");
  link.addEventListener("click",closeSidebar);
});
