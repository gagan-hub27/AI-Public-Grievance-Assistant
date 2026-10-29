// Shared homepage-only enhancements. Citizen forms and tracking live on their own pages.
(async function loadHomepageStats(){
  const total = document.querySelector("#statTotal");
  const resolved = document.querySelector("#statResolved");
  const active = document.querySelector("#statActive");
  if (!total || !resolved || !active) return;
  try {
    const response = await fetch("/api/stats");
    if (!response.ok) throw new Error("Stats unavailable");
    const stats = await response.json();
    total.textContent = Number(stats.total || 0).toLocaleString("en-IN");
    resolved.textContent = Number(stats.resolved || 0).toLocaleString("en-IN");
    active.textContent = Number((stats.underReview || 0) + (stats.inProgress || 0)).toLocaleString("en-IN");
  } catch {
    total.textContent = resolved.textContent = active.textContent = "—";
  }
})();
