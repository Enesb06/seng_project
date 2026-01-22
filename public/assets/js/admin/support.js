import { _supabase } from "../supabaseClient.js";

const listEl = document.getElementById("support-threads-list");
let allThreads = [];
let currentFilter = 'all';

const renderThreads = (threads) => {
  if (!listEl) return;
  const filtered = threads.filter(t => currentFilter === 'all' || t.created_by_role === currentFilter);
  
  if (filtered.length === 0) {
    listEl.innerHTML = `<p style="text-align:center; padding:15px; opacity:0.5;">No requests found.</p>`;
    return;
  }

  listEl.innerHTML = filtered.map((t) => {
    const isClosed = t.status === "closed";
    const roleIcon = t.created_by_role === "teacher" 
        ? "https://cdn-icons-png.flaticon.com/512/1995/1995539.png" 
        : "https://cdn-icons-png.flaticon.com/512/8289/8289414.png";

    return `
      <div class="thread-card" onclick="window.location.href='admin_support_thread.html?id=${t.id}'">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="role-icon-frame ${t.created_by_role}-bg">
            <img src="${roleIcon}" class="role-img-small">
          </div>
          <div class="thread-info">
            <b>${t.subject || "Untitled"}</b>
            <small>${t.created_by_role.toUpperCase()} • ${new Date(t.created_at).toLocaleDateString('tr-TR')}</small>
          </div>
        </div>
        <span class="status-badge-pill" style="background:${isClosed?'rgba(255,255,255,0.1)':'rgba(109,40,217,0.2)'}; color:${isClosed?'#aaa':'#a78bfa'};">
          ${isClosed ? 'Closed' : 'Open'}
        </span>
      </div>`;
  }).join("");
};

// Filtre Butonları Tıklama
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.role;
        renderThreads(allThreads);
    });
});

const loadThreads = async () => {
  const { data } = await _supabase.from("support_threads").select("*").order("created_at", { ascending: false });
  allThreads = data || [];
  renderThreads(allThreads);
};
document.addEventListener("DOMContentLoaded", loadThreads);