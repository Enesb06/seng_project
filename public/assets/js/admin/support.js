// assets/js/admin/support.js
import { _supabase } from "../supabaseClient.js";

console.log("admin/support.js yüklendi");

const currentUser = JSON.parse(localStorage.getItem("user") || "null");

const listEl          = document.getElementById("support-threads-list");
const counterEl       = document.getElementById("support-total-count");

const messagesBox     = document.getElementById("messages-box");
const titleEl         = document.getElementById("selected-thread-title");
const metaEl          = document.getElementById("selected-thread-meta");
const statusBadge     = document.getElementById("selected-thread-status-badge");

const statusSelect    = document.getElementById("thread-status-select");
const updateStatusBtn = document.getElementById("update-status-btn");

const replyInput      = document.getElementById("admin-reply-input");
const replyBtn        = document.getElementById("send-reply-btn");
const logoutBtn       = document.getElementById("logout-button");

// Admin adı
const adminNameEl = document.getElementById("admin-display-name");
if (currentUser && adminNameEl) {
  adminNameEl.textContent = currentUser.full_name || currentUser.email || "Admin";
}

// Çıkış
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    // admin_support.html pages kökteyse:
    window.location.href = "index.html";
  });
}

let selectedThreadId = null;
let selectedThreadData = null;
let threadsCache = [];

const formatRole = (role) => {
  if (role === "student") return "Öğrenci";
  if (role === "teacher") return "Öğretmen";
  if (role === "admin")   return "Admin";
  return role || "-";
};

const formatStatusText = (status) => (status === "closed" ? "Kapalı" : "Açık");

const updateStatusBadgeView = (status) => {
  if (!statusBadge) return;
  statusBadge.style.display = "inline-block";
  statusBadge.textContent = formatStatusText(status);

  if (status === "closed") {
    statusBadge.style.background = "#fee2e2";
    statusBadge.style.color = "#b91c1c";
  } else {
    statusBadge.style.background = "#dcfce7";
    statusBadge.style.color = "#166534";
  }
};

// ---------------- MESAJLARI YÜKLE ----------------
const loadMessages = async (threadId) => {
  if (!threadId || !messagesBox) return;

  messagesBox.innerHTML = "<p style='color:#6b7280;'>Mesajlar yükleniyor...</p>";

  const { data, error } = await _supabase
    .from("support_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    messagesBox.innerHTML =
      "<p style='color:red;'>Mesajlar yüklenirken hata: " + (error.message || "") + "</p>";
    return;
  }

  if (!data || data.length === 0) {
    messagesBox.innerHTML = "<p style='color:#6b7280;'>Bu talep için hiç mesaj yok.</p>";
    return;
  }

  messagesBox.innerHTML = data.map((msg) => `
    <div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;
                background:${msg.sender_role === "admin" ? "#eff6ff" : "#f9fafb"};
                border:1px solid #e5e7eb;">
      <div style="font-size:0.8rem;color:#6b7280;margin-bottom:2px;">
        <strong>${formatRole(msg.sender_role)}</strong>
        • ${new Date(msg.created_at).toLocaleString("tr-TR")}
      </div>
      <div style="font-size:0.9rem;white-space:pre-wrap;">${escapeHtml(msg.message)}</div>
    </div>
  `).join("");

  messagesBox.scrollTop = messagesBox.scrollHeight;
};

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------------- THREAD SEÇ ----------------
const selectThread = (thread) => {
  selectedThreadId = thread.id;          // ✅ UUID string (Number yapma yok)
  selectedThreadData = thread;

  // Kart highlight
  Array.from(listEl.querySelectorAll(".thread-item")).forEach((el) => {
    el.classList.remove("active");
  });
  const activeEl = listEl.querySelector(`[data-thread-id="${thread.id}"]`);
  if (activeEl) activeEl.classList.add("active");

  if (titleEl) titleEl.textContent = thread.subject || "Başlıksız talep";
  if (metaEl) {
    metaEl.textContent =
      `${formatRole(thread.created_by_role || "-")} • ` +
      new Date(thread.created_at).toLocaleString("tr-TR");
  }

  if (statusSelect) statusSelect.value = thread.status || "open";
  updateStatusBadgeView(thread.status);

  loadMessages(thread.id);

  // Kapalıysa input disable (opsiyonel ama iyi)
  const isClosed = thread.status === "closed";
  if (replyInput) replyInput.disabled = isClosed;
  if (replyBtn) replyBtn.disabled = isClosed;
  if (isClosed && replyInput) replyInput.placeholder = "Talep kapalı. Mesaj gönderemezsiniz.";
  if (!isClosed && replyInput) replyInput.placeholder = "Bu talebe cevap yazın...";
};

// ---------------- THREAD LİSTESİNİ YÜKLE ----------------
const renderThreads = (threads) => {
  if (!listEl) return;

  if (!threads || threads.length === 0) {
    listEl.innerHTML = `<div style="padding:8px; text-align:center; color:#6b7280;">Henüz hiç destek talebi yok.</div>`;
    if (counterEl) counterEl.textContent = "0";
    return;
  }

  if (counterEl) counterEl.textContent = String(threads.length);

  listEl.innerHTML = threads.map((t) => {
    const pillClass = t.status === "closed" ? "pill closed" : "pill open";
    return `
      <div class="thread-item" data-thread-id="${t.id}">
        <div class="thread-top">
          <div class="thread-subject">${escapeHtml(t.subject || "Başlıksız")}</div>
          <span class="${pillClass}">${formatStatusText(t.status)}</span>
        </div>
        <div class="thread-meta">
          ${formatRole(t.created_by_role)} • ${new Date(t.created_at).toLocaleString("tr-TR")}
        </div>
      </div>
    `;
  }).join("");

  Array.from(listEl.querySelectorAll(".thread-item")).forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-thread-id"); // ✅ string
      const thread = threadsCache.find((x) => String(x.id) === String(id));
      if (thread) selectThread(thread);
    });
  });

  // ilkini otomatik seç
  selectThread(threads[0]);
};

const loadThreads = async () => {
  if (!listEl) return;

  listEl.innerHTML = `<div style="padding:8px; text-align:center; color:#6b7280;">Yükleniyor...</div>`;

  const { data, error } = await _supabase
    .from("support_threads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    listEl.innerHTML = `<div style="padding:8px; text-align:center; color:red;">Hata: ${error.message || ""}</div>`;
    if (counterEl) counterEl.textContent = "0";
    return;
  }

  threadsCache = data || [];
  renderThreads(threadsCache);
};

// ---------------- DURUM GÜNCELLE ----------------
if (updateStatusBtn) {
  updateStatusBtn.addEventListener("click", async () => {
    if (!selectedThreadId) {
      alert("Önce bir destek talebi seçin.");
      return;
    }
    const newStatus = statusSelect?.value || "open";

    const { error } = await _supabase
      .from("support_threads")
      .update({ status: newStatus })
      .eq("id", selectedThreadId);

    if (error) {
      alert("Durum güncellenirken hata: " + (error.message || ""));
      return;
    }

    // cache güncelle
    threadsCache = threadsCache.map(t => t.id === selectedThreadId ? { ...t, status: newStatus } : t);

    updateStatusBadgeView(newStatus);
    // seçili thread datasını da güncelle
    if (selectedThreadData) selectedThreadData.status = newStatus;

    // input enable/disable
    const isClosed = newStatus === "closed";
    if (replyInput) replyInput.disabled = isClosed;
    if (replyBtn) replyBtn.disabled = isClosed;

    // listeyi yeniden çiz
    renderThreads(threadsCache);

    // tekrar seçiliyi seç (renderThreads ilkini seçer, biz seçiliyi tekrar açalım)
    const again = threadsCache.find(x => x.id === selectedThreadId);
    if (again) selectThread(again);
  });
}

// ---------------- ADMIN CEVAP GÖNDER ----------------
if (replyBtn) {
  replyBtn.addEventListener("click", async () => {
    if (!selectedThreadId) {
      alert("Önce bir destek talebi seçin.");
      return;
    }
    const msg = (replyInput?.value || "").trim();
    if (!msg) {
      alert("Boş mesaj gönderemezsiniz.");
      return;
    }
    const adminUser = JSON.parse(localStorage.getItem("user") || "null");
    if (!adminUser) {
      alert("Oturum bulunamadı.");
      return;
    }

    const { error } = await _supabase
      .from("support_messages")
      .insert({
        thread_id: selectedThreadId,
        sender_user_id: adminUser.id,
        sender_role: "admin",
        message: msg
      });

    if (error) {
      alert("Mesaj gönderilirken hata: " + (error.message || ""));
      return;
    }

    replyInput.value = "";
    loadMessages(selectedThreadId);
  });
}

// ---------------- BAŞLAT ----------------
document.addEventListener("DOMContentLoaded", () => {
  loadThreads();
});
