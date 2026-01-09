// assets/js/admin/support.js
import { _supabase } from "../supabaseClient.js";

console.log("admin/support.js yüklendi");

const formatRole = (role) => {
  if (role === "student") return "Student";
  if (role === "teacher") return "Teacher";
  if (role === "admin") return "Admin";
  return role || "-";
};

const formatStatusText = (status) => (status === "closed" ? "Closed" : "Open");

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const listEl = document.getElementById("support-threads-list");
  const counterEl = document.getElementById("support-total-count");
  const logoutBtn = document.getElementById("logout-button");
  const adminNameEl = document.getElementById("admin-display-name");

  // Admin adı
  if (currentUser && adminNameEl) {
    adminNameEl.textContent =
      currentUser.full_name || currentUser.email || "Admin";
  }

  // Çıkış
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "index.html";
  });

  const goToThread = (threadId) => {
    window.location.href = `./admin_support_thread.html?id=${encodeURIComponent(
      threadId
    )}`;
  };

  const renderThreads = (threads) => {
    if (!listEl) return;

    if (!threads || threads.length === 0) {
      listEl.innerHTML = `<div style="padding:8px; text-align:center; color:#6b7280;">No support requests yet.</div>`;
      if (counterEl) counterEl.textContent = "0";
      return;
    }

    if (counterEl) counterEl.textContent = String(threads.length);

    listEl.innerHTML = threads
      .map((t) => {
        const pillClass = t.status === "closed" ? "pill closed" : "pill open";
        return `
          <div class="thread-item" data-thread-id="${escapeHtml(t.id)}">
            <div class="thread-top">
              <div class="thread-subject">${escapeHtml(t.subject || "Untitled")}</div>
              <span class="${pillClass}">${formatStatusText(t.status)}</span>
            </div>
            <div class="thread-meta">
              ${formatRole(t.created_by_role)} • ${new Date(t.created_at).toLocaleString("tr-TR")}
            </div>
          </div>
        `;
      })
      .join("");

    // click -> thread
    listEl.querySelectorAll(".thread-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-thread-id");
        if (id) goToThread(id);
      });
    });
  };

  const loadThreads = async () => {
    if (!listEl) return;

    listEl.innerHTML = `<div style="padding:8px; text-align:center; color:#6b7280;">Loading...</div>`;

    const { data, error } = await _supabase
      .from("support_threads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      listEl.innerHTML = `<div style="padding:8px; text-align:center; color:red;">Error: ${escapeHtml(
        error.message || ""
      )}</div>`;
      if (counterEl) counterEl.textContent = "0";
      return;
    }

    renderThreads(data || []);
  };

  loadThreads();
});
