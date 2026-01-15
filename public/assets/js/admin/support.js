import { _supabase } from "../supabaseClient.js";

const listEl = document.getElementById("support-threads-list");
const counterEl = document.getElementById("support-total-count");

const formatRole = (role) => {
  if (role === "student") return "Student";
  if (role === "teacher") return "Teacher";
  return role;
};

const renderThreads = (threads) => {
  if (!listEl) return;

  if (!threads || threads.length === 0) {
    listEl.innerHTML = `<div class="card" style="text-align:center; padding:40px; color:var(--muted);">No support requests found.</div>`;
    counterEl.textContent = "0";
    return;
  }

  counterEl.textContent = threads.length;

  listEl.innerHTML = threads.map((t) => {
    const isClosed = t.status === "closed";
    const roleClass = t.created_by_role === "teacher" ? "teacher" : "student";
    const roleIcon = t.created_by_role === "teacher" ? "👨‍🏫" : "🎓";
    
    return `
      <div class="thread-card" onclick="window.location.href='admin_support_thread.html?id=${t.id}'">
        <div class="thread-info">
          <div class="role-icon ${roleClass}">${roleIcon}</div>
          <div>
            <div class="subject-text">${t.subject || "Untitled Request"}</div>
            <div class="meta-text">
              ${formatRole(t.created_by_role)} • ${new Date(t.created_at).toLocaleString("tr-TR")}
            </div>
          </div>
        </div>
        <div>
          <span class="status-badge-pill ${isClosed ? 'closed' : 'open'}">
            ${isClosed ? 'Closed' : 'Open'}
          </span>
        </div>
      </div>
    `;
  }).join("");
};

const loadThreads = async () => {
  const { data, error } = await _supabase
    .from("support_threads")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error) renderThreads(data);
};

document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('admin-display-name').textContent = user.full_name;
    loadThreads();
});

document.getElementById('logout-button').onclick = () => {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};